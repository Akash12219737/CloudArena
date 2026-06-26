# ☁️ CloudArena — DevOps Interview Lab Platform

<div align="center">

![CloudArena](https://img.shields.io/badge/CloudArena-DevOps%20Labs-6366f1?style=for-the-badge&logo=kubernetes&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.30-326ce5?style=for-the-badge&logo=kubernetes)
![Minikube](https://img.shields.io/badge/Minikube-Local_K8s-326ce5?style=for-the-badge&logo=kubernetes&logoColor=white)
![Docker Hub](https://img.shields.io/badge/Docker%20Hub-Registry-2496ED?style=for-the-badge&logo=docker)

**Hands-on DevOps practice environments, provisioned on demand using Kubernetes.**

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Deployment](#-deployment) · [API Docs](#-api-documentation)

</div>

---

## 🎯 Project Overview

CloudArena is a production-ready cloud-native platform that allows DevOps learners to spin up isolated Kubernetes-backed practice environments on demand. Users can practice **Linux**, **Git**, and **Docker** commands inside containerized pods that are automatically cleaned up after expiry.

### Business Problem Solved

| Pain Point | CloudArena Solution |
|---|---|
| Messy local environments | Isolated K8s Namespaces per user |
| Slow setup time | Lab ready in seconds via API |
| OS inconsistencies | Standardised container images |
| Hard to reset | Auto-cleanup every 15 minutes |

---

## ✨ Features

- 🔐 **JWT Authentication** — Register, Login, Refresh tokens
- 🧪 **3 Lab Types** — Linux (Ubuntu), Git (Alpine+Git), Docker (DinD)
- ⚡ **Real-time Provisioning** — FastAPI → Kubernetes API → Pod ready
- 💻 **Interactive Terminal** — Browser-based xterm.js terminal with WebSocket pod connection
- 🗑️ **Auto Cleanup** — CronJob deletes expired labs every 15 minutes
- 📊 **Lab History** — Full audit trail of all sessions
- 🛡️ **Admin Panel** — Force-delete labs, view all users
- 🔒 **RBAC** — Role-based access control (user/admin)
- 📦 **Docker Compose** — One command local development

---

## 🏗️ Architecture

```
Internet
    ↓
AWS Load Balancer
    ↓
NGINX Ingress Controller
    ↓
┌─────────────────────────┐
│   React Frontend (SPA)  │
│   TypeScript + Tailwind  │
└───────────┬─────────────┘
            │ /api/*
┌───────────▼─────────────┐
│   FastAPI Backend        │
│   Python 3.12            │
│   SQLAlchemy + Alembic   │
└──────┬────────────┬──────┘
       │            │
  PostgreSQL    Kubernetes API
                    │
         ┌──────────┴──────────┐
         │                     │
   Linux Lab Pods      Docker Lab Pods
   Git Lab Pods
```

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, TailwindCSS v3, Vite, Zustand |
| Backend | FastAPI, Python 3.12, SQLAlchemy (async), Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Containers | Docker, Docker Compose |
| Container Registry | Docker Hub |
| Orchestration | Kubernetes 1.30 |
| Cloud | Minikube (Local Kubernetes) |
| CI/CD | GitHub Actions |
| Networking | NGINX Ingress Controller |

---

## 📁 Repository Structure

```
CloudArena/
├── frontend/                  # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/             # Route pages
│   │   ├── components/        # Shared components
│   │   ├── services/api.ts    # Axios + interceptors
│   │   ├── store/             # Zustand state
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                   # FastAPI application
│   ├── app/
│   │   ├── api/v1/            # Route handlers
│   │   ├── core/              # Config, security, deps
│   │   ├── db/                # ORM models, session
│   │   ├── repositories/      # Data access layer
│   │   ├── schemas/           # Pydantic models
│   │   ├── services/          # Business logic
│   │   └── kubernetes/        # K8s automation
│   ├── alembic/               # Migrations
│   └── Dockerfile
├── k8s/                       # Kubernetes manifests
│   ├── backend/
│   ├── frontend/
│   ├── postgres/
│   ├── ingress/
│   ├── cronjob/               # Auto-cleanup (every 15 min)
│   └── rbac/
├── .github/workflows/         # CI/CD pipelines
│   ├── ci.yml                 # Lint, test, build
│   └── deploy.yml             # Push to Docker Hub + deploy to K8s
├── docs/                      # Extended documentation
├── scripts/                   # Helper shell scripts
└── docker-compose.yml         # Local development
```

---

## ⚡ Quick Start (Local — Docker Compose)

```bash
# 1. Clone the repository
git clone https://github.com/yourorg/CloudArena.git
cd CloudArena

# 2. Copy and configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — set a strong SECRET_KEY (min 32 chars)

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec backend alembic upgrade head

# 5. Access the application
# Frontend:  http://localhost:80
# API docs:  http://localhost:8000/api/docs
# Backend:   http://localhost:8000
```

---

## 🔧 Development Setup (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Edit with your values

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f backend

# Stop services
docker compose down

# Full reset (removes volumes)
docker compose down -v
```

---

## ☸️ Kubernetes Deployment (Minikube)

### Prerequisites

- Minikube installed and running (see [docs/deployment.md](docs/deployment.md) for local setup)
- `kubectl` configured and pointing at your cluster
- Docker Hub images already pushed

### Deploy Steps

```bash
# 1. Platform namespace
kubectl apply -f k8s/namespace.yaml

# 2. Configuration and secrets
kubectl apply -f k8s/configmap/
kubectl apply -f k8s/secrets/      # Update base64 values first!

# 3. RBAC
kubectl apply -f k8s/rbac/

# 4. Database
kubectl apply -f k8s/postgres/

# 5. Application
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# 6. Networking and automation
kubectl apply -f k8s/ingress/
kubectl apply -f k8s/cronjob/

# 7. Verify
kubectl get pods -n cloudarena
kubectl get svc -n cloudarena
```

---

## 🔁 CI/CD Pipeline

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (Settings → Security) |
| `KUBE_CONFIG` | Base64-encoded kubeconfig: `cat ~/.kube/config \| base64 -w 0` |

### Pipeline Flow

```
Push to main
    │
    ├── ci.yml
    │   ├── Backend lint (ruff) + tests
    │   ├── Frontend lint + build
    │   └── Docker build (validation, no push)
    │
    └── deploy.yml (on main / tag)
        ├── Build & push backend → Docker Hub
        ├── Build & push frontend → Docker Hub
        ├── kubectl apply all K8s manifests
        ├── kubectl set image (rolling update)
        └── kubectl rollout status (wait for healthy)
```

---

## 🔑 API Documentation

Interactive docs: `http://localhost:8000/api/docs`

### Authentication Flow

```
POST /api/v1/auth/register  → { access_token, refresh_token }
POST /api/v1/auth/login     → { access_token, refresh_token }
POST /api/v1/auth/refresh   → { access_token, refresh_token }
```

### Labs API

```
GET    /api/v1/labs          # List user's labs
POST   /api/v1/labs          # Create lab { lab_type: "linux"|"git"|"docker" }
GET    /api/v1/labs/{id}     # Get lab details
DELETE /api/v1/labs/{id}     # Delete lab + K8s resources
```

### Admin API (admin role required)

```
GET    /api/v1/admin/users          # List all users
GET    /api/v1/admin/labs/active    # List all active labs
DELETE /api/v1/admin/labs/{id}      # Force delete any lab
```

---

## 🔒 Security Features

- ✅ **JWT tokens** — Short-lived access (30min) + refresh tokens (7 days)
- ✅ **bcrypt** — Password hashing with salt rounds
- ✅ **RBAC** — User and Admin roles enforced at route level
- ✅ **Input validation** — Pydantic schemas on all inputs
- ✅ **Rate limiting** — 200 req/min via SlowAPI
- ✅ **CORS** — Explicit origin whitelist
- ✅ **K8s RBAC** — Backend ServiceAccount with minimum required permissions
- ✅ **Secrets management** — Kubernetes Secrets, never hardcoded
- ✅ **Non-root Docker** — `appuser` (UID 1001) in all containers

---

## 🗺️ Lab Types

| Lab | Image | Purpose |
|---|---|---|
| 🐧 Linux | `ubuntu:22.04` | ls, grep, chmod, find, systemctl… |
| 🌿 Git | `alpine/git:latest` | init, branch, merge, rebase, cherry-pick… |
| 🐳 Docker | `docker:24-dind` | build, run, exec, logs, inspect… |

---

## 🔮 Future Improvements

- [x] WebSocket terminal (xterm.js) inside the browser
- [ ] Lab templates marketplace
- [ ] Kubernetes resource usage metrics
- [ ] Multi-tenant namespace quotas
- [ ] OAuth2 / GitHub SSO
- [ ] Lab scoring and assessment
- [ ] Certificate generation on lab completion

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
Built with ❤️ for the DevOps community · <strong>CloudArena</strong>
</div>
