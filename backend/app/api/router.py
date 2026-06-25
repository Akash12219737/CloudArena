from fastapi import APIRouter
from app.api.v1 import auth, users, labs, admin, system

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(labs.router)
api_router.include_router(admin.router)
api_router.include_router(system.router)
