# API Documentation

Base URL: `http://localhost:8000/api/v1`
Interactive docs: `http://localhost:8000/api/docs`

All protected endpoints require the `Authorization: Bearer <access_token>` header.

---

## Authentication

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "username": "devops_hero",
  "email": "hero@example.com",
  "password": "SecurePass123"
}
```

**Response 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "hero@example.com",
  "password": "SecurePass123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer"
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1..."
}
```

---

## Users

### Get Profile

```http
GET /users/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 42,
  "username": "devops_hero",
  "email": "hero@example.com",
  "role": "user",
  "created_at": "2026-01-15T10:30:00Z"
}
```

### Update Profile

```http
PATCH /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "new_username"
}
```

---

## Labs

### Create Lab

```http
POST /labs
Authorization: Bearer <token>
Content-Type: application/json

{
  "lab_type": "linux"
}
```

Valid `lab_type` values: `linux`, `git`, `docker`

**Response 201:**
```json
{
  "id": 7,
  "user_id": 42,
  "lab_type": "linux",
  "namespace_name": "ca-user-42-linux-7",
  "deployment_name": "linux-lab-user-42-linux-7",
  "service_name": "linux-svc-user-42-linux-7",
  "status": "running",
  "expires_at": "2026-01-15T12:30:00Z",
  "created_at": "2026-01-15T10:30:00Z"
}
```

**Error 429 — too many active labs:**
```json
{ "detail": "Maximum 3 active labs allowed per user" }
```

### List Labs

```http
GET /labs
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "labs": [ /* array of LabResponse */ ],
  "total": 5
}
```

### Get Lab Detail

```http
GET /labs/{lab_id}
Authorization: Bearer <token>
```

### Delete Lab

```http
DELETE /labs/{lab_id}
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "message": "Lab 7 deleted successfully" }
```

---

## Admin Endpoints (admin role only)

### List All Users

```http
GET /admin/users?skip=0&limit=100
Authorization: Bearer <admin_token>
```

### List Active Labs (all users)

```http
GET /admin/labs/active
Authorization: Bearer <admin_token>
```

### Force Delete Lab

```http
DELETE /admin/labs/{lab_id}
Authorization: Bearer <admin_token>
```

---

## System

### Health Check

```http
GET /health
```

**Response 200:**
```json
{ "status": "ok", "service": "cloudarena-backend" }
```

### Readiness Check

```http
GET /ready
```

**Response 200:** (when DB is connected)
```json
{ "status": "ready", "database": "connected" }
```

**Response 503:** (when DB is unreachable)
```json
{ "detail": "Database unavailable: ..." }
```

---

## Error Responses

All errors follow this format:

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Unauthenticated (missing or invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 422 | Unprocessable entity (Pydantic validation failed) |
| 429 | Too many requests (rate limit or lab limit) |
| 503 | Service unavailable (database down) |
