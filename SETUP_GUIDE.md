# 🚀 CloudArena — Complete Step-by-Step Setup Guide
### From Zero to Fully Deployed — Every Single Step Explained

> 📌 **How to read this guide**
> Every command is shown exactly as you type it.
> Every file edit shows exactly what to change.
> Read top to bottom. Do not skip steps.

---

## 📋 TABLE OF CONTENTS

1. [What You Need Installed](#-step-1-what-you-need-installed-prerequisites)
2. [Get the Code onto Your Computer](#-step-2-get-the-code-git-setup)
3. [Understand the Project Structure](#-step-3-understand-the-folder-structure)
4. [Set Up the Database (PostgreSQL)](#-step-4-set-up-the-database-postgresql)
5. [Configure Environment Variables (.env)](#-step-5-configure-environment-variables)
6. [Run Locally with Docker Compose](#-step-6-run-everything-locally-docker-compose)
7. [Run Database Migrations](#-step-7-run-database-migrations)
8. [Verify the App is Working](#-step-8-verify-everything-is-working)
9. [Push Your Code to GitHub](#-step-9-push-your-code-to-github)
10. [Set Up Docker Hub](#-step-10-set-up-docker-hub-image-registry)
11. [Set Up Minikube (Kubernetes Cluster)](#-step-11-set-up-minikube-kubernetes-cluster)
12. [Deploy to Kubernetes Manually](#-step-12-deploy-to-kubernetes-manually)
13. [Set Up GitHub Actions (Auto CI/CD)](#-step-13-set-up-github-actions-auto-cicd)
14. [Verify Production Deployment](#-step-14-verify-production-deployment)
15. [Troubleshooting](#-step-15-troubleshooting-common-errors)

---

## 🛠 STEP 1: What You Need Installed (Prerequisites)

Install these tools **before anything else**. Click each link to download.

### 1.1 — Git
Used to save and push your code.
```
Download: https://git-scm.com/downloads
```
After install, verify:
```bash
git --version
# Should print: git version 2.x.x
```

### 1.2 — Docker Desktop
Used to run everything in containers locally.
```
Download: https://www.docker.com/products/docker-desktop
```
After install, open Docker Desktop and wait until it says **"Docker is running"**.
Verify:
```bash
docker --version
# Should print: Docker version 24.x.x

docker compose version
# Should print: Docker Compose version v2.x.x
```

### 1.3 — Node.js (version 20)
Used for the React frontend.
```
Download: https://nodejs.org/en  (click "LTS" version)
```
Verify:
```bash
node --version
# Should print: v20.x.x

npm --version
# Should print: 10.x.x
```

### 1.4 — Python 3.12
Used for the FastAPI backend.
```
Download: https://www.python.org/downloads/
```
**Windows**: During install, tick ✅ "Add Python to PATH"

Verify:
```bash
python --version
# Should print: Python 3.12.x
```

### 1.5 — Minikube
Used to run a local Kubernetes cluster.
```
Download: https://minikube.sigs.k8s.io/docs/start/
```
Verify:
```bash
minikube version
# Should print: minikube version: v1.x.x
```

### 1.6 — kubectl
Used to send commands to Kubernetes.
```
Download: https://kubernetes.io/docs/tasks/tools/
```
Verify:
```bash
kubectl version --client
# Should print: Client Version: v1.30.x
```

---

## 📂 STEP 2: Get the Code (Git Setup)

### 2.1 — Configure Git with your name and email (first time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "youremail@example.com"
```

### 2.2 — Go to the project folder

The project is already at `d:\Downloads\CloudArena`. Open a terminal there:

```bash
# Windows (PowerShell or CMD):
cd d:\Downloads\CloudArena

# Mac/Linux:
cd /path/to/CloudArena
```

### 2.3 — Create a GitHub repository

1. Go to https://github.com
2. Click **"New"** (green button, top left)
3. Repository name: `CloudArena`
4. Set to **Private** (recommended)
5. Do NOT tick "Add README" (we already have one)
6. Click **"Create repository"**

### 2.4 — Connect your local folder to GitHub

```bash
# Inside d:\Downloads\CloudArena

git init                          # Start git tracking in this folder
git add .                         # Stage all files
git commit -m "Initial commit"    # Save a snapshot
git branch -M main                # Name the main branch

# Replace YOUR_USERNAME with your GitHub username:
git remote add origin https://github.com/YOUR_USERNAME/CloudArena.git

git push -u origin main           # Upload to GitHub
```

> 💡 GitHub will ask for your username and password.
> Use a **Personal Access Token** as the password (not your GitHub account password).
> Create one at: GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → Generate new token → tick `repo` → copy the token.

---

## 📁 STEP 3: Understand the Folder Structure

```
CloudArena/
│
├── backend/                ← Python FastAPI server (the "brain")
│   ├── app/
│   │   ├── api/v1/         ← All API endpoints (URLs)
│   │   ├── core/           ← Settings, security, JWT
│   │   ├── db/             ← Database models (tables)
│   │   ├── repositories/   ← Database queries
│   │   ├── services/       ← Business logic
│   │   └── kubernetes/     ← Code to create/delete K8s pods
│   ├── alembic/            ← Database migration scripts
│   ├── .env                ← Secret settings (YOU CREATE THIS)
│   ├── .env.example        ← Template for .env
│   ├── Dockerfile          ← Recipe to build backend container
│   └── requirements.txt    ← Python packages list
│
├── frontend/               ← React website (what users see)
│   ├── src/
│   │   ├── pages/          ← Each page (Login, Dashboard, Labs...)
│   │   ├── components/     ← Reusable UI pieces
│   │   ├── store/          ← App state (Zustand)
│   │   └── services/       ← API calls to backend
│   ├── Dockerfile          ← Recipe to build frontend container
│   └── package.json        ← Node packages list
│
├── k8s/                    ← Kubernetes config files (YAML)
│   ├── backend/            ← Deploy backend to K8s
│   ├── frontend/           ← Deploy frontend to K8s
│   ├── postgres/           ← Deploy database to K8s
│   ├── ingress/            ← Handle web traffic routing
│   ├── cronjob/            ← Auto-delete expired labs
│   └── rbac/               ← Permission system
│
├── .github/workflows/      ← Automatic CI/CD pipelines
│   ├── ci.yml              ← Run tests on every push
│   └── deploy.yml          ← Auto-deploy on push to main
│
├── docs/                   ← Documentation files
├── scripts/                ← Helper shell scripts
└── docker-compose.yml      ← Run everything locally with one command
```

---

## 🗄 STEP 4: Set Up the Database (PostgreSQL)

CloudArena uses **PostgreSQL** as its database. PostgreSQL stores:
- User accounts (email, password, role)
- Lab records (which user created which lab, status, expiry)
- Audit logs (every action taken)

### Option A — Using Docker Compose (RECOMMENDED for local dev)

**You don't need to install PostgreSQL manually.** Docker Compose starts it for you automatically in Step 6. Skip to Step 5.

### Option B — Install PostgreSQL Manually (if you want a local install)

```
Download: https://www.postgresql.org/download/
```

During installation, you will be asked to set:
- **Username**: `postgres` (default superuser)
- **Password**: set something like `postgres123` (remember this!)
- **Port**: `5432` (keep default)

After installing, open **pgAdmin** (installed with PostgreSQL) or use the terminal:

```bash
# Connect to PostgreSQL as superuser
psql -U postgres
# Enter the password you set above

# Create a dedicated database user for CloudArena
CREATE USER cloudarena WITH PASSWORD 'cloudarena_pass';

# Create the database
CREATE DATABASE cloudarena OWNER cloudarena;

# Give full permissions
GRANT ALL PRIVILEGES ON DATABASE cloudarena TO cloudarena;

# Exit
\q
```

**What these commands mean:**
- `CREATE USER cloudarena WITH PASSWORD 'cloudarena_pass'`
  → Creates a new PostgreSQL user named `cloudarena` with the password `cloudarena_pass`
- `CREATE DATABASE cloudarena OWNER cloudarena`
  → Creates a new database named `cloudarena`, owned by the `cloudarena` user
- `GRANT ALL PRIVILEGES`
  → Lets the `cloudarena` user do everything inside the `cloudarena` database

---

## ⚙️ STEP 5: Configure Environment Variables

Environment variables are **secret settings** your app reads at startup.
They are stored in a file called `.env` — this file is **NEVER pushed to GitHub**.

### 5.1 — Create the .env file

```bash
# From inside d:\Downloads\CloudArena\backend\
copy .env.example .env        # Windows
# OR
cp .env.example .env          # Mac/Linux
```

### 5.2 — Open .env and fill in every value

Open `d:\Downloads\CloudArena\backend\.env` in any text editor (Notepad, VS Code, etc.)

Here is the complete file with explanations for every single line:

```ini
# ═══════════════════════════════════════════════
# APPLICATION SETTINGS
# ═══════════════════════════════════════════════

# The name shown in logs and API docs
APP_NAME=CloudArena

# "development" for local work, "production" for live server
APP_ENV=development

# Show detailed error messages? true=yes (local only), false=no (production)
DEBUG=true

# ⚠️ MOST IMPORTANT — The key used to sign JWT tokens.
# Must be at least 32 characters long.
# Generate a random one by running this in your terminal:
#   python -c "import secrets; print(secrets.token_hex(32))"
# Copy the output and paste it here.
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars

# Encryption algorithm for JWT — leave as HS256
ALGORITHM=HS256

# How long (in minutes) before the access token expires
# After 30 minutes, the user silently gets a new one using the refresh token
ACCESS_TOKEN_EXPIRE_MINUTES=30

# How long (in days) the refresh token lasts
# After 7 days, user must log in again
REFRESH_TOKEN_EXPIRE_DAYS=7


# ═══════════════════════════════════════════════
# DATABASE CONNECTION
# ═══════════════════════════════════════════════

# ASYNC connection string (used by the FastAPI app at runtime)
# Format: postgresql+asyncpg://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
#
# USERNAME    = the PostgreSQL user you created (cloudarena)
# PASSWORD    = the password for that user (cloudarena_pass)
# HOST        = where PostgreSQL is running
#               - localhost  → if PostgreSQL is installed on your machine
#               - postgres   → if running via Docker Compose (use the service name)
# PORT        = always 5432 (PostgreSQL default)
# DATABASE    = the database name (cloudarena)
DATABASE_URL=postgresql+asyncpg://cloudarena:cloudarena_pass@localhost:5432/cloudarena

# SYNC connection string (used by Alembic migration tool only)
# Same as above but without "+asyncpg"
SYNC_DATABASE_URL=postgresql://cloudarena:cloudarena_pass@localhost:5432/cloudarena


# ═══════════════════════════════════════════════
# KUBERNETES SETTINGS
# ═══════════════════════════════════════════════

# false = running locally (uses mock mode, no real K8s needed)
# true  = running inside a Kubernetes cluster (production)
K8S_IN_CLUSTER=false

# Path to your kubeconfig file (ignored when K8S_IN_CLUSTER=true)
K8S_KUBECONFIG_PATH=~/.kube/config

# Prefix for Kubernetes namespace names (don't change this)
LAB_NAMESPACE_PREFIX=cloudarena

# How many hours before a lab automatically expires and gets deleted
LAB_EXPIRY_HOURS=2


# ═══════════════════════════════════════════════
# CORS (Cross-Origin Resource Sharing)
# ═══════════════════════════════════════════════

# Which websites are allowed to call the backend API?
# Comma-separated list of allowed origins (no spaces!)
# For local dev, include both Vite dev server and Docker frontend:
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:80


# ═══════════════════════════════════════════════
# FIRST ADMIN USER (auto-created on startup)
# ═══════════════════════════════════════════════

# The first admin account — created automatically when you first run the app
FIRST_ADMIN_EMAIL=admin@cloudarena.io
FIRST_ADMIN_PASSWORD=Admin@123456
```

### 5.3 — Generate a secure SECRET_KEY

Run this command to get a cryptographically safe random key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Example output:
```
a3f8c2d1e9b4f7a2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4
```

Copy that output and paste it as the value of `SECRET_KEY` in your `.env` file.

---

## 🐳 STEP 6: Run Everything Locally (Docker Compose)

Docker Compose reads `docker-compose.yml` and starts all services with ONE command.

### 6.1 — What Docker Compose starts

| Service | What it does | Port |
|---|---|---|
| `postgres` | PostgreSQL database | 5432 |
| `backend` | FastAPI Python server | 8000 |
| `frontend` | React website via NGINX | 80 |
| `migrate` | Runs DB migrations then exits | — |

### 6.2 — Start all services

```bash
# Make sure you are in the root of the project:
cd d:\Downloads\CloudArena

# Start everything in the background (-d = detached mode)
docker compose up -d

# You should see output like:
# ✔ Container cloudarena-postgres   Started
# ✔ Container cloudarena-migrate    Started
# ✔ Container cloudarena-backend    Started
# ✔ Container cloudarena-frontend   Started
```

> ⏳ **First time only:** Docker downloads the images (ubuntu, postgres, python, node, nginx). This takes 3–10 minutes depending on your internet speed. Subsequent starts take ~5 seconds.

### 6.3 — Check that everything started

```bash
docker compose ps
```

Expected output (all should say "running"):
```
NAME                    STATUS          PORTS
cloudarena-postgres     running         0.0.0.0:5432->5432/tcp
cloudarena-backend      running         0.0.0.0:8000->8000/tcp
cloudarena-frontend     running         0.0.0.0:80->80/tcp
```

### 6.4 — See the logs (optional)

```bash
# See all logs in real time
docker compose logs -f

# See only backend logs
docker compose logs -f backend

# See only database logs
docker compose logs -f postgres

# Press Ctrl+C to stop watching logs
```

---

## 📊 STEP 7: Run Database Migrations

Migrations are scripts that **create your database tables** (users, labs, audit_logs).
Alembic is the tool that manages them.

### 7.1 — What migration `001_initial.py` does

It creates these 3 tables in PostgreSQL:

```
┌─────────────────────────────┐
│         users               │
├─────────────────────────────┤
│ id          (auto number)   │
│ username    (text, unique)  │
│ email       (text, unique)  │
│ password_hash (text)        │
│ role        (user/admin)    │
│ created_at  (timestamp)     │
└─────────────────────────────┘

┌─────────────────────────────┐
│          labs               │
├─────────────────────────────┤
│ id              (number)    │
│ user_id         (→ users)   │
│ lab_type        (linux/git/docker) │
│ namespace_name  (text)      │
│ deployment_name (text)      │
│ service_name    (text)      │
│ status          (running/expired/deleted) │
│ expires_at      (timestamp) │
│ created_at      (timestamp) │
└─────────────────────────────┘

┌─────────────────────────────┐
│        audit_logs           │
├─────────────────────────────┤
│ id        (number)          │
│ user_id   (→ users)         │
│ action    (text)            │
│ details   (text)            │
│ timestamp (timestamp)       │
└─────────────────────────────┘
```

### 7.2 — Run the migration

```bash
# Run migrations INSIDE the running backend container
docker compose exec backend alembic upgrade head
```

What this does:
- `docker compose exec backend` → run a command inside the backend container
- `alembic upgrade head` → apply all pending migrations (create all tables)

Expected output:
```
INFO  [alembic.runtime.migration] Context impl PostgreSQLImpl.
INFO  [alembic.runtime.migration] Will assume transact DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial schema -- users, labs, audit_logs
```

### 7.3 — Verify tables were created

```bash
# Connect to the database inside the postgres container
docker compose exec postgres psql -U cloudarena -d cloudarena

# List all tables
\dt

# You should see:
#  Schema |    Name    | Type  |   Owner
# --------+------------+-------+------------
#  public | audit_logs | table | cloudarena
#  public | labs       | table | cloudarena
#  public | users      | table | cloudarena

# Describe the users table
\d users

# Exit
\q
```

---

## ✅ STEP 8: Verify Everything is Working

### 8.1 — Open the website

Open your browser and go to:
```
http://localhost:80
```
You should see the CloudArena login page.

### 8.2 — Open the API documentation

```
http://localhost:8000/api/docs
```
You should see the **Swagger UI** — an interactive API explorer.

### 8.3 — Test the health check

```bash
curl http://localhost:8000/api/v1/health
# Expected response:
# {"status":"ok","service":"cloudarena-backend"}
```

### 8.4 — Create your first account

1. Go to `http://localhost:80`
2. Click **"Create account"**
3. Fill in:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test@12345`
4. Click **"Create Account"**
5. You should be redirected to the Dashboard

### 8.5 — Test creating a lab

1. From the Dashboard, click **"New Lab"**
2. Select **Linux Lab** (click the card)
3. Click **"Launch Lab"**
4. You should be redirected to the **Lab Details Page**.
5. Wait for the pod status to become "Ready", then click **"Open Terminal"**.
   (In local mock mode, a mock terminal will open since there is no real K8s cluster)

### 8.6 — Check the database directly

```bash
docker compose exec postgres psql -U cloudarena -d cloudarena

# See all users
SELECT id, username, email, role, created_at FROM users;

# See all labs
SELECT id, user_id, lab_type, status, expires_at FROM labs;

# Exit
\q
```

---

## 📤 STEP 9: Push Your Code to GitHub

Every time you make changes, push them to GitHub.

```bash
# See what files changed
git status

# Stage all changes
git add .

# OR stage specific files only:
git add backend/app/main.py
git add frontend/src/pages/DashboardPage.tsx

# Save a snapshot with a description
git commit -m "Add lab creation feature"

# Upload to GitHub
git push origin main
```

### 9.1 — What NEVER goes to GitHub

The `.gitignore` file already excludes sensitive files:
- `backend/.env` ← **Your secret keys — NEVER push this**
- `node_modules/` ← Auto-installed, too large
- `__pycache__/` ← Auto-generated Python files

---

## 🐳 STEP 10: Set Up Docker Hub (Image Registry)

Docker Hub stores your Docker images online so Kubernetes can pull them.

### 10.1 — Create a Docker Hub account

```
https://hub.docker.com/signup
```
Choose a username (e.g., `johndoe`). Remember it — you'll use it everywhere.

### 10.2 — Create two repositories on Docker Hub

1. Go to https://hub.docker.com
2. Click **"Create Repository"**
3. Create: `cloudarena-backend` (set to Public or Private)
4. Create another: `cloudarena-frontend`

### 10.3 — Create a Docker Hub access token

1. Docker Hub → click your avatar (top right) → **Account Settings**
2. Click **Security** → **New Access Token**
3. Description: `github-actions`
4. Permissions: **Read, Write, Delete**
5. Click **Generate** → **Copy the token** (you won't see it again!)

### 10.4 — Build and push images manually (first time)

```bash
# Log in to Docker Hub
docker login
# Enter your Docker Hub username and the access token as password

# Go to project root
cd d:\Downloads\CloudArena

# Build and tag backend image
# Replace 'johndoe' with YOUR Docker Hub username
docker build -t johndoe/cloudarena-backend:latest ./backend

# Push backend to Docker Hub
docker push johndoe/cloudarena-backend:latest

# Build and tag frontend image
docker build -t johndoe/cloudarena-frontend:latest ./frontend

# Push frontend to Docker Hub
docker push johndoe/cloudarena-frontend:latest
```

### 10.5 — Update the Kubernetes deployment files

Open `k8s/backend/deployment.yaml` and change line 22:
```yaml
# BEFORE:
image: YOUR_DOCKERHUB_USERNAME/cloudarena-backend:latest

# AFTER (use your actual username):
image: johndoe/cloudarena-backend:latest
```

Open `k8s/frontend/deployment.yaml` and change line 18:
```yaml
# BEFORE:
image: YOUR_DOCKERHUB_USERNAME/cloudarena-frontend:latest

# AFTER:
image: johndoe/cloudarena-frontend:latest
```

Commit and push:
```bash
git add k8s/
git commit -m "Set Docker Hub image names"
git push origin main
```

---

## ☁️ STEP 11: Set Up Minikube (Kubernetes Cluster)

Minikube is a tool that makes it easy to run Kubernetes locally. It runs a single-node Kubernetes cluster inside a Virtual Machine or Docker container on your laptop.

### 11.1 — Start the Minikube Cluster

```bash
minikube start --cpus=4 --memory=8192
```

Wait a few minutes. Minikube will download the necessary images and start the cluster.

### 11.2 — Enable Ingress Addon

CloudArena uses NGINX Ingress Controller to route traffic. Enable it in Minikube:

```bash
minikube addons enable ingress
```

### 11.3 — Connect kubectl to Minikube

Minikube automatically configures `kubectl` for you during start, but you can verify it:

```bash
kubectl get nodes
# Should list 1 node named "minikube" with status "Ready"
```

### 11.6 — Install NGINX Ingress Controller

NGINX handles incoming web traffic and routes it to the right service.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/aws/deploy.yaml

# Wait for it to get an external IP (takes 2-3 minutes)
kubectl get svc -n ingress-nginx ingress-nginx-controller -w

# When you see an EXTERNAL-IP like: a1b2c3d4.us-east-1.elb.amazonaws.com
# Press Ctrl+C
```

---

## ⚓ STEP 12: Deploy to Kubernetes Manually

### 12.1 — Set up Kubernetes Secrets

Secrets store sensitive values (passwords, keys) inside Kubernetes.
Values must be **base64-encoded**.

```bash
# Encode your real values:

# Encode SECRET_KEY (replace with your actual key):
echo -n "your-actual-secret-key-min-32-chars-here" | base64
# Example output: eW91ci1hY3R1YWwtc2VjcmV0LWtleS1taW4tMzItY2hhcnMtaGVyZQ==

# Encode DATABASE_URL:
echo -n "postgresql+asyncpg://cloudarena:cloudarena_pass@postgres:5432/cloudarena" | base64
# Output: paste this into the YAML below

# Encode SYNC_DATABASE_URL:
echo -n "postgresql://cloudarena:cloudarena_pass@postgres:5432/cloudarena" | base64
```

Open `k8s/secrets/app-secrets.yaml` and replace the base64 values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudarena-secrets
  namespace: cloudarena
type: Opaque
data:
  SECRET_KEY: <paste your base64 encoded SECRET_KEY here>
  DATABASE_URL: <paste your base64 encoded DATABASE_URL here>
  SYNC_DATABASE_URL: <paste your base64 encoded SYNC_DATABASE_URL here>
```

Also create a PostgreSQL password secret:

```bash
# Create postgres-secret directly (easier than editing YAML)
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD=cloudarena_pass \
  --namespace cloudarena \
  --dry-run=client -o yaml > k8s/secrets/postgres-secret.yaml

# Apply it later in step 12.3
```

### 12.2 — Update domain in Ingress

Open `k8s/ingress/ingress.yaml` and replace `cloudarena.yourdomain.com` with your actual domain (or the ELB DNS name from Step 11.6):

```yaml
spec:
  rules:
    - host: a1b2c3d4.us-east-1.elb.amazonaws.com   # ← paste your ELB DNS here
```

Also remove the `tls:` section if you don't have a domain/certificate yet.

### 12.3 — Apply everything to Kubernetes

Run these commands IN ORDER:

```bash
# 1. Create the platform namespace (like a folder for all our resources)
kubectl apply -f k8s/namespace.yaml

# 2. Create configuration (non-secret app settings)
kubectl apply -f k8s/configmap/

# 3. Create secrets (passwords, keys)
kubectl apply -f k8s/secrets/

# 4. Create RBAC (permissions — lets backend create/delete pods)
kubectl apply -f k8s/rbac/

# 5. Deploy PostgreSQL database
kubectl apply -f k8s/postgres/

# Wait for PostgreSQL to be ready
kubectl rollout status deployment/cloudarena-postgres -n cloudarena

# 6. Run database migrations
kubectl exec -it deployment/cloudarena-postgres -n cloudarena -- \
  psql -U cloudarena -d cloudarena -c "\dt"
# Should show nothing yet (empty DB, tables created by backend migrations)

# 7. Deploy the backend
kubectl apply -f k8s/backend/
kubectl rollout status deployment/cloudarena-backend -n cloudarena

# 8. Run migrations inside the backend pod
kubectl exec -it deployment/cloudarena-backend -n cloudarena -- \
  alembic upgrade head

# 9. Deploy the frontend
kubectl apply -f k8s/frontend/
kubectl rollout status deployment/cloudarena-frontend -n cloudarena

# 10. Apply ingress (traffic routing)
kubectl apply -f k8s/ingress/

# 11. Apply CronJob (auto-delete expired labs every 15 min)
kubectl apply -f k8s/cronjob/
```

### 12.4 — Check everything is running

```bash
# See all pods (should all be "Running")
kubectl get pods -n cloudarena

# Expected:
# NAME                                    READY   STATUS    RESTARTS
# cloudarena-backend-xxxx-yyyy            1/1     Running   0
# cloudarena-frontend-xxxx-yyyy           1/1     Running   0
# cloudarena-postgres-xxxx-yyyy           1/1     Running   0

# See services
kubectl get svc -n cloudarena

# See ingress (should show your domain/ELB)
kubectl get ingress -n cloudarena
```

---

## 🤖 STEP 13: Set Up GitHub Actions (Auto CI/CD)

After this setup, every push to `main` automatically:
1. Runs linting and tests
2. Builds Docker images
3. Pushes to Docker Hub
4. Deploys to Kubernetes

### 13.1 — Get your kubeconfig as base64

```bash
# Run this on your local machine (after kubectl is configured for Minikube):
cat ~/.kube/config | base64 -w 0
# Windows PowerShell:
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("$HOME\.kube\config"))

# Copy the entire output (it will be very long)
```

### 13.2 — Add secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each:

| Secret Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username (e.g., `johndoe`) |
| `DOCKERHUB_TOKEN` | The access token you created in Step 10.3 |
| `KUBE_CONFIG` | The base64 kubeconfig from Step 13.1 |

### 13.3 — Test the pipeline

```bash
# Make a small change to trigger the pipeline
echo "# Trigger CI" >> README.md
git add README.md
git commit -m "Trigger CI pipeline test"
git push origin main
```

Watch the pipeline run:
1. Go to your GitHub repo
2. Click **Actions** tab
3. Click on the running workflow
4. Watch each step complete ✅

### 13.4 — What each workflow file does

**`ci.yml`** — runs on every push and pull request:
```
Step 1: Checkout code from GitHub
Step 2: Install Python + dependencies
Step 3: Run ruff (Python linter — catches code errors)
Step 4: Run pytest (backend tests)
Step 5: Install Node + npm packages
Step 6: Run eslint (JavaScript linter)
Step 7: Run npm run build (compiles React app)
Step 8: Build backend Docker image (doesn't push — just validates it builds)
Step 9: Build frontend Docker image (doesn't push)
```

**`deploy.yml`** — runs only on push to `main`:
```
Step 1: Checkout code
Step 2: Log in to Docker Hub using secrets
Step 3: Build backend image → push to Docker Hub with version tag
Step 4: Build frontend image → push to Docker Hub with version tag
Step 5: Set up kubectl using KUBE_CONFIG secret
Step 6: kubectl apply all YAML manifests
Step 7: kubectl set image → update deployment with new image tag
Step 8: kubectl rollout status → wait until new pods are healthy
Step 9: Print all pods (verify deployment)
```

---

## 🔍 STEP 14: Verify Production Deployment

```bash
# 1. Check health endpoint
curl http://YOUR_ELB_DNS/api/v1/health
# Expected: {"status":"ok","service":"cloudarena-backend"}

# 2. Check readiness (tests DB connection)
curl http://YOUR_ELB_DNS/api/v1/ready
# Expected: {"status":"ready","database":"connected"}

# 3. Open the website
# http://YOUR_ELB_DNS

# 4. View pod logs in real time
kubectl logs -l app=cloudarena-backend -n cloudarena -f

# 5. Check CronJob will run
kubectl get cronjob -n cloudarena
# NAME                  SCHEDULE      SUSPEND   ACTIVE
# lab-cleanup-cronjob   */15 * * * *  False     0

# 6. Check database has tables
kubectl exec -it deployment/cloudarena-postgres -n cloudarena -- \
  psql -U cloudarena -d cloudarena -c "\dt"

# 7. Check users were created (after registering)
kubectl exec -it deployment/cloudarena-postgres -n cloudarena -- \
  psql -U cloudarena -d cloudarena -c "SELECT id, username, email, role FROM users;"
```

---

## 🔧 STEP 15: Troubleshooting Common Errors

### ❌ "Connection refused" on port 8000

**Cause:** Backend container crashed.
```bash
docker compose logs backend
# Look for the error message

# Common fixes:
# 1. Check DATABASE_URL in .env is correct
# 2. Make sure postgres is running: docker compose ps
# 3. Restart backend: docker compose restart backend
```

### ❌ "alembic: command not found"

**Cause:** Not running inside the container.
```bash
# WRONG:
alembic upgrade head

# CORRECT:
docker compose exec backend alembic upgrade head
```

### ❌ Database connection error: "password authentication failed"

**Cause:** Wrong username/password in DATABASE_URL.

Check your `.env` file:
```ini
DATABASE_URL=postgresql+asyncpg://cloudarena:cloudarena_pass@localhost:5432/cloudarena
#                                 ^^^^^^^^^^  ^^^^^^^^^^^^^^
#                                 username    password
```
These must match exactly what you set when creating the PostgreSQL user.

### ❌ "relation 'users' does not exist"

**Cause:** Migrations haven't been run yet.
```bash
docker compose exec backend alembic upgrade head
```

### ❌ Docker image push fails: "unauthorized"

**Cause:** Not logged in to Docker Hub.
```bash
docker login
# Enter your Docker Hub username
# Enter your access token (NOT your account password)
```

### ❌ kubectl: "Unable to connect to the server"

**Cause:** kubeconfig not set up or Minikube is not running.
```bash
# Ensure Minikube is running:
minikube status

# If stopped, start it:
minikube start

# Verify:
kubectl get nodes
```

### ❌ Pod stuck in "ImagePullBackOff"

**Cause:** Kubernetes can't pull the Docker image.
```bash
# See the error:
kubectl describe pod <pod-name> -n cloudarena

# Common fixes:
# 1. Make sure image name in YAML is correct (your Docker Hub username)
# 2. If image is private, create a K8s docker registry secret:
kubectl create secret docker-registry dockerhub-secret \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_ACCESS_TOKEN \
  --docker-email=YOUR_EMAIL \
  --namespace cloudarena

# Then add to deployment YAML under spec.template.spec:
# imagePullSecrets:
#   - name: dockerhub-secret
```

### ❌ GitHub Actions deploy fails: "error: no objects passed to apply"

**Cause:** KUBE_CONFIG secret not set or corrupted.
```bash
# Re-generate and re-add the secret:
cat ~/.kube/config | base64 -w 0
# Copy output → GitHub → Settings → Secrets → KUBE_CONFIG → Update
```

---

## 📋 QUICK REFERENCE CHEAT SHEET

### Daily Local Development

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# Restart one service
docker compose restart backend

# See all logs
docker compose logs -f

# Open database
docker compose exec postgres psql -U cloudarena -d cloudarena
```

### Git Workflow

```bash
git status                          # What changed?
git add .                           # Stage all
git commit -m "Describe change"     # Save snapshot
git push origin main                # Push to GitHub → triggers CI/CD
```

### Kubernetes

```bash
kubectl get pods -n cloudarena              # See all pods
kubectl get svc -n cloudarena               # See all services
kubectl logs -l app=cloudarena-backend -n cloudarena -f  # Live backend logs
kubectl exec -it deployment/cloudarena-backend -n cloudarena -- bash  # SSH into pod
kubectl rollout restart deployment/cloudarena-backend -n cloudarena   # Force redeploy
```

### Database

```bash
# Connect locally
docker compose exec postgres psql -U cloudarena -d cloudarena

# Connect on K8s
kubectl exec -it deployment/cloudarena-postgres -n cloudarena -- psql -U cloudarena -d cloudarena

# Useful SQL commands inside psql:
\dt                                    # List all tables
\d users                               # Describe users table
SELECT * FROM users;                   # See all users
SELECT * FROM labs WHERE status='running';  # See active labs
\q                                     # Exit
```

---

## 🎯 FULL DEPLOYMENT CHECKLIST

Use this checklist every time you deploy a new version:

- [ ] Code changes committed and pushed to GitHub
- [ ] CI pipeline passes (green ✅ in GitHub Actions)
- [ ] Docker Hub images updated (check Docker Hub repository)
- [ ] Kubernetes pods all show "Running"
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Can log in on the live website
- [ ] Can create a lab successfully
- [ ] CronJob is active (`kubectl get cronjob -n cloudarena`)
- [ ] Database has expected data (`SELECT COUNT(*) FROM users;`)

---

> 🎉 **Congratulations!** You now have a fully deployed, production-ready cloud-native platform.
> From git push → automated CI/CD → Docker Hub → Kubernetes → live website.
