from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.schemas.user import UserRegisterRequest, UserLoginRequest, TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditRepository(db)

    async def register(self, data: UserRegisterRequest) -> TokenResponse:
        # Check uniqueness
        if await self.user_repo.get_by_email(data.email):
            raise HTTPException(status_code=400, detail="Email already registered")
        if await self.user_repo.get_by_username(data.username):
            raise HTTPException(status_code=400, detail="Username already taken")

        user = await self.user_repo.create(
            username=data.username,
            email=data.email,
            password=data.password,
        )
        await self.audit_repo.log(user.id, "USER_REGISTERED", f"New user: {user.email}")

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def login(self, data: UserLoginRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        await self.audit_repo.log(user.id, "USER_LOGIN", f"Login from user: {user.email}")

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        user_id = int(payload["sub"])
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )
