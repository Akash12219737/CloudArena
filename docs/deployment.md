# CloudArena — Deployment Guide

## 1. Local Deployment (Docker Compose)

The fastest way to run the full stack locally.

### Prerequisites
- Docker Desktop installed and running
- Git

### Steps

```bash
git clone https://github.com/yourorg/CloudArena.git
cd CloudArena

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — change SECRET_KEY to a random 32+ char string

# Start all services (Postgres + Backend + Frontend)
docker compose up -d

# Run database migrations (first time only)
docker compose exec backend alembic upgrade head

# Check logs
docker compose logs -f
```

| Service | URL |
|---|---|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/api/docs |
| PostgreSQL | localhost:5432 |

### Tear Down

```bash
docker compose down         # stop (keeps data)
docker compose down -v      # stop + delete volumes
```

---

## 2. Docker Hub — Pushing Images

The CI/CD pipeline pushes images automatically on `main` branch. To push manually:

```bash
# Login
docker login

# Build and push backend
docker build -t yourusername/cloudarena-backend:latest ./backend
docker push yourusername/cloudarena-backend:latest

# Build and push frontend
docker build -t yourusername/cloudarena-frontend:latest ./frontend
docker push yourusername/cloudarena-frontend:latest
```

Update `k8s/backend/deployment.yaml` and `k8s/frontend/deployment.yaml` with your Docker Hub username before deploying.

---

## 3. Minikube — Local Cluster Setup

> Infrastructure is provisioned locally via Minikube. No cloud resources are required.

### Step 1 — Start Minikube

```bash
minikube start --cpus=4 --memory=8192
```

Wait for Minikube to download images and start the cluster.

### Step 2 — Verify kubectl

Minikube configures `kubectl` automatically.
```bash
kubectl get nodes
# Should list 1 node named "minikube"
```

### Step 3 — Enable NGINX Ingress Controller

```bash
minikube addons enable ingress

# Wait for Ingress controller to be ready
kubectl get pods -n ingress-nginx -w
```

### Step 4 — Deploy CloudArena

```bash
# Update image names in K8s manifests first:
# k8s/backend/deployment.yaml  → your Docker Hub image
# k8s/frontend/deployment.yaml → your Docker Hub image

# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap/
kubectl apply -f k8s/secrets/        # ⚠ update base64 values first
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress/
kubectl apply -f k8s/cronjob/

# Verify
kubectl get pods -n cloudarena
kubectl get ingress -n cloudarena
```

### Step 5 — DNS Setup

1. Get the Minikube IP:
   ```bash
   minikube ip
   ```
2. Add an entry to your `/etc/hosts` file (or `C:\Windows\System32\drivers\etc\hosts` on Windows):
   ```
   <MINIKUBE_IP> cloudarena.local
   ```
3. Update `k8s/ingress/ingress.yaml` with the domain `cloudarena.local`.
4. (Optional) Run `minikube tunnel` if the ingress is not reachable via `minikube ip`.

---

## 4. Kubernetes — Updating Secrets

Before deploying, encode your real values:

```bash
# Encode a value
echo -n "your-secret-value" | base64

# Decode to verify
echo "base64string" | base64 -d
```

Edit `k8s/secrets/app-secrets.yaml` with your encoded values:
- `SECRET_KEY` — JWT signing secret (min 32 chars)
- `DATABASE_URL` — asyncpg connection string
- `SYNC_DATABASE_URL` — psycopg2 connection string (for Alembic)

---

## 5. GitHub Actions CI/CD Setup

### Add Secrets to GitHub

Go to **Repository → Settings → Secrets and variables → Actions** and add:

| Secret | How to get it |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub → Account Settings → Security → New Access Token |
| `KUBE_CONFIG` | `cat ~/.kube/config \| base64 -w 0` |

### Pipeline Triggers

| Trigger | Pipeline |
|---|---|
| Any push / PR | `ci.yml` — lint, test, build |
| Push to `main` | `deploy.yml` — push images + deploy to K8s |
| Git tag `v*` | `deploy.yml` — same as above with version tag |

---

## 6. Verifying the Deployment

```bash
# Check all pods are Running
kubectl get pods -n cloudarena

# Check services
kubectl get svc -n cloudarena

# Check ingress
kubectl get ingress -n cloudarena

# View backend logs
kubectl logs -l app=cloudarena-backend -n cloudarena -f

# Run health check
curl https://cloudarena.yourdomain.com/api/v1/health
# Expected: {"status":"ok","service":"cloudarena-backend"}

# Run migrations on the cluster
kubectl exec -it deployment/cloudarena-backend -n cloudarena -- alembic upgrade head
```

---

## 7. Scaling

```bash
# Scale backend
kubectl scale deployment cloudarena-backend --replicas=3 -n cloudarena

# Scale frontend
kubectl scale deployment cloudarena-frontend --replicas=3 -n cloudarena

# Check autoscaling (if HPA is configured)
kubectl get hpa -n cloudarena
```
