from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.core.deps import get_current_user
from app.schemas.lab import LabCreateRequest, LabResponse, LabListResponse
from app.services.lab_service import LabService

router = APIRouter(prefix="/labs", tags=["Labs"])


@router.post("", response_model=LabResponse, status_code=201)
async def create_lab(
    data: LabCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new lab (provisions K8s resources)."""
    service = LabService(db)
    return await service.create_lab(current_user, data)


@router.get("", response_model=LabListResponse)
async def list_labs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all labs for the current user."""
    service = LabService(db)
    labs = await service.list_user_labs(current_user.id)
    return LabListResponse(labs=labs, total=len(labs))


@router.get("/{lab_id}", response_model=LabResponse)
async def get_lab(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific lab."""
    service = LabService(db)
    return await service.get_lab_detail(current_user, lab_id)


@router.delete("/{lab_id}")
async def delete_lab(
    lab_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a lab and tear down all K8s resources."""
    service = LabService(db)
    return await service.delete_lab(current_user, lab_id)


@router.post("/cleanup/expired")
async def cleanup_expired(
    db: AsyncSession = Depends(get_db),
):
    """
    Internal endpoint for CronJob cleanup.
    In production, secure this behind cluster-internal network or a shared secret header.
    """
    service = LabService(db)
    cleaned = await service.cleanup_expired_labs()
    return {"message": f"Cleaned up {cleaned} expired labs"}
