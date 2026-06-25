from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.core.deps import get_current_user
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.user import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile (username / email)."""
    repo = UserRepository(db)
    audit = AuditRepository(db)
    updates = data.model_dump(exclude_none=True)
    if updates:
        updated = await repo.update_profile(current_user.id, **updates)
        await audit.log(current_user.id, "PROFILE_UPDATED", str(updates))
        return UserResponse.model_validate(updated)
    return UserResponse.model_validate(current_user)
