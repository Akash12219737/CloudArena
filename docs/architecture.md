# CloudArena — Architecture Documentation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      INTERNET                           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│          AWS Load Balancer                              │
│          (TLS termination · manually created)           │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│         NGINX Ingress Controller (EKS)                  │
│   /api/*  →  backend:8000                               │
│   /*      →  frontend:80                                │
└──────┬────────────────────────────────┬─────────────────┘
       │                                │
┌──────▼──────────┐            ┌────────▼────────┐
│  React Frontend │            │  FastAPI Backend │
│  NGINX:80       │            │  Uvicorn:8000    │
│  Docker Hub     │            │  Docker Hub      │
└─────────────────┘            └───────┬──────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                  ┌───────▼──────┐        ┌────────▼────────┐
                  │  PostgreSQL  │        │  Kubernetes API │
                  │  Port 5432   │        │  (AWS EKS)      │
                  └──────────────┘        └────────┬────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                    ┌─────────▼──────┐  ┌──────────▼─────┐  ┌──────────▼──────┐
                    │  Linux Lab Pod │  │  Git Lab Pod   │  │ Docker Lab Pod  │
                    │  ubuntu:22.04  │  │  alpine/git    │  │  docker:dind    │
                    │  Namespace:    │  │  Namespace:    │  │  Namespace:     │
                    │  ca-user-1-..  │  │  ca-user-1-..  │  │  ca-user-1-..   │
                    └────────────────┘  └────────────────┘  └─────────────────┘
```

## Component Diagram

### Frontend (React SPA)
```
src/
├── pages/        ← Route-level components (Login, Dashboard, Labs, History, Admin)
├── components/   ← Shared UI (Layout, ProtectedRoute)
├── services/     ← Axios API client with JWT interceptors
├── store/        ← Zustand (authStore, labStore)
└── types/        ← Shared TypeScript interfaces
```

### Backend (FastAPI)
```
app/
├── api/v1/       ← HTTP route handlers (thin layer)
├── services/     ← Business logic orchestration
├── repositories/ ← Data access (SQLAlchemy queries)
├── schemas/      ← Pydantic request/response models
├── core/         ← Config, security, DI
├── db/           ← ORM models, session factory
└── kubernetes/   ← K8s client wrapper + lab templates
```

### Clean Architecture Layers
```
Routes → Services → Repositories → Database
Routes → Services → KubernetesClient → K8s API
```

## Kubernetes Resource Flow

### Lab Creation
```
User POST /api/v1/labs
        ↓
Lab Service: create_lab()
        ↓
1. Create DB record (status: PENDING)
2. Build resource names: ca-user-{id}-{type}-{lab_id}
3. k8s_client.create_namespace()
4. k8s_client.create_deployment()
5. k8s_client.create_service()
6. Update DB record (status: RUNNING)
7. Return LabResponse to user
```

### Auto Cleanup (Every 15 mins)
```
CronJob fires (schedule: "*/15 * * * *")
        ↓
POST /api/v1/labs/cleanup/expired
        ↓
LabService.cleanup_expired_labs()
        ↓
For each expired lab:
  1. delete_service()
  2. delete_deployment()
  3. delete_namespace()
  4. Update status → DELETED
  5. Write AuditLog
```

### CI/CD Pipeline Flow
```
Developer pushes to main
        ↓
GitHub Actions: ci.yml
  ├── Lint backend (ruff)
  ├── Run backend tests
  ├── Build frontend
  └── Validate Docker images (no push)
        ↓
GitHub Actions: deploy.yml
  ├── Build backend image → push to Docker Hub
  ├── Build frontend image → push to Docker Hub
  ├── kubectl apply K8s manifests
  ├── kubectl set image (rolling update)
  └── kubectl rollout status (verify healthy)
```

## Infrastructure Overview (Manual AWS Setup)

```
AWS Account
  └── VPC (manually created)
        ├── Public Subnets (2–3 AZs)
        │     └── AWS Load Balancer (ALB)
        └── Private Subnets (2–3 AZs)
              └── EKS Node Group
                    ├── NGINX Ingress Controller
                    ├── CloudArena Backend Pod(s)
                    ├── CloudArena Frontend Pod(s)
                    ├── PostgreSQL Pod + PVC
                    ├── Lab Pods (per user, isolated namespaces)
                    └── Cleanup CronJob
```

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id           SERIAL PRIMARY KEY,
    username     VARCHAR(64) UNIQUE NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role         userrole DEFAULT 'user',
    created_at   TIMESTAMPTZ NOT NULL
);

-- Labs
CREATE TABLE labs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lab_type        labtype NOT NULL,           -- linux|git|docker
    namespace_name  VARCHAR(128) NOT NULL,
    deployment_name VARCHAR(128) NOT NULL,
    service_name    VARCHAR(128) NOT NULL,
    status          labstatus DEFAULT 'pending', -- pending|running|expired|deleted|error
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL
);

-- Audit Logs
CREATE TABLE audit_logs (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action    VARCHAR(128) NOT NULL,
    details   TEXT,
    timestamp TIMESTAMPTZ NOT NULL
);
```

## User Workflow

```
1. User visits https://cloudarena.yourdomain.com
2. Registers / logs in → JWT tokens stored in localStorage
3. Dashboard shows active labs and stats
4. User clicks "New Lab" → selects Linux/Git/Docker
5. Frontend: POST /api/v1/labs { lab_type: "linux" }
6. Backend:
   - Creates K8s Namespace: ca-user-42-linux-7
   - Creates K8s Deployment: linux-lab-user-42-linux-7
   - Creates K8s Service: linux-svc-user-42-linux-7
   - Stores in PostgreSQL (status: RUNNING)
7. Lab card appears on dashboard with expiry countdown
8. User practices commands in the pod environment
9. User can manually terminate → DELETE /api/v1/labs/7
10. CronJob runs every 15 min → auto-terminates expired labs
```
