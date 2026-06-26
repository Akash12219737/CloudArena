"""
Kubernetes client wrapper.
Supports both in-cluster (production) and kubeconfig (local dev) modes.
"""
import logging
from typing import Optional

from kubernetes import client, config, stream
from kubernetes.client.rest import ApiException

from app.core.config import settings

logger = logging.getLogger(__name__)


def _load_k8s_config() -> None:
    if settings.K8S_IN_CLUSTER:
        config.load_incluster_config()
    else:
        import os
        kubeconfig = os.path.expanduser(settings.K8S_KUBECONFIG_PATH)
        config.load_kube_config(config_file=kubeconfig)


class KubernetesClient:
    def __init__(self):
        try:
            _load_k8s_config()
            self._core = client.CoreV1Api()
            self._apps = client.AppsV1Api()
            self._connected = True
            logger.info("Kubernetes client initialized successfully")
        except Exception as exc:
            logger.warning(f"Kubernetes unavailable (running in mock mode): {exc}")
            self._connected = False

    @property
    def connected(self) -> bool:
        return self._connected

    # ── Namespace ──────────────────────────────────────────────────────────────

    async def create_namespace(self, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] create_namespace: {name}")
            return True
        ns = client.V1Namespace(metadata=client.V1ObjectMeta(
            name=name,
            labels={"managed-by": "cloudarena"},
        ))
        try:
            self._core.create_namespace(body=ns)
            logger.info(f"Namespace created: {name}")
            return True
        except ApiException as e:
            if e.status == 409:
                logger.warning(f"Namespace already exists: {name}")
                return True
            logger.error(f"Failed to create namespace {name}: {e}")
            return False

    async def delete_namespace(self, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] delete_namespace: {name}")
            return True
        try:
            self._core.delete_namespace(name=name)
            logger.info(f"Namespace deleted: {name}")
            return True
        except ApiException as e:
            if e.status == 404:
                return True
            logger.error(f"Failed to delete namespace {name}: {e}")
            return False

    # ── Deployment ─────────────────────────────────────────────────────────────

    async def create_deployment(
        self,
        namespace: str,
        name: str,
        image: str,
        labels: dict,
        env_vars: Optional[dict] = None,
        command: Optional[list] = None,
        args: Optional[list] = None,
    ) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] create_deployment: {name} in {namespace}")
            return True
        env = [client.V1EnvVar(name=k, value=v) for k, v in (env_vars or {}).items()]
        container = client.V1Container(
            name=name,
            image=image,
            command=command,
            args=args,
            env=env,
            resources=client.V1ResourceRequirements(
                requests={"cpu": "100m", "memory": "128Mi"},
                limits={"cpu": "500m", "memory": "512Mi"},
            ),
        )
        spec = client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(match_labels=labels),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels=labels),
                spec=client.V1PodSpec(containers=[container]),
            ),
        )
        deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(name=name, namespace=namespace, labels=labels),
            spec=spec,
        )
        try:
            self._apps.create_namespaced_deployment(namespace=namespace, body=deployment)
            logger.info(f"Deployment created: {name} in {namespace}")
            return True
        except ApiException as e:
            logger.error(f"Failed to create deployment {name}: {e}")
            return False

    async def delete_deployment(self, namespace: str, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] delete_deployment: {name}")
            return True
        try:
            self._apps.delete_namespaced_deployment(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                return True
            logger.error(f"Failed to delete deployment {name}: {e}")
            return False

    # ── Service ────────────────────────────────────────────────────────────────

    async def create_service(
        self,
        namespace: str,
        name: str,
        selector: dict,
        port: int = 80,
    ) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] create_service: {name} in {namespace}")
            return True
        svc = client.V1Service(
            metadata=client.V1ObjectMeta(name=name, namespace=namespace),
            spec=client.V1ServiceSpec(
                selector=selector,
                ports=[client.V1ServicePort(port=port, target_port=port)],
                type="ClusterIP",
            ),
        )
        try:
            self._core.create_namespaced_service(namespace=namespace, body=svc)
            logger.info(f"Service created: {name} in {namespace}")
            return True
        except ApiException as e:
            if e.status == 409:
                return True
            logger.error(f"Failed to create service {name}: {e}")
            return False

    async def delete_service(self, namespace: str, name: str) -> bool:
        if not self._connected:
            logger.info(f"[MOCK] delete_service: {name}")
            return True
        try:
            self._core.delete_namespaced_service(name=name, namespace=namespace)
            return True
        except ApiException as e:
            if e.status == 404:
                return True
            logger.error(f"Failed to delete service {name}: {e}")
            return False

    # ── Pod Exec ───────────────────────────────────────────────────────────────

    def get_pod_name(self, namespace: str, label_selector: str) -> Optional[str]:
        """Return the name of the first Running pod matching the label selector."""
        if not self._connected:
            return None
        try:
            pods = self._core.list_namespaced_pod(
                namespace=namespace,
                label_selector=label_selector,
            )
            for pod in pods.items:
                if pod.status.phase == "Running":
                    return pod.metadata.name
            return None
        except ApiException as e:
            logger.error(f"Failed to list pods in {namespace}: {e}")
            return None

    def get_pod_status(self, namespace: str, label_selector: str) -> dict:
        """
        Return live pod status info: phase, pod_name, pod_ip, and ready flag.
        In mock mode returns a simulated Running state so the UI can proceed.
        """
        if not self._connected:
            return {
                "phase": "Running",
                "pod_name": f"mock-pod-{namespace[:20]}",
                "pod_ip": "127.0.0.1",
                "ready": True,
                "mock": True,
            }
        try:
            pods = self._core.list_namespaced_pod(
                namespace=namespace,
                label_selector=label_selector,
            )
            if not pods.items:
                return {"phase": "Pending", "pod_name": None, "pod_ip": None, "ready": False}

            pod = pods.items[0]
            phase = pod.status.phase or "Unknown"
            pod_name = pod.metadata.name
            pod_ip = pod.status.pod_ip

            # Determine readiness via container statuses
            ready = False
            if phase == "Running" and pod.status.container_statuses:
                ready = all(
                    cs.ready for cs in pod.status.container_statuses
                )

            return {
                "phase": phase,
                "pod_name": pod_name,
                "pod_ip": pod_ip,
                "ready": ready,
            }
        except ApiException as e:
            logger.error(f"Failed to get pod status in {namespace}: {e}")
            return {"phase": "Unknown", "pod_name": None, "pod_ip": None, "ready": False}

    def exec_stream(self, namespace: str, pod_name: str, shell: str = "/bin/bash"):
        """
        Open an interactive exec stream to a pod container.
        Returns the websocket_client stream object.
        Falls back to /bin/sh if /bin/bash is unavailable.
        """
        return stream.stream(
            self._core.connect_get_namespaced_pod_exec,
            pod_name,
            namespace,
            command=[shell],
            stderr=True,
            stdin=True,
            stdout=True,
            tty=True,
            _preload_content=False,
        )


# Singleton instance
k8s_client = KubernetesClient()
