# Business Logic Model — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 implements the complete backend foundation: the Express server with all security middleware, the authentication system (JWT rotation, bcrypt, brute-force protection), and the user management API (CRUD, hierarchy, workload, availability). All subsequent backend units build on top of the middleware stack and patterns established here.

---

## 2. Express Server Setup

### 2.1 Application Factory Pattern

The Express app is created in a factory function (`createApp()`) separate from the server startup. This enables testing without starting a real HTTP server.

```typescript
// backend/src/app.ts
export function createApp(): express.Application {
  const app = express();
  
  // Middleware stack (order is critical — see NFR Design)
  app.use(helmet(helmetConfig));
  app.use(cors(corsConfig));
  app.use(globalRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);
  
  // Static files
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));
  
  // Health check (no auth)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // API routes
  app.use('/api/auth', authRateLimiter, authRouter);
  app.use('/api/users', authMiddleware, userRouter);
  
  // Global error handler (must be last)
  app.use(globalErrorHandler);
  
  return app;
}
```

```typescript
// backend/src/index.ts
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

async function main(): Promise<void> {
  // Validate environment
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  
  // Verify database connection
  await prisma.$connect();
  logger.info('[Startup] Database connected');
  
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`[Startup] Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

main().catch((error: unknown) => {
  logger.error('[Startup] Fatal error:', error);
  process.exit(1);
});
```

---

## 3. Authentication Flow

### 3.1 Registration Flow

```
POST /api/auth/register
      │
      ▼
1. Zod validation: { name, email, password }
      │
      ├── Validation fails → 400 Bad Request { error, details }
      │
      ▼
2. Check email uniqueness: prisma.user.findUnique({ where: { email } })
      │
      ├── Email exists → 409 Conflict { error: 'Email already registered' }
      │
      ▼
3. Hash password: bcrypt.hash(password, 12)
      │
      ▼
4. Create user: prisma.user.create({ data: { name, email, password: hash, role: 'JUNIOR_MEMBER' } })
      │
      ▼
5. Issue token pair: generateTokenPair(user)
      │
      ▼
6. Store refresh token hash: prisma.refreshToken.create(...)
      │
      ▼
7. Return 201: { user: SafeUser, accessToken, refreshToken }
```

**Registration rules**:
- New users always receive `JUNIOR_MEMBER` role (Admin assigns roles separately)
- `availabilityStatus` defaults to `OFFLINE`
- No email verification required (accounts active immediately)
- Password must be minimum 8 characters (Zod validation)

### 3.2 Login Flow

```
POST /api/auth/login
      │
      ▼
1. Zod validation: { email, password }
      │
      ├── Validation fails → 400 Bad Request
      │
      ▼
2. Check brute-force lock: loginAttemptTracker.isLocked(email)
      │
      ├── Locked → 429 Too Many Requests { error: 'Account temporarily locked', retryAfter: seconds }
      │
      ▼
3. Find user: prisma.user.findUnique({ where: { email } })
      │
      ├── Not found → increment attempt counter → 401 Unauthorized { error: 'Invalid credentials' }
      │
      ▼
4. Verify password: bcrypt.compare(password, user.password)
      │
      ├── Wrong password → increment attempt counter → 401 Unauthorized { error: 'Invalid credentials' }
      │
      ▼
5. Reset attempt counter: loginAttemptTracker.reset(email)
      │
      ▼
6. Issue token pair: generateTokenPair(user)
      │
      ▼
7. Store refresh token hash in DB
      │
      ▼
8. Update user availability to AVAILABLE (optional, can be done separately)
      │
      ▼
9. Return 200: { user: SafeUser, accessToken, refreshToken }
```

**Generic error message**: Steps 3 and 4 both return the same error message (`'Invalid credentials'`) to prevent user enumeration attacks.

### 3.3 Token Refresh Flow

```
POST /api/auth/refresh
Body: { refreshToken: string }
      │
      ▼
1. Zod validation: { refreshToken }
      │
      ▼
2. Verify JWT signature: jwt.verify(refreshToken, JWT_REFRESH_SECRET)
      │
      ├── Invalid signature → 401 Unauthorized
      ├── Expired → 401 Unauthorized
      │
      ▼
