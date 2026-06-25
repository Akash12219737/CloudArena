from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.user import UserRegisterRequest, UserLoginRequest, TokenResponse, RefreshTokenRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and return JWT tokens."""
    service = AuthService(db)
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    service = AuthService(db)
    return await service.login(data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Issue new access token using refresh token."""
    service = AuthService(db)
    return await service.refresh(data.refresh_token)
