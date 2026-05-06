# Deployment Architecture — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 1 deployment architecture defines the target environments for the TMS system. While Unit 1 itself produces no deployable application (only schema and configuration), the deployment architecture must be defined here so all subsequent units are built with the correct deployment targets in mind.

---

## 2. Environment Overview

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local Development | Vite dev server (port 5173) | ts-node/tsx (port 4000) | Docker Compose or local PostgreSQL |
| Production | Vercel (static SPA) | Railway or Render (Node.js service) | Railway/Render managed PostgreSQL |

---

## 3. Local Development Architecture

### 3.1 Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd tms

# 2. Install all dependencies (workspace root)
npm install

# 3. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Start PostgreSQL
docker compose up -d postgres

# 5. Run database migrations
npm run db:migrate

# 6. Seed database
npm run seed

# 7. Start backend (terminal 1)
npm run dev:backend

# 8. Start frontend (terminal 2)
npm run dev:frontend
```

### 3.2 Local Port Assignments

| Service | Port | URL |
|---|---|---|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Express) | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | postgresql://localhost:5432/tms_dev |
| Prisma Studio | 5555 | http://localhost:5555 |

### 3.3 Development Scripts

```json
// Root package.json scripts
{
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspaces --if-present",
    "seed": "npm run seed --workspace=backend",
    "db:migrate": "npm run db:migrate --workspace=backend",
    "db:generate": "npm run db:generate --workspace=backend",
    "db:studio": "npm run db:studio --workspace=backend",
    "db:reset": "npm run db:reset --workspace=backend",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
```

```json
// backend/package.json scripts
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "seed": "npx prisma db seed",
    "db:migrate": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio",
    "db:reset": "npx prisma migrate reset",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

```json
// frontend/package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## 4. Production Architecture

### 4.1 Frontend: Vercel

**Deployment type**: Static SPA (Single Page Application)

**Build configuration** (`vercel.json` at frontend root or workspace root):
```json
{
  "buildCommand": "npm run build --workspace=frontend",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Environment variables on Vercel**:
```
VITE_API_URL=https://your-backend.railway.app
VITE_SOCKET_URL=https://your-backend.railway.app
```

**Notes**:
- Vercel automatically handles CDN distribution and HTTPS
- The SPA rewrite rule ensures React Router handles all routes
- Build output is the compiled `frontend/dist/` directory

### 4.2 Backend: Railway or Render

**Deployment type**: Node.js service (long-running process)

**Start command**:
```bash
npm run build --workspace=backend && npx prisma migrate deploy --schema=backend/prisma/schema.prisma && npm start --workspace=backend
```

Or as a single script in `backend/package.json`:
```json
{
  "scripts": {
    "start:prod": "node dist/index.js",
    "deploy": "npm run build && npx prisma migrate deploy && npm run start:prod"
  }
}
```

**Railway configuration** (`railway.toml` at workspace root):
```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build --workspace=backend && npx prisma generate --schema=backend/prisma/schema.prisma"

[deploy]
startCommand = "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && npm run start --workspace=backend"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

**Render configuration** (`render.yaml` at workspace root):
```yaml
services:
  - type: web
    name: tms-backend
    env: node
    buildCommand: npm ci && npm run build --workspace=backend && npx prisma generate --schema=backend/prisma/schema.prisma
    startCommand: npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: tms-postgres
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://your-app.vercel.app
      - key: PORT
        value: 10000

databases:
  - name: tms-postgres
    databaseName: tms_prod
    user: tms_user
    plan: free
```

### 4.3 Database: Managed PostgreSQL

**Railway**: PostgreSQL add-on is provisioned automatically. `DATABASE_URL` is injected as an environment variable.

**Render**: PostgreSQL service defined in `render.yaml`. Connection string is referenced via `fromDatabase`.

**Production database settings**:
- SSL: Required (enforced by Railway/Render)
- Connection string includes `?sslmode=require`
- Prisma handles SSL automatically when `sslmode=require` is in the URL

---

## 5. Environment Variable Management

### 5.1 Per-Environment Variable Matrix

| Variable | Local Dev | Production |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/tms_dev` | Injected by Railway/Render |
| `JWT_SECRET` | Any 32+ char string | Generated secret (Railway/Render) |
| `JWT_REFRESH_SECRET` | Any 32+ char string (different) | Generated secret (Railway/Render) |
| `PORT` | `4000` | Injected by Railway/Render (typically 8080 or 10000) |
| `NODE_ENV` | `development` | `production` |
| `CORS_ORIGIN` | `http://localhost:5173` | `https://your-app.vercel.app` |
| `UPLOAD_DIR` | `./uploads` | `/app/uploads` |
| `ANTHROPIC_API_KEY` | Your dev API key | Production API key |

### 5.2 Secret Rotation

- JWT secrets should be rotated periodically in production
- Rotating `JWT_SECRET` invalidates all active access tokens (users must re-login)
- Rotating `JWT_REFRESH_SECRET` invalidates all refresh tokens (users must re-login)
- Plan a maintenance window for secret rotation

---

## 6. Prisma Migrate Deploy on Production Startup

### 6.1 Why `migrate deploy` (not `migrate dev`)

| Command | Use Case | Behavior |
|---|---|---|
| `prisma migrate dev` | Development only | Creates new migrations, resets if needed |
| `prisma migrate deploy` | Production | Applies pending migrations only, never resets |

`migrate deploy` is safe for production because:
- It never drops or resets the database
- It applies only migrations that haven't been applied yet
- It fails if there are unapplied migrations that conflict with the current schema

### 6.2 Migration Deployment Flow

```
Deploy triggered
      │
      ▼
npm run build (compile TypeScript)
      │
      ▼
npx prisma generate (regenerate client)
      │
      ▼
npx prisma migrate deploy (apply pending migrations)
      │
      ├── No pending migrations → continue
      ├── Pending migrations → apply each in order → continue
      └── Migration fails → deployment fails (rollback)
      │
      ▼
node dist/index.js (start server)
```

### 6.3 Zero-Downtime Considerations

For MVP, Railway/Render performs a rolling restart:
1. New instance starts (runs migrations)
2. Health check passes (`GET /health` returns 200)
3. Traffic switches to new instance
4. Old instance stops

This means migrations must be backward-compatible with the previous version of the application (additive changes only — no column renames or drops in a single deployment).

---

## 7. Health Check Endpoint

Defined in Unit 2, but specified here as a deployment requirement:

```
GET /health
Response: 200 OK
Body: { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

Railway and Render use this endpoint to determine if the service is healthy before routing traffic.

---

## 8. Deployment Checklist (Unit 1)

- [ ] `package-lock.json` committed to source control
- [ ] All `package.json` files use exact version pinning
- [ ] `backend/.env.example` documents all required variables
- [ ] `frontend/.env.example` documents all required variables
- [ ] `.gitignore` excludes `.env` files and `uploads/` contents
- [ ] `uploads/.gitkeep` committed to track the directory
- [ ] `docker-compose.yml` committed for local development
- [ ] `railway.toml` or `render.yaml` committed for production deployment
- [ ] Prisma initial migration created and committed
- [ ] `tsconfig.base.json` with strict mode committed
- [ ] All packages compile without TypeScript errors