3. Hash the token: sha256(refreshToken)
      │
      ▼
4. Find token in DB: prisma.refreshToken.findUnique({ where: { tokenHash } })
      │
      ├── Not found → 401 Unauthorized (token was never issued or already deleted)
      ├── revokedAt is set → 401 Unauthorized (token was revoked — possible replay attack)
      ├── expiresAt < now → 401 Unauthorized (expired in DB)
      │
      ▼
5. Revoke old token: prisma.refreshToken.update({ where: { id }, data: { revokedAt: now } })
      │
      ▼
6. Find user: prisma.user.findUnique({ where: { id: payload.sub } })
      │
      ├── User not found → 401 Unauthorized
      │
      ▼
7. Issue new token pair: generateTokenPair(user)
      │
      ▼
8. Store new refresh token hash in DB
      │
      ▼
9. Return 200: { accessToken, refreshToken }
```

**Rotation invariant**: Each refresh token can only be used once. After use, it is revoked and a new pair is issued. If a revoked token is presented, it indicates a possible token theft — the server revokes all tokens for that user (future enhancement).

### 3.4 Logout Flow

```
POST /api/auth/logout
Headers: Authorization: Bearer <accessToken>
Body: { refreshToken: string }
      │
      ▼
1. authMiddleware: verify access token, attach req.user
      │
      ▼
2. Hash the refresh token
      │
      ▼
3. Revoke refresh token: prisma.refreshToken.updateMany({
     where: { userId: req.user.id, tokenHash: hash },
     data: { revokedAt: now }
   })
      │
      ▼
4. Update user availability to OFFLINE
      │
      ▼
5. Return 200: { message: 'Logged out successfully' }
```

### 3.5 Get Current User (Me)

```
GET /api/auth/me
Headers: Authorization: Bearer <accessToken>
      │
      ▼
1. authMiddleware: verify access token, attach req.user
      │
      ▼
2. Fetch full user: prisma.user.findUnique({ where: { id: req.user.id } })
      │
      ▼
3. Return 200: { user: SafeUser }
```

---

## 4. JWT Strategy

### 4.1 Token Structure

**Access Token** (short-lived):
```typescript
interface AccessTokenPayload {
  sub: string;    // userId
  email: string;
  role: Role;
  iat: number;    // issued at (Unix timestamp)
  exp: number;    // expiry (Unix timestamp, iat + 15 minutes)
  type: 'access';
}
```

**Refresh Token** (long-lived):
```typescript
interface RefreshTokenPayload {
  sub: string;    // userId
  iat: number;
  exp: number;    // iat + 7 days
  type: 'refresh';
  jti: string;    // unique token ID (uuid v4)
}
```

### 4.2 Token Generation

```typescript
// backend/src/services/auth.service.ts

import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { env } from '../config/env';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function generateAccessToken(user: { id: string; email: string; role: Role }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: randomUUID() },
    env.JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function generateTokenPair(
  user: { id: string; email: string; role: Role }
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);
  
  // Store hashed refresh token in DB
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });
  
  return { accessToken, refreshToken };
}
```

### 4.3 Token Verification

```typescript
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
```

---

## 5. Brute-Force Protection

### 5.1 In-Memory Tracker

```typescript
// backend/src/services/loginAttempt.service.ts

interface AttemptRecord {
  count: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class LoginAttemptTracker {
  private readonly attempts = new Map<string, AttemptRecord>();

  isLocked(email: string): boolean {
    const record = this.attempts.get(email.toLowerCase());
    if (!record?.lockedUntil) return false;
    if (record.lockedUntil > new Date()) return true;
    // Lock expired — clean up
    this.attempts.delete(email.toLowerCase());
    return false;
  }

  getRemainingLockSeconds(email: string): number {
    const record = this.attempts.get(email.toLowerCase());
    if (!record?.lockedUntil) return 0;
    return Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
  }

  recordFailure(email: string): void {
    const key = email.toLowerCase();
    const existing = this.attempts.get(key);
    const count = (existing?.count ?? 0) + 1;
    
    this.attempts.set(key, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
        : null,
      lastAttempt: new Date(),
    });
  }

  reset(email: string): void {
    this.attempts.delete(email.toLowerCase());
  }

