from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.core.deps import get_current_admin
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] List all registered users."""
    service = AdminService(db)
    return await service.list_users(skip=skip, limit=limit)


@router.get("/labs/active")
async def list_active_labs(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] List all currently running labs across all users."""
    service = AdminService(db)
    return await service.list_active_labs()


@router.delete("/labs/{lab_id}")
async def force_delete_lab(
    lab_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Force delete any lab regardless of owner."""
    service = AdminService(db)
    return await service.force_delete_lab(lab_id, admin.id)
