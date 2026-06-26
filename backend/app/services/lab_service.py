import logging
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Lab, LabStatus, LabType, User, UserRole  # noqa: F401
from app.repositories.lab_repository import LabRepository
from app.repositories.audit_repository import AuditRepository
from app.kubernetes.k8s_client import k8s_client
from app.kubernetes.lab_templates import get_template, build_resource_names
from app.schemas.lab import LabCreateRequest, LabResponse

logger = logging.getLogger(__name__)


class LabService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.lab_repo = LabRepository(db)
        self.audit_repo = AuditRepository(db)

    async def create_lab(self, current_user: User, data: LabCreateRequest) -> LabResponse:
        # Count active labs for this user (max 3)
        active = await self.lab_repo.list_active_by_user(current_user.id)
        if len(active) >= 3:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum 3 active labs allowed per user",
            )

        template = get_template(data.lab_type)

        # Create a placeholder DB record to get the ID for name generation
        lab = await self.lab_repo.create(
            user_id=current_user.id,
            lab_type=data.lab_type,
            namespace_name="pending",
            deployment_name="pending",
            service_name="pending",
        )

        names = build_resource_names(current_user.id, data.lab_type, lab.id)

        # Update record with real names
        lab.namespace_name = names["namespace"]
        lab.deployment_name = names["deployment"]
        lab.service_name = names["service"]
        await self.db.flush()

        # Provision Kubernetes resources
        ns_ok = await k8s_client.create_namespace(names["namespace"])
        dep_ok = await k8s_client.create_deployment(
            namespace=names["namespace"],
            name=names["deployment"],
            image=template.image,
            labels={**template.labels, "lab-id": str(lab.id)},
            env_vars=template.env_vars,
            command=template.command,
            args=template.args,
        )
        svc_ok = await k8s_client.create_service(
            namespace=names["namespace"],
            name=names["service"],
            selector={**template.labels, "lab-id": str(lab.id)},
            port=template.port,
        )

        if ns_ok and dep_ok and svc_ok:
            lab = await self.lab_repo.update_status(lab.id, LabStatus.RUNNING)
        else:
            lab = await self.lab_repo.update_status(lab.id, LabStatus.ERROR)

        await self.audit_repo.log(
            current_user.id,
            "LAB_CREATED",
            f"Lab {lab.id} ({data.lab_type}) — status: {lab.status}",
        )
        return LabResponse.model_validate(lab)

    async def delete_lab(self, current_user: User, lab_id: int) -> dict:
        lab = await self.lab_repo.get_by_id(lab_id)
        if not lab:
            raise HTTPException(status_code=404, detail="Lab not found")

        # Only owner or admin can delete
        if lab.user_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to delete this lab")

        await self._teardown_lab(lab)

        await self.audit_repo.log(current_user.id, "LAB_DELETED", f"Lab {lab.id} deleted by {current_user.email}")
        return {"message": f"{lab_id} deleted successfully"}

    async def _teardown_lab(self, lab: Lab) -> None:
        """Delete all K8s resources and mark lab as deleted."""
        await k8s_client.delete_service(lab.namespace_name, lab.service_name)
        await k8s_client.delete_deployment(lab.namespace_name, lab.deployment_name)
        await k8s_client.delete_namespace(lab.namespace_name)
        await self.lab_repo.update_status(lab.id, LabStatus.DELETED)

    async def list_user_labs(self, user_id: int) -> List[LabResponse]:
        labs = await self.lab_repo.list_by_user(user_id)
        return [LabResponse.model_validate(lab) for lab in labs]

    async def get_lab_detail(self, current_user: User, lab_id: int) -> LabResponse:
        lab = await self.lab_repo.get_by_id(lab_id)
        if not lab:
            raise HTTPException(status_code=404, detail="Lab not found")
        if lab.user_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized")
        return LabResponse.model_validate(lab)

    async def cleanup_expired_labs(self) -> int:
        """Called by the CronJob endpoint — deletes expired labs."""
        expired = await self.lab_repo.list_expired()
        count = 0
        for lab in expired:
            try:
                await self._teardown_lab(lab)
                await self.audit_repo.log(
                    lab.user_id, "LAB_EXPIRED", f"Lab {lab.id} auto-expired"
                )
                count += 1
            except Exception as e:
                logger.error(f"Failed to cleanup lab {lab.id}: {e}")
        return count
