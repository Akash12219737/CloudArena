"""
Basic smoke tests — run by GitHub Actions CI.
These tests do NOT require a live database or Kubernetes cluster.
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    """Async test client wrapping the FastAPI app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# ── Health / System endpoints ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "cloudarena-backend"


@pytest.mark.asyncio
async def test_health_does_not_require_auth(client: AsyncClient):
    """Health endpoint must be publicly accessible (no token required)."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


# ── Auth endpoint validation ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_missing_fields_returns_422(client: AsyncClient):
    """Pydantic validation should reject an empty body."""
    response = await client.post("/api/v1/auth/register", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_fields_returns_422(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_protected_route_requires_token(client: AsyncClient):
    """Any protected route should return 401 without a Bearer token."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_labs_list_requires_token(client: AsyncClient):
    response = await client.get("/api/v1/labs")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_bearer_token_returns_401(client: AsyncClient):
    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer this-is-not-a-valid-token"},
    )
    assert response.status_code == 401
