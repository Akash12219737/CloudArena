from datetime import datetime, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(self, user_id: int, action: str, details: str = "") -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            details=details,
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def list_by_user(self, user_id: int, limit: int = 50) -> List[AuditLog]:
        result = await self.db.execute(
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 200) -> List[AuditLog]:
        result = await self.db.execute(
            select(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())
