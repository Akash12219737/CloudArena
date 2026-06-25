from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, UserRole
from app.core.security import hash_password


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def create(
        self,
        username: str,
        email: str,
        password: str,
        role: UserRole = UserRole.USER,
    ) -> User:
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        result = await self.db.execute(select(User).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def update_profile(self, user_id: int, **kwargs) -> Optional[User]:
        await self.db.execute(
            update(User).where(User.id == user_id).values(**kwargs)
        )
        return await self.get_by_id(user_id)
