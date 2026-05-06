# Domain Entities — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 introduces runtime entities that are not persisted in the database but are critical to the auth and user management layer: the refresh token tracking model, the login attempt tracker, the workload DTO, and all request/response DTOs for auth and user endpoints.

---

## 2. User Entity (Auth Layer View)

The User entity is defined in Unit 1 (Prisma schema + shared types). Unit 2 adds the auth-layer perspective: what fields are safe to return in API responses, and what the JWT payload looks like.

### 2.1 SafeUser (API Response Type)

The `password` field is never returned in API responses. The service layer strips it before returning.

```typescript
// backend/src/types/auth.types.ts

import { User, Role } from '@tms/shared';

// User without password — safe to return in API responses
export type SafeUser = Omit<User, never> & {
  // password is excluded at the service layer, not via TypeScript omit
  // because the Prisma User type includes password
};

// The actual safe user shape returned by API
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  availabilityStatus: string;
  avatarUrl: string | null;
  supervisorId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 JWT Payload Types

```typescript
export interface AccessTokenPayload {
  sub: string;      // userId
  email: string;
  role: Role;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;      // userId
  type: 'refresh';
  jti: string;      // unique token ID (uuid v4)
  iat: number;
  exp: number;
}

// Attached to Express Request by authMiddleware
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
```

---

## 3. RefreshToken Entity

### 3.1 Prisma Model (defined in Unit 1, used in Unit 2)

```prisma
model RefreshToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique    // SHA-256 hash of the raw JWT string
  userId    String
  expiresAt DateTime
  revokedAt DateTime?            // null = active; set = revoked

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())

  @@map("refresh_tokens")
}
```

### 3.2 Token Lifecycle States

| State | Condition | Description |
|---|---|---|
| Active | `revokedAt IS NULL AND expiresAt > NOW()` | Valid, can be used for refresh |
| Revoked | `revokedAt IS NOT NULL` | Explicitly revoked (logout or rotation) |
| Expired | `expiresAt <= NOW()` | Past 7-day window, cannot be used |
| Used | `revokedAt IS NOT NULL` | After rotation, old token is revoked |

### 3.3 Token Storage Strategy

The raw JWT string is never stored. Only the SHA-256 hash is stored:

```typescript
import { createHash } from 'crypto';

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
```

This means even if the database is compromised, the attacker cannot use the stored hashes to forge tokens (SHA-256 is one-way).

### 3.4 Cleanup Strategy

Expired and revoked tokens accumulate in the database. A cleanup job should run periodically:

```typescript
// Run daily (or on startup)
async function cleanupExpiredTokens(): Promise<void> {
  const deleted = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });
  logger.info(`[Cleanup] Deleted ${deleted.count} expired/revoked refresh tokens`);
}
```

---

## 4. LoginAttempt Tracking Entity

### 4.1 In-Memory Structure

Not persisted in the database. Lives in the `LoginAttemptTracker` class instance.

```typescript
// backend/src/services/loginAttempt.service.ts

interface AttemptRecord {
  count: number;           // number of failed attempts since last reset
  lockedUntil: Date | null; // null = not locked; Date = locked until this time
  lastAttempt: Date;       // timestamp of last attempt (for cleanup)
}

// Map key: lowercase email address
type AttemptMap = Map<string, AttemptRecord>;
```

### 4.2 State Transitions

```
Initial state: no record in map
      │
      ▼ (failed login attempt)
{ count: 1, lockedUntil: null, lastAttempt: now }
      │
      ▼ (4 more failed attempts)
{ count: 5, lockedUntil: now + 15min, lastAttempt: now }
      │
      ├── (attempt while locked) → reject with 429
      │
      ▼ (15 minutes pass)
Lock expires → record deleted on next check
      │
      ▼ (successful login at any point)
Record deleted (reset)
```

### 4.3 TypeScript Interface

```typescript
export interface LoginAttemptService {
  isLocked(email: string): boolean;
  getRemainingLockSeconds(email: string): number;
  recordFailure(email: string): void;
  reset(email: string): void;
  cleanup(): void;
}
```

---

## 5. WorkloadDto

### 5.1 Definition

```typescript
// In @tms/shared
export interface WorkloadDto {
  userId: string;
  openTasks: number;                    // count of TODO + IN_PROGRESS + REVIEW tasks
  maxCapacity: number;                  // role-based maximum
  percentage: number;                   // 0-100, rounded integer
  colorTier: 'green' | 'amber' | 'red'; // visual indicator
}

export const MAX_CAPACITY: Record<Role, number> = {
  ADMIN: 20,
  TEAM_LEADER: 15,
  TEAM_MEMBER: 10,
  JUNIOR_MEMBER: 7,
};
```

### 5.2 Color Tier Thresholds

| Tier | Range | Meaning |
|---|---|---|
| `green` | 0–40% | Capacity available |
| `amber` | 41–70% | Approaching capacity |
| `red` | 71–100% | At or near capacity |

### 5.3 Extended Workload Response

```typescript
export interface UserWithWorkload extends ApiUser {
  workload: WorkloadDto;
}
```

---

## 6. Request/Response DTOs

### 6.1 Auth DTOs

```typescript
// backend/src/schemas/auth.schemas.ts (Zod schemas)
import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// TypeScript types inferred from Zod schemas
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type LogoutDto = z.infer<typeof LogoutSchema>;
```

```typescript
// Response DTOs
export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: ApiUser;
}
```

### 6.2 User DTOs

```typescript
// backend/src/schemas/user.schemas.ts

export const UpdateStatusSchema = z.object({
  availabilityStatus: z.enum(['AVAILABLE', 'IN_CALL', 'AWAY', 'OFFLINE']),
});

export const UpdateSupervisorSchema = z.object({
  supervisorId: z.string().cuid().nullable(),
});

export const UserListQuerySchema = z.object({
  role: z.enum(['ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER']).optional(),
  supervisorId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const UserTasksQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
export type UpdateSupervisorDto = z.infer<typeof UpdateSupervisorSchema>;
export type UserListQueryDto = z.infer<typeof UserListQuerySchema>;
export type UserTasksQueryDto = z.infer<typeof UserTasksQuerySchema>;
```

```typescript
// Response DTOs
export interface UserListResponse {
  data: UserWithWorkload[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserResponse {
  user: ApiUser;
}

export interface UserWorkloadResponse {
  workload: WorkloadDto;
}
```

---

## 7. Error Types

### 7.1 Custom Error Classes

```typescript
// backend/src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(429, message, 'TOO_MANY_REQUESTS');
  }
}
```

### 7.2 Error Response Shape

```typescript
// Consistent error response format
export interface ErrorResponse {
  error: string;        // human-readable message (generic for auth errors)
  code?: string;        // machine-readable error code
  details?: unknown;    // validation details (only for 400 errors)
  retryAfter?: number;  // seconds until retry allowed (only for 429)
}
```

---

## 8. Middleware Types

### 8.1 authMiddleware Output

After `authMiddleware` runs, `req.user` is populated:

```typescript
// backend/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
      requestId?: string;
    }
  }
}
```

### 8.2 roleGuard Input

```typescript
// Usage: roleGuard(['ADMIN', 'TEAM_LEADER'])
export type AllowedRoles = Role[];

export function roleGuard(allowedRoles: AllowedRoles): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
```
