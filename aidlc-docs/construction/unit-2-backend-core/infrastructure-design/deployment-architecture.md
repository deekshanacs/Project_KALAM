# Deployment Architecture — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 deployment architecture defines how the Express backend is deployed to Railway or Render, including the start command, health check, environment variable management, and CORS configuration for production.

---

## 2. Production Deployment: Railway

### 2.1 Service Configuration

Railway detects Node.js projects automatically via `package.json`. The service is configured via `railway.toml` at the workspace root.

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build --workspace=backend && npx prisma generate --schema=backend/prisma/schema.prisma"

[deploy]
startCommand = "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
numReplicas = 1
```

### 2.2 Railway Environment Variables

Set in the Railway dashboard under the service's "Variables" tab:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Auto-injected by Railway PostgreSQL add-on | Format: `postgresql://...?sslmode=require` |
| `JWT_SECRET` | Generated 64-char hex string | Generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Generated 64-char hex string (different) | Must differ from JWT_SECRET |
| `PORT` | Auto-injected by Railway | Typically 8080 |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Exact Vercel URL, no trailing slash |
| `UPLOAD_DIR` | `/app/uploads` | Absolute path on Railway container |
| `ANTHROPIC_API_KEY` | Your production API key | Set in Railway secrets |

### 2.3 Railway PostgreSQL Add-on

1. In Railway dashboard: Add → Database → PostgreSQL
2. Railway automatically injects `DATABASE_URL` into the service
3. The URL includes `?sslmode=require` — Prisma handles SSL automatically
4. Free tier: 500MB storage, 1 connection limit (set `?connection_limit=3` in URL)

---

## 3. Production Deployment: Render

### 3.1 Service Configuration

```yaml
# render.yaml (at workspace root)
services:
  - type: web
    name: tms-backend
    env: node
    region: oregon
    plan: free
    buildCommand: npm ci && npm run build --workspace=backend && npx prisma generate --schema=backend/prisma/schema.prisma
    startCommand: npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js
    healthCheckPath: /health
    autoDeploy: true
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
      - key: UPLOAD_DIR
        value: /opt/render/project/src/uploads
      - key: ANTHROPIC_API_KEY
        sync: false  # Set manually in Render dashboard

databases:
  - name: tms-postgres
    databaseName: tms_prod
    user: tms_user
    plan: free
    region: oregon
```

---

## 4. Start Command Breakdown

```bash
npx prisma migrate deploy --schema=backend/prisma/schema.prisma \
  && node backend/dist/index.js
```

| Step | Command | Purpose |
|---|---|---|
| 1 | `npm ci` (build step) | Install exact dependencies from lock file |
| 2 | `npm run build --workspace=backend` | Compile TypeScript to `backend/dist/` |
| 3 | `npx prisma generate` | Generate Prisma client |
| 4 | `npx prisma migrate deploy` | Apply pending DB migrations |
| 5 | `node backend/dist/index.js` | Start the server |

Steps 1–3 run during the build phase. Steps 4–5 run at startup.

**Why `migrate deploy` at startup (not build)?**
- The database is not available during the build phase
- Migrations must run against the actual production database
- If migration fails, the deployment fails before the server starts (safe)

---

## 5. Health Check Endpoint

### 5.1 Implementation

```typescript
// backend/src/app.ts
app.get('/health', async (_req, res) => {
  try {
    // Verify database is reachable
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});
```

### 5.2 Health Check Behavior

| Scenario | Response | HTTP Status |
|---|---|---|
| Server running, DB connected | `{ status: 'ok' }` | 200 |
| Server running, DB unreachable | `{ status: 'error' }` | 503 |
| Server starting up | No response | Timeout |

Railway and Render wait for the health check to return 200 before routing traffic to the new instance.

---

## 6. Environment Variable Management

### 6.1 Secret Generation Commands

```bash
# Generate JWT_SECRET (32 random bytes = 64 hex chars)
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET (must be different)
openssl rand -hex 32
```

### 6.2 Environment Variable Validation

The backend validates all required variables on startup (via `config/env.ts`). If any required variable is missing, the process exits with code 1 and logs the missing variable name.

```
[Config] Missing required environment variable: JWT_SECRET
Please copy .env.example to .env and fill in the required values.
```

### 6.3 CORS_ORIGIN in Production

The `CORS_ORIGIN` must match the exact Vercel deployment URL:
- No trailing slash: `https://tms-app.vercel.app` ✓
- No wildcard: `https://*.vercel.app` ✗ (not supported)
- No HTTP in production: `http://tms-app.vercel.app` ✗

If the Vercel URL changes (e.g., custom domain), `CORS_ORIGIN` must be updated in Railway/Render.

---

## 7. Deployment Flow

```
Developer pushes to main branch
      │
      ▼
Railway/Render detects push (webhook)
      │
      ▼
Build phase:
  npm ci
  npm run build --workspace=backend
  npx prisma generate
      │
      ▼
New container starts:
  npx prisma migrate deploy
      │
      ├── No pending migrations → continue
      ├── Pending migrations → apply → continue
      └── Migration fails → deployment fails → old container stays up
      │
      ▼
node backend/dist/index.js
      │
      ▼
Health check: GET /health
      │
      ├── 200 OK → traffic switches to new container
      └── Timeout/error → deployment fails → old container stays up
      │
      ▼
Old container stops (graceful shutdown)
```

---

## 8. Monitoring and Observability

### 8.1 Logs

Railway and Render both provide log streaming in their dashboards. Winston outputs structured JSON in production, which is searchable in the log viewer.

**Key log events to monitor**:
- `[Startup] Server listening` — confirms successful startup
- `[Startup] Database connection established` — confirms DB connectivity
- `REQUEST_COMPLETED` with `statusCode >= 500` — server errors
- `REVOKED_TOKEN_USED` — possible security incident
- `[Cleanup] Deleted N expired/revoked refresh tokens` — routine maintenance

### 8.2 Alerts

Configure Railway/Render alerts for:
- Service restart (indicates crash)
- Health check failure
- Memory usage > 80%
- Response time > 1000ms (p95)

---

## 9. Deployment Checklist (Unit 2)

- [ ] `backend/dist/` is in `.gitignore` (compiled output not committed)
- [ ] `railway.toml` or `render.yaml` committed to source control
- [ ] All environment variables set in Railway/Render dashboard
- [ ] `CORS_ORIGIN` set to exact Vercel URL
- [ ] `DATABASE_URL` injected from managed PostgreSQL add-on
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are different values
- [ ] Health check endpoint returns 200 before deployment completes
- [ ] `npx prisma migrate deploy` runs successfully on first deploy
- [ ] Seed script NOT run in production (production guard in seed.ts)
- [ ] `NODE_ENV=production` set in production environment