  // Cleanup stale records (call periodically)
  cleanup(): void {
    const now = new Date();
    for (const [key, record] of this.attempts.entries()) {
      const staleThreshold = 30 * 60 * 1000; // 30 minutes
      if (record.lastAttempt.getTime() + staleThreshold < now.getTime()) {
        this.attempts.delete(key);
      }
    }
  }
}

export const loginAttemptTracker = new LoginAttemptTracker();

// Cleanup every 30 minutes
setInterval(() => loginAttemptTracker.cleanup(), 30 * 60 * 1000);
```

**Limitation**: The in-memory tracker resets on server restart. This is acceptable for MVP. For production, replace with Redis-backed storage.

---

## 6. User Management Logic

### 6.1 User List

```
GET /api/users
Query: { role?, supervisorId?, page?, pageSize? }
      │
      ▼
1. authMiddleware: verify token
      │
      ▼
2. Build Prisma where clause from query params
      │
      ▼
3. Fetch users with workload data:
   prisma.user.findMany({
     where: filters,
     include: { _count: { select: { tasksReceived: { where: { status: { in: OPEN_STATUSES } } } } } },
     skip: (page - 1) * pageSize,
     take: pageSize,
     orderBy: { name: 'asc' }
   })
      │
      ▼
4. Calculate workload for each user
      │
      ▼
5. Return 200: PaginatedResponse<UserWithWorkload>
```

### 6.2 Update Availability Status

```
PATCH /api/users/:id/status
Body: { availabilityStatus: AvailabilityStatus }
      │
      ▼
1. authMiddleware + ownership check (user can only update own status, Admin can update any)
      │
      ▼
2. Zod validation: { availabilityStatus }
      │
      ▼
3. Update: prisma.user.update({ where: { id }, data: { availabilityStatus } })
      │
      ▼
4. Emit Socket.io event: io.emit('user:status-change', { userId: id, availabilityStatus })
      │
      ▼
5. Return 200: { user: SafeUser }
```

### 6.3 Update Supervisor (Hierarchy Restructure)

```
PATCH /api/users/:id/supervisor
Body: { supervisorId: string | null }
      │
      ▼
1. authMiddleware + roleGuard(['ADMIN', 'TEAM_LEADER'])
      │
      ▼
2. Permission check:
   - ADMIN: can change any user's supervisor
   - TEAM_LEADER: can only change supervisors within own subtree
      │
      ▼
3. Circular reference check: ensure new supervisorId is not a descendant of userId
      │
      ▼
4. Update: prisma.user.update({ where: { id }, data: { supervisorId } })
      │
      ▼
5. Return 200: { user: SafeUser }
```

### 6.4 Get User Tasks

```
GET /api/users/:id/tasks
Query: { status?, priority?, page?, pageSize? }
      │
      ▼
1. authMiddleware
      │
      ▼
2. Scope check: user can only see own tasks unless Admin/TL
      │
      ▼
3. Fetch tasks: prisma.task.findMany({ where: { assignedToId: id, ...filters } })
      │
      ▼
4. Return 200: PaginatedResponse<TaskWithRelations>
```

### 6.5 Get User Workload

```
GET /api/users/:id/workload
      │
      ▼
1. authMiddleware
      │
      ▼
2. workloadService.calculateWorkload(id)
      │
      ▼
3. Return 200: WorkloadDto
```

---

## 7. Workload Calculation Algorithm

```typescript
// backend/src/services/workload.service.ts

import { Role, WorkloadDto } from '@tms/shared';

const MAX_CAPACITY: Record<Role, number> = {
  ADMIN: 20,
  TEAM_LEADER: 15,
  TEAM_MEMBER: 10,
  JUNIOR_MEMBER: 7,
};

const OPEN_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW'] as const;

export async function calculateWorkload(userId: string): Promise<WorkloadDto> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      _count: {
        select: {
          tasksReceived: {
            where: { status: { in: OPEN_STATUSES } },
          },
        },
      },
    },
  });

  const openTasks = user._count.tasksReceived;
  const maxCapacity = MAX_CAPACITY[user.role];
  const rawPercentage = (openTasks / maxCapacity) * 100;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  const colorTier: WorkloadDto['colorTier'] =
    percentage <= 40 ? 'green' :
    percentage <= 70 ? 'amber' :
    'red';

  return { userId, openTasks, maxCapacity, percentage, colorTier };
}
```

**Invariant**: `percentage` is always in `[0, 100]` regardless of input. The `Math.min(100, Math.max(0, ...))` clamp ensures this even if `openTasks > maxCapacity`.

---

## 8. Hierarchy Traversal Algorithm

Used to validate assignment permissions and org chart restructuring.

```typescript
// backend/src/services/user.service.ts

