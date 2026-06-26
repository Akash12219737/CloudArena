"""
WebSocket endpoint that bridges the browser terminal (xterm.js) to a
Kubernetes pod exec stream (or a local mock shell when K8s is unavailable).

Protocol (binary frames):
  Browser → Backend:
    b'0' + data   → stdin
    b'1' + JSON   → resize  {"cols": N, "rows": N}

  Backend → Browser:
    raw bytes      → stdout/stderr
"""
import asyncio
import json
import logging
import os
import pty
import select
import struct
import fcntl
import termios
from fastapi import APIRouter, WebSocket, Query

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.db.models import LabStatus
from app.repositories.lab_repository import LabRepository
from app.repositories.user_repository import UserRepository
from app.kubernetes.k8s_client import k8s_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/labs", tags=["Terminal"])


@router.websocket("/{lab_id}/terminal")
async def lab_terminal(
    websocket: WebSocket,
    lab_id: int,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket terminal for a running lab.
    Connect via: ws://host/api/v1/labs/{lab_id}/terminal?token=<jwt>
    """
    await websocket.accept()

    # ── Authenticate ───────────────────────────────────────────────────────────
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.send_text("❌ Authentication failed. Please log in again.")
        await websocket.close(code=4001)
        return

    user_id = int(payload["sub"])

    async with AsyncSessionLocal() as db:
        user_repo = UserRepository(db)
        lab_repo = LabRepository(db)

        user = await user_repo.get_by_id(user_id)
        if not user:
            await websocket.send_text("❌ User not found.")
            await websocket.close(code=4001)
            return

        lab = await lab_repo.get_by_id(lab_id)
        if not lab:
            await websocket.send_text(f"❌ Lab #{lab_id} not found.")
            await websocket.close(code=4004)
            return

        if lab.user_id != user_id:
            from app.db.models import UserRole
            if user.role != UserRole.ADMIN:
                await websocket.send_text("❌ Access denied.")
                await websocket.close(code=4003)
                return

        if lab.status != LabStatus.RUNNING:
            await websocket.send_text(f"❌ Lab is not running (status: {lab.status.value}).")
            await websocket.close(code=4000)
            return

        # ── Route to real K8s exec or mock shell ───────────────────────────────
        if k8s_client.connected:
            await _handle_k8s_terminal(websocket, lab)
        else:
            await _handle_mock_terminal(websocket, lab)


async def _handle_k8s_terminal(websocket: WebSocket, lab) -> None:
    """Bridge WebSocket ↔ Kubernetes exec stream."""
    label_selector = f"lab-id={lab.id}"
    pod_name = k8s_client.get_pod_name(lab.namespace_name, label_selector)

    if not pod_name:
        await websocket.send_text(
            "\r\n⏳ Pod is starting up, please wait a moment and reconnect...\r\n"
        )
        await websocket.close()
        return

    await websocket.send_bytes(
        f"\r\n🚀 Connecting to pod {pod_name}...\r\n\r\n".encode()
    )

    try:
        ws_stream = k8s_client.exec_stream(
            lab.namespace_name,
            pod_name,
            command=["/bin/sh", "-c", "exec bash || exec sh"]
        )
    except Exception:
        ws_stream = None

    if not ws_stream:
        await websocket.send_text("❌ Failed to open exec stream.")
        await websocket.close()
        return


    async def recv_from_k8s():
        while ws_stream.is_open():
            ws_stream.update(timeout=0.05)
            if ws_stream.peek_stdout():
                data = ws_stream.read_stdout()
                if data:
                    await websocket.send_bytes(data.encode())
            if ws_stream.peek_stderr():
                data = ws_stream.read_stderr()
                if data:
                    await websocket.send_bytes(data.encode())
            await asyncio.sleep(0.01)

    async def read_from_ws():
        while True:
            raw = await websocket.receive_bytes()
            if not raw:
                continue
            msg_type = raw[0:1]
            payload = raw[1:]

            if msg_type == b'0':
                # stdin
                ws_stream.write_stdin(payload.decode(errors="replace"))
            elif msg_type == b'1':
                # resize
                try:
                    dims = json.loads(payload)
                    resize_msg = json.dumps({
                        "Width": dims.get("cols", 80),
                        "Height": dims.get("rows", 24)
                    })
                    ws_stream.write_channel(4, resize_msg)
                except Exception:
                    pass

    task1 = asyncio.create_task(recv_from_k8s())
    task2 = asyncio.create_task(read_from_ws())

    try:
        done, pending = await asyncio.wait(
            [task1, task2],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    except Exception:
        pass
    finally:
        try:
            ws_stream.close()
        except Exception:
            pass


async def _handle_mock_terminal(websocket: WebSocket, lab) -> None:
    """
    Spawn a real local /bin/bash or /bin/sh process via PTY.
    This gives a working terminal even without Kubernetes.
    """
    shell = "/bin/bash" if os.path.exists("/bin/bash") else "/bin/sh"

    lab_type = lab.lab_type.value if hasattr(lab.lab_type, "value") else str(lab.lab_type)
    banner = (
        f"\r\n"
        f"╔══════════════════════════════════════════════════════╗\r\n"
        f"║        🚀  CloudArena Lab Terminal (Demo Mode)       ║\r\n"
        f"╠══════════════════════════════════════════════════════╣\r\n"
        f"║  Lab Type : {lab_type:<41}║\r\n"
        f"║  Lab ID   : #{lab.id:<40}║\r\n"
        f"║  Note     : Running in mock mode (no K8s cluster)   ║\r\n"
        f"╚══════════════════════════════════════════════════════╝\r\n\r\n"
    )
    await websocket.send_bytes(banner.encode())

    # Open PTY
    master_fd, slave_fd = pty.openpty()

    import subprocess
    proc = subprocess.Popen(
        [shell],
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        close_fds=True,
        env={
            **os.environ,
            "TERM": "xterm-256color",
            "PS1": r"[cloudarena-lab]\$ ",
        },
    )
    os.close(slave_fd)


    async def read_pty():
        """Read PTY output and forward to WebSocket."""
        while True:
            try:
                rlist, _, _ = select.select([master_fd], [], [], 0.05)
                if rlist:
                    data = os.read(master_fd, 4096)
                    if not data:
                        break
                    await websocket.send_bytes(data)
            except (OSError, ValueError):
                break
            await asyncio.sleep(0.01)

    async def read_from_ws():
        while proc.poll() is None:
            raw = await websocket.receive_bytes()
            if not raw:
                continue

            msg_type = raw[0:1]
            payload_data = raw[1:]

            if msg_type == b'0':
                # stdin — write to PTY
                os.write(master_fd, payload_data)
            elif msg_type == b'1':
                # resize terminal
                try:
                    dims = json.loads(payload_data)
                    cols = dims.get("cols", 80)
                    rows = dims.get("rows", 24)
                    winsize = struct.pack("HHHH", rows, cols, 0, 0)
                    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                except Exception:
                    pass

    task1 = asyncio.create_task(read_pty())
    task2 = asyncio.create_task(read_from_ws())

    try:
        done, pending = await asyncio.wait(
            [task1, task2],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    except Exception:
        pass
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        try:
            os.close(master_fd)
        except OSError:
            pass
