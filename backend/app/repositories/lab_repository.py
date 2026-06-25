from datetime import datetime, timedelta, timezone
from typing import Optional, List

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Lab, LabStatus, LabType
from app.core.config import settings


class LabRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: int,
        lab_type: LabType,
        namespace_name: str,
        deployment_name: str,
        service_name: str,
    ) -> Lab:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.LAB_EXPIRY_HOURS)
        lab = Lab(
            user_id=user_id,
            lab_type=lab_type,
            namespace_name=namespace_name,
            deployment_name=deployment_name,
            service_name=service_name,
            status=LabStatus.PENDING,
            expires_at=expires_at,
        )
        self.db.add(lab)
        await self.db.flush()
        await self.db.refresh(lab)
        return lab

    async def get_by_id(self, lab_id: int) -> Optional[Lab]:
        result = await self.db.execute(select(Lab).where(Lab.id == lab_id))
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: int, skip: int = 0, limit: int = 50) -> List[Lab]:
        result = await self.db.execute(
            select(Lab)
            .where(Lab.user_id == user_id)
            .order_by(Lab.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_active_by_user(self, user_id: int) -> List[Lab]:
        result = await self.db.execute(
            select(Lab).where(
                Lab.user_id == user_id,
                Lab.status == LabStatus.RUNNING,
            )
        )
        return list(result.scalars().all())

    async def list_active(self, skip: int = 0, limit: int = 200) -> List[Lab]:
        result = await self.db.execute(
            select(Lab)
            .where(Lab.status == LabStatus.RUNNING)
            .order_by(Lab.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_expired(self) -> List[Lab]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Lab).where(
                Lab.expires_at <= now,
                Lab.status == LabStatus.RUNNING,
            )
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 200) -> List[Lab]:
        result = await self.db.execute(
            select(Lab).order_by(Lab.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def update_status(self, lab_id: int, status: LabStatus) -> Optional[Lab]:
        await self.db.execute(
            update(Lab).where(Lab.id == lab_id).values(status=status)
        )
        return await self.get_by_id(lab_id)

    async def delete(self, lab: Lab) -> None:
        await self.db.delete(lab)