/**
 * Returns all descendant user IDs for a given user (BFS traversal).
 * Used to validate: "can assignerId assign to assigneeId?"
 */
export async function getDescendantIds(userId: string): Promise<string[]> {
  const descendants: string[] = [];
  const queue: string[] = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { supervisorId: currentId },
      select: { id: true },
    });
    
    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

/**
 * Validates whether assignerId has permission to assign a task to assigneeId.
 */
export async function canAssign(assignerId: string, assigneeId: string): Promise<boolean> {
  const assigner = await prisma.user.findUniqueOrThrow({
    where: { id: assignerId },
    select: { role: true },
  });

  // ADMIN can assign to anyone
  if (assigner.role === 'ADMIN') return true;

  // JUNIOR_MEMBER cannot assign
  if (assigner.role === 'JUNIOR_MEMBER') return false;

  // TL and TM can assign to their descendants
  const descendants = await getDescendantIds(assignerId);
  return descendants.includes(assigneeId);
}
```

---

## 9. Testable Properties (PBT-01)

### 9.1 Round-Trip: JWT Encode → Decode = Original Payload (PBT-02)

```typescript
// Property: for any valid user payload, encoding then decoding returns the same payload
fc.assert(
  fc.property(
    fc.record({
      id: fc.string({ minLength: 1 }),
      email: fc.emailAddress(),
      role: fc.constantFrom('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    }),
    (user) => {
      const token = generateAccessToken(user);
      const decoded = verifyAccessToken(token);
      return decoded.sub === user.id && decoded.role === user.role;
    }
  )
);
```

### 9.2 Invariant: Workload Percentage Always in [0, 100] (PBT-03)

```typescript
// Property: for any non-negative openTasks and any role, percentage is in [0, 100]
fc.assert(
  fc.property(
    fc.nat({ max: 1000 }),  // openTasks: 0 to 1000
    fc.constantFrom('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    (openTasks, role) => {
      const maxCapacity = MAX_CAPACITY[role];
      const percentage = Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
      return percentage >= 0 && percentage <= 100;
    }
  )
);
```

### 9.3 Invariant: bcrypt Hash Always Verifies (PBT-03)

```typescript
// Property: for any password string, bcrypt.hash then bcrypt.compare returns true
fc.assert(
  fc.asyncProperty(
    fc.string({ minLength: 1, maxLength: 72 }),  // bcrypt max is 72 bytes
    async (password) => {
      const hash = await bcrypt.hash(password, 10);  // cost 10 for test speed
      return await bcrypt.compare(password, hash);
    }
  )
);
```

### 9.4 Idempotent: Revoking an Already-Revoked Token is Safe (PBT-04)

```typescript
// Property: revoking a token twice does not throw and leaves the token revoked
// (tested at service layer with test database)
fc.assert(
  fc.asyncProperty(
    fc.string({ minLength: 10 }),  // arbitrary token hash
    async (tokenHash) => {
      // First revocation
      await revokeToken(tokenHash);
      // Second revocation (idempotent)
      await revokeToken(tokenHash);
      // Token should still be revoked
      const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      return token === null || token.revokedAt !== null;
    }
  )
);
```

### 9.5 Invariant: Hierarchy Traversal Returns Consistent Subtree (PBT-03)

```typescript
// Property: getDescendantIds returns the same set regardless of traversal order
// (deterministic for a given tree structure)
fc.assert(
  fc.asyncProperty(
    fc.string({ minLength: 1 }),  // userId
    async (userId) => {
      const result1 = await getDescendantIds(userId);
      const result2 = await getDescendantIds(userId);
      // Same elements, possibly different order
      return (
        result1.length === result2.length &&
        result1.every((id) => result2.includes(id))
      );
    }
  )
);
```
