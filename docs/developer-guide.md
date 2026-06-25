# Developer Guide

## Code Structure

### Backend — Clean Architecture

The backend strictly follows a 4-layer architecture:

```
HTTP Request
    ↓
API Route (app/api/v1/)     ← Thin: validates input, delegates to service
    ↓
Service (app/services/)     ← Business logic, orchestration
    ↓
Repository (app/repositories/) ← Data access only (SQLAlchemy)
    ↓
Database (PostgreSQL)
```

For K8s operations:
```
Service → KubernetesClient (app/kubernetes/k8s_client.py) → K8s API
```

### Design Patterns

**Repository Pattern**
All database queries live in `repositories/`. Services never write raw SQL or use ORM queries directly.

**Service Layer Pattern**
Business rules (e.g., max 3 active labs per user, audit logging) live in `services/`. Routes stay thin.

**Dependency Injection**
FastAPI's `Depends()` injects `AsyncSession` and `current_user` into every endpoint that needs them.

**Strategy Pattern (Lab Templates)**
`lab_templates.py` defines per-lab-type configuration as a dict of `LabTemplate` dataclasses, making it easy to add new lab types.

---

## Adding a New Lab Type

1. Add enum value to `LabType` in `app/db/models.py`
2. Add a new `LabTemplate` entry in `app/kubernetes/lab_templates.py`
3. Create Alembic migration for the new enum value
4. Add a new card in the frontend `LabsPage.tsx`
5. Update `LAB_META` in `DashboardPage.tsx`

---

## Kubernetes Automation

### Mock Mode (local dev without a cluster)

When `K8S_IN_CLUSTER=false` and no kubeconfig is found, the client falls back to mock mode. All K8s calls log `[MOCK] ...` and return `True`. Labs are created in the DB as `RUNNING` without real pods.

### Real Mode

Set `K8S_IN_CLUSTER=true` (in-cluster) or provide `K8S_KUBECONFIG_PATH=~/.kube/config`. The backend uses the official `kubernetes` Python SDK.

### Resource Naming Convention

```
Namespace:  ca-user-{user_id}-{lab_type}-{lab_id}
Deployment: {lab_type}-lab-user-{user_id}-{lab_type}-{lab_id}
Service:    {lab_type}-svc-user-{user_id}-{lab_type}-{lab_id}
```

---

## Database Migrations

```bash
# Create a new migration
cd backend
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# View migration history
alembic history
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | JWT signing key (min 32 chars) |
| `DATABASE_URL` | ✅ | — | Async PostgreSQL URL (asyncpg) |
| `SYNC_DATABASE_URL` | ✅ | — | Sync PostgreSQL URL (for Alembic) |
| `K8S_IN_CLUSTER` | | `false` | Use in-cluster service account |
| `K8S_KUBECONFIG_PATH` | | `~/.kube/config` | Path to kubeconfig |
| `LAB_EXPIRY_HOURS` | | `2` | Hours before lab auto-expires |
| `CORS_ORIGINS` | | `localhost:*` | Comma-separated allowed origins |
| `DEBUG` | | `false` | Enable debug logging |

---

## Testing

```bash
cd backend
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

Test files go in `backend/tests/`. Use `httpx.AsyncClient` with `app` for integration tests.

---

## Frontend State Management

```
useAuthStore (Zustand + localStorage)
├── user: User | null
├── accessToken: string | null
├── refreshToken: string | null
├── isAuthenticated: boolean
├── setUser()
├── setTokens()
└── logout()

useLabStore (Zustand)
├── labs: Lab[]
├── loading: boolean
├── fetchLabs()  ← GET /api/v1/labs
├── createLab()  ← POST /api/v1/labs
└── deleteLab()  ← DELETE /api/v1/labs/{id}
```

The API client (`services/api.ts`) automatically attaches the bearer token from `useAuthStore` and handles 401 → refresh token → retry.
