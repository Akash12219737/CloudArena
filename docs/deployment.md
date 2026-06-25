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

## 3. AWS EKS — Manual Cluster Setup

> Infrastructure is provisioned manually via the AWS Console or AWS CLI. No IaC tooling is required.

### Step 1 — Create VPC

```bash
# Using AWS CLI (or use the Console)
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region us-east-1

# Create public subnets (for load balancer)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create private subnets (for EKS nodes)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.101.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.102.0/24 --availability-zone us-east-1b

# Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id <VPC_ID> --internet-gateway-id <IGW_ID>

# NAT Gateway (in each public subnet for private subnet egress)
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id <PUBLIC_SUBNET_ID> --allocation-id <EIP_ALLOC_ID>
```

### Step 2 — Create IAM Roles

**EKS Cluster Role:**
```bash
# Create role with eks.amazonaws.com trust policy
aws iam create-role \
  --role-name cloudarena-eks-cluster-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"eks.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy \
  --role-name cloudarena-eks-cluster-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

**EKS Node Group Role:**
```bash
aws iam create-role \
  --role-name cloudarena-eks-node-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

for policy in AmazonEKSWorkerNodePolicy AmazonEKS_CNI_Policy AmazonEC2ContainerRegistryReadOnly; do
  aws iam attach-role-policy \
    --role-name cloudarena-eks-node-role \
    --policy-arn "arn:aws:iam::aws:policy/$policy"
done
```

### Step 3 — Create EKS Cluster

```bash
aws eks create-cluster \
  --name cloudarena-eks \
  --role-arn arn:aws:iam::<ACCOUNT_ID>:role/cloudarena-eks-cluster-role \
  --resources-vpc-config subnetIds=<PRIVATE_SUBNET_1>,<PRIVATE_SUBNET_2>,securityGroupIds=<SG_ID> \
  --kubernetes-version 1.30 \
  --region us-east-1

# Wait for cluster to become ACTIVE (~10 min)
aws eks wait cluster-active --name cloudarena-eks --region us-east-1
```

### Step 4 — Add Node Group

```bash
aws eks create-nodegroup \
  --cluster-name cloudarena-eks \
  --nodegroup-name cloudarena-nodes \
  --node-role arn:aws:iam::<ACCOUNT_ID>:role/cloudarena-eks-node-role \
  --subnets <PRIVATE_SUBNET_1> <PRIVATE_SUBNET_2> \
  --instance-types t3.medium \
  --scaling-config minSize=1,maxSize=5,desiredSize=2 \
  --region us-east-1

# Wait for nodes
aws eks wait nodegroup-active \
  --cluster-name cloudarena-eks \
  --nodegroup-name cloudarena-nodes \
  --region us-east-1
```

### Step 5 — Configure kubectl

```bash
aws eks update-kubeconfig \
  --name cloudarena-eks \
  --region us-east-1

# Verify
kubectl get nodes
```

### Step 6 — Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/aws/deploy.yaml

# Wait for LoadBalancer to be assigned
kubectl get svc -n ingress-nginx ingress-nginx-controller -w
```

### Step 7 — Deploy CloudArena

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

### Step 8 — DNS Setup

1. Get the Load Balancer DNS from:
   ```bash
   kubectl get svc -n ingress-nginx ingress-nginx-controller
   ```
2. In your DNS provider, create a **CNAME** record:
   - `cloudarena.yourdomain.com` → `<ALB-DNS-NAME>`
3. Update `k8s/ingress/ingress.yaml` with your domain.
4. (Optional) Install cert-manager for automatic TLS:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.5/cert-manager.yaml
   ```

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
| `KUBE_CONFIG` | `cat ~/.kube/config \| base64 -w 0` (run after step 5 above) |

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
