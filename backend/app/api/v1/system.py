from fastapi import APIRouter
from app.db.session import engine

router = APIRouter(tags=["System"])


@router.get("/health")
async def health():
    """Liveness probe — always returns 200 if the process is running."""
    return {"status": "ok", "service": "cloudarena-backend"}


@router.get("/ready")
async def readiness():
    """Readiness probe — checks DB connectivity."""
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")
