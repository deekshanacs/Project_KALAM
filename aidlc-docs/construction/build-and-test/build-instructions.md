# Build Instructions — TMS (Project KALAM)

## Prerequisites
- **Node.js**: 20 LTS (`node --version` should show v20.x)
- **npm**: 10+ (`npm --version`)
- **PostgreSQL**: 16+ running locally or via Docker
- **Git**: for cloning the repository

## Environment Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd tms
npm install
```
This installs all dependencies for all three workspaces (backend, frontend, shared) via npm workspaces.

### 2. Configure Environment Variables
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env — set VITE_API_URL=http://localhost:4000, VITE_SOCKET_URL=http://localhost:4000
```

### 3. Database Setup
```bash
# Start PostgreSQL (if using Docker)
docker run -d --name tms-postgres -e POSTGRES_DB=tms_dev -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Run migrations
npm run db:migrate

# Seed development data
npm run seed
```

## Build All Units

### Development Build (with watch)
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

### Production Build
```bash
npm run build --workspaces
```

**Expected output**:
- `backend/dist/` — compiled TypeScript
- `frontend/dist/` — Vite production bundle

### Type Check (no emit)
```bash
npm run type-check --workspaces
```
Expected: zero TypeScript errors.

## Build Artifacts
| Artifact | Location | Description |
|---|---|---|
| Backend compiled JS | `backend/dist/` | Node.js server |
| Frontend bundle | `frontend/dist/` | Static SPA files |
| Prisma client | `backend/node_modules/.prisma/` | Generated DB client |
| Shared types | `shared/dist/` | Compiled type declarations |

## Troubleshooting

### `Cannot find module '@tms/shared'`
Run `npm install` from the workspace root. npm workspaces creates symlinks automatically.

### `DATABASE_URL is required`
Ensure `backend/.env` exists and contains a valid `DATABASE_URL`.

### Prisma migration fails
Ensure PostgreSQL is running and `DATABASE_URL` points to an accessible database.

### Port 4000 already in use
Change `PORT` in `backend/.env` and update `VITE_API_URL` in `frontend/.env` accordingly.
