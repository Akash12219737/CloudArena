from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import UserRepository
from app.repositories.lab_repository import LabRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.user import UserResponse
from app.schemas.lab import LabResponse


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.lab_repo = LabRepository(db)
        self.audit_repo = AuditRepository(db)

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[UserResponse]:
        users = await self.user_repo.list_all(skip=skip, limit=limit)
        return [UserResponse.model_validate(u) for u in users]

    async def list_active_labs(self) -> List[LabResponse]:
        labs = await self.lab_repo.list_active()
        return [LabResponse.model_validate(l) for l in labs]

    async def force_delete_lab(self, lab_id: int, admin_id: int) -> dict:
        from app.services.lab_service import LabService
        from app.db.models import UserRole, User

        lab = await self.lab_repo.get_by_id(lab_id)
        if not lab:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Lab not found")

        lab_service = LabService(self.db)
        await lab_service._teardown_lab(lab)
        await self.audit_repo.log(admin_id, "ADMIN_FORCE_DELETE", f"Admin force-deleted lab {lab_id}")
        return {"message": f"Lab {lab_id} force-deleted by admin"}
