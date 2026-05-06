# Code Generation Plan — Unit 2: Backend Core (Auth + Users)
## TMS (Project KALAM)

**Unit**: Backend Core — Express server, auth routes, user routes, JWT, security middleware  
**Stories**: US-AUTH-01, US-AUTH-02, US-AUTH-03, US-AUTH-04  
**Dependencies**: Unit 1 (Prisma schema, shared types, env config)

---

## Execution Checklist

### Step 1: Express App & Server Entry
- [x] Create `backend/src/app.ts` (Express app factory: helmet, cors, rate-limit, json parser, requestId, logger, static /uploads, health check, routes, error handler)
- [x] Create `backend/src/index.ts` (HTTP server, Prisma connect, Socket.io init placeholder, graceful shutdown)

### Step 2: Security Middleware
- [x] Create `backend/src/middleware/requestId.ts` (attach uuid to req.requestId)
- [x] Create `backend/src/middleware/logger.ts` (log request method, path, status, duration, requestId)
- [x] Create `backend/src/middleware/rateLimiter.ts` (authRateLimiter: 10/15min; globalRateLimiter: 100/min)
- [x] Create `backend/src/middleware/errorHandler.ts` (global error handler: log server-side, return generic message to client, handle AppError subclasses)
- [x] Create `backend/src/middleware/validate.ts` (zodValidate middleware factory)

### Step 3: Auth Service
- [x] Create `backend/src/services/auth.service.ts` (generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken, generateTokenPair, revokeToken)
- [x] Create `backend/src/services/loginAttempt.service.ts` (LoginAttemptTracker class: isLocked, recordFailure, reset, cleanup; setInterval cleanup every 30min)

### Step 4: Auth Middleware
- [x] Create `backend/src/middleware/auth.ts` (authMiddleware: extract Bearer token, verify, attach req.user)
- [x] Create `backend/src/middleware/roleGuard.ts` (roleGuard(roles[]): check req.user.role)

### Step 5: Auth Routes & Controller
- [x] Create `backend/src/routes/auth.routes.ts` (POST /register, /login, /refresh, /logout, GET /me)
- [x] Create `backend/src/controllers/auth.controller.ts` (register, login, refresh, logout, getMe handlers)

### Step 6: User Service
- [x] Create `backend/src/services/user.service.ts` (getAllUsers, getUserById, updateStatus, updateSupervisor, getUserTasks, getDescendantIds, canAssign)
- [x] Create `backend/src/services/workload.service.ts` (calculateWorkload: openTasks / maxCapacity * 100, clamped to [0,100], colorTier)

### Step 7: User Routes & Controller
- [x] Create `backend/src/routes/user.routes.ts` (GET /, GET /:id, PATCH /:id/status, PATCH /:id/supervisor, GET /:id/tasks, GET /:id/workload)
- [x] Create `backend/src/controllers/user.controller.ts` (all user handlers)

### Step 8: Zod Validation Schemas
- [x] Create `backend/src/schemas/auth.schemas.ts` (RegisterSchema, LoginSchema, RefreshTokenSchema)
- [x] Create `backend/src/schemas/user.schemas.ts` (UpdateStatusSchema, UpdateSupervisorSchema, UserListQuerySchema)

### Step 9: Unit Tests (Backend)
- [x] Create `backend/src/services/__tests__/auth.service.test.ts` (example-based: token generation, verification, rotation; PBT: JWT round-trip, bcrypt invariant, workload range)
- [x] Create `backend/src/services/__tests__/workload.service.test.ts` (example-based: all roles; PBT: percentage always in [0,100])
- [x] Create `backend/src/services/__tests__/user.service.test.ts` (example-based: hierarchy traversal, canAssign; PBT: deterministic canAssign)

### Step 10: Documentation
- [x] Create `aidlc-docs/construction/unit-2-backend-core/code/unit-2-summary.md`

---

## Story Coverage
- US-AUTH-01: register handler
- US-AUTH-02: login handler, brute-force protection
- US-AUTH-03: PATCH /users/:id/role (Admin only)
- US-AUTH-04: PATCH /users/:id/status + Socket.io emit

