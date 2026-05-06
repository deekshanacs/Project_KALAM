# Code Generation Plan — Unit 1: Foundation
## TMS (Project KALAM)

**Unit**: Foundation — Monorepo, Prisma schema, shared types, seed data, env config  
**Stories**: Foundation for all epics  
**Dependencies**: None

---

## Execution Checklist

### Step 1: Root Workspace Setup
- [x] Create `package.json` (root, npm workspaces: backend, frontend, shared)
- [x] Create `tsconfig.base.json` (strict TypeScript config)
- [x] Create `.gitignore` (node_modules, dist, .env, uploads)
- [x] Create `.env.example` (root-level, documents all vars)

### Step 2: Shared Package
- [x] Create `shared/package.json` (`@tms/shared`, TypeScript only)
- [x] Create `shared/tsconfig.json` (extends tsconfig.base.json)
- [x] Create `shared/src/types/index.ts` (all enums + interfaces: User, Task, Message, Group, Document, Project, Comment, TimeLog, RefreshToken, WorkloadDto, DTOs, ApiResponse, PaginatedResponse)

### Step 3: Backend Package Scaffold
- [x] Create `backend/package.json` (`@tms/backend`, all backend dependencies pinned)
- [x] Create `backend/tsconfig.json` (extends tsconfig.base.json, paths for @tms/shared)
- [x] Create `backend/.env.example` (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY, PORT, UPLOAD_DIR, CORS_ORIGIN, NODE_ENV)

### Step 4: Prisma Schema
- [x] Create `backend/prisma/schema.prisma` (generator, datasource, all 6 enums, all 9 models: User, Task, Message, Group, GroupMember, Document, Project, RefreshToken, Comment, TimeLog)

### Step 5: Prisma Seed Script
- [x] Create `backend/prisma/seed.ts` (10 users with hierarchy, 12 tasks, 1 group + messages, 3 documents — all using upsert for idempotency)

### Step 6: Frontend Package Scaffold
- [x] Create `frontend/package.json` (`@tms/frontend`, all frontend dependencies pinned)
- [x] Create `frontend/tsconfig.json` (extends tsconfig.base.json, jsx: react-jsx, paths for @tms/shared)
- [x] Create `frontend/tsconfig.node.json` (for vite.config.ts)
- [x] Create `frontend/.env.example` (VITE_API_URL, VITE_SOCKET_URL)

### Step 7: Backend Source Skeleton
- [x] Create `backend/src/config/env.ts` (env var validation with Zod, fail-fast on missing vars)
- [x] Create `backend/src/lib/prisma.ts` (Prisma client singleton)
- [x] Create `backend/src/lib/logger.ts` (Winston structured logger)
- [x] Create `backend/src/lib/errors.ts` (AppError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, TooManyRequestsError)
- [x] Create `backend/src/types/express.d.ts` (augment Express Request with `user` and `requestId`)

### Step 8: Uploads Directory
- [x] Create `backend/uploads/.gitkeep` (ensures uploads dir is tracked but empty)

### Step 9: Documentation
- [x] Create `aidlc-docs/construction/unit-1-foundation/code/unit-1-summary.md` (list of all created files)

---

## Code Location
All application code: workspace root (`/backend`, `/frontend`, `/shared`)  
Documentation: `aidlc-docs/construction/unit-1-foundation/code/`

## Story Coverage
- Foundation for US-AUTH-01 through US-NOTIF-01 (all stories depend on this unit)

