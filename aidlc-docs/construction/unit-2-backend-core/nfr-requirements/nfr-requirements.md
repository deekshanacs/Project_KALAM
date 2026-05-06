# NFR Requirements — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 NFR requirements cover the security, performance, scalability, and reliability requirements for the authentication and user management layer. This unit has the highest security requirements in the entire system because it controls access to all other resources.

---

## 2. Performance Requirements

### 2.1 Response Time Targets

| Endpoint | Target | Notes |
|---|---|---|
| `POST /api/auth/login` | < 200ms | Includes bcrypt comparison (~100ms at cost 12) |
| `POST /api/auth/register` | < 400ms | Includes bcrypt hashing (~300ms at cost 12) |
| `POST /api/auth/refresh` | < 100ms | DB lookup + JWT operations |
| `POST /api/auth/logout` | < 100ms | DB update only |
| `GET /api/auth/me` | < 50ms | Single DB lookup |
| `GET /api/users` | < 300ms | List with workload calculation |
| `GET /api/users/:id` | < 50ms | Single user lookup |
| `PATCH /api/users/:id/status` | < 100ms | Update + Socket.io emit |
| `PATCH /api/users/:id/supervisor` | < 200ms | Update + hierarchy validation |
| `GET /api/users/:id/workload` | < 100ms | Aggregation query |
| `GET /api/users/:id/tasks` | < 300ms | Paginated task list |

**Note**: Login performance is dominated by bcrypt. Cost factor 12 takes ~100–300ms depending on hardware. This is intentional — it makes brute-force attacks computationally expensive.

### 2.2 Throughput Targets

| Scenario | Target |
|---|---|
| Concurrent login requests | 10 req/s (limited by bcrypt) |
| Concurrent token refresh requests | 100 req/s |
| Concurrent user list requests | 50 req/s |

### 2.3 Database Query Performance

| Query | Target |
|---|---|
| `findUnique` by email (login) | < 10ms |
| `findUnique` by token hash (refresh) | < 10ms |
| `findMany` users with workload | < 50ms |
| Hierarchy traversal (BFS) | < 100ms for 10-level tree |

---

## 3. Security Requirements

### 3.1 SECURITY-04: HTTP Security Headers (helmet.js)

**Requirement**: All HTTP responses must include security headers set by `helmet.js`.

**Required headers**:
| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | Configured per environment | Prevents XSS |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `0` (disabled, rely on CSP) | Modern browsers use CSP |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer info |
| `Permissions-Policy` | Restrictive defaults | Limits browser features |

**Implementation**:
```typescript
import helmet from 'helmet';

const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", env.CORS_ORIGIN],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

app.use(helmet(helmetConfig));
```

### 3.2 SECURITY-05: Zod Validation on All Endpoints

**Requirement**: Every API endpoint must validate its request body, query parameters, and route parameters using Zod schemas before processing.

**Rules**:
- Request body: validated with `zodValidate(schema)` middleware
- Query parameters: validated with `zodValidate(schema, 'query')` middleware
- Route parameters: validated with `zodValidate(schema, 'params')` middleware
- Validation failure returns HTTP 400 with structured error details
- Zod errors are formatted into a human-readable array before returning

**Validation middleware**:
```typescript
export function zodValidate<T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ValidationError('Validation failed', result.error.flatten()));
    }
    req[source] = result.data;
    next();
  };
}
```

### 3.3 SECURITY-08: authMiddleware + roleGuard on All Protected Routes

**Requirement**: All routes except `/health`, `/api/auth/register`, `/api/auth/login`, and `/api/auth/refresh` must be protected by `authMiddleware`. Routes with role restrictions must additionally use `roleGuard`.

**Protected route matrix**:
| Route | Auth Required | Role Required |
|---|---|---|
| `GET /api/auth/me` | Yes | Any authenticated |
| `POST /api/auth/logout` | Yes | Any authenticated |
| `GET /api/users` | Yes | Any authenticated |
| `GET /api/users/:id` | Yes | Any authenticated |
| `PATCH /api/users/:id/status` | Yes | Own user or ADMIN |
| `PATCH /api/users/:id/supervisor` | Yes | ADMIN or TEAM_LEADER |
| `GET /api/users/:id/tasks` | Yes | Any authenticated |
| `GET /api/users/:id/workload` | Yes | Any authenticated |

**authMiddleware implementation**:
```typescript
export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization header'));
  }
  
  const token = authHeader.slice(7);
  
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    // Fail-closed: any error → 401
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
```

### 3.4 SECURITY-11: Rate Limiting on Auth Routes

**Requirement**: Auth routes must have stricter rate limiting than general API routes.

| Route Group | Limit | Window | Response |
|---|---|---|---|
| `/api/auth/*` | 10 requests | 15 minutes | 429 with `Retry-After` header |
| All other `/api/*` | 100 requests | 1 minute | 429 with `Retry-After` header |

**Implementation**:
```typescript
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => req.ip ?? 'unknown',
});

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
```

### 3.5 SECURITY-12: bcrypt Cost 12, Refresh Token Rotation, Brute-Force Protection

**Requirement**: Three security controls must be implemented together:

1. **bcrypt cost 12**: `bcrypt.hash(password, 12)` — approximately 300ms on modern hardware
2. **Refresh token rotation**: Every use of a refresh token issues a new pair and revokes the old token
3. **Brute-force protection**: 5 failures → 15-minute lockout per email

All three are implemented in `auth.service.ts` and `loginAttempt.service.ts`.

### 3.6 SECURITY-15: Global Error Handler, Fail-Closed on Auth Errors

**Requirement**: A global error handler must catch all unhandled errors. Auth errors must fail closed (return 401 with a generic message, never expose internal details).

**Fail-closed rules**:
- Any JWT verification error → 401 `'Invalid or expired token'`
- Any database error during auth → 401 `'Authentication failed'`
- Any unexpected error in auth routes → 401 `'Authentication failed'`
- Stack traces must never appear in API responses
- Internal error details must be logged server-side only

**Global error handler**:
```typescript
export const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = req.requestId ?? 'unknown';
  
  // Log full error server-side
  logger.error({
    requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    path: req.path,
    method: req.method,
  });
  
  // Determine response
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error instanceof ValidationError && { details: error.details }),
      ...(error instanceof TooManyRequestsError && { retryAfter: error.retryAfter }),
    });
  }
  
  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
  }
  
  // Unknown errors — fail closed
  return res.status(500).json({ error: 'Internal server error' });
};
```

### 3.7 SECURITY-06: Parameterized Queries (Prisma)

**Requirement**: All database queries must use Prisma's query builder. No raw SQL string concatenation is permitted.

**Prohibited**:
```typescript
// WRONG: SQL injection risk
await prisma.$queryRaw`SELECT * FROM users WHERE email = '${email}'`;
```

**Required**:
```typescript
// CORRECT: Parameterized via Prisma
await prisma.user.findUnique({ where: { email } });
```

---

## 4. Scalability Requirements

### 4.1 Stateless JWT (Horizontally Scalable)

**Requirement**: The authentication system must be stateless — any backend instance can verify any access token without shared state.

**Implementation**: Access tokens are verified using the `JWT_SECRET` environment variable only. No database lookup is required for access token verification. This means multiple backend instances can run in parallel without a shared session store.

**Limitation**: Refresh tokens require a database lookup (to check revocation status). This is acceptable because refresh operations are infrequent (every 15 minutes per user).

### 4.2 Login Attempt Tracker Limitation

**Requirement**: Document that the in-memory login attempt tracker is not horizontally scalable.

**Current state**: The `LoginAttemptTracker` uses an in-memory `Map`. In a multi-instance deployment, each instance has its own tracker, so a user could bypass the lockout by hitting different instances.

**Future enhancement**: Replace with Redis-backed storage for multi-instance deployments. The `LoginAttemptService` interface is designed to be swappable.

---

## 5. Reliability Requirements

### 5.1 Structured Logging

**Requirement**: Every HTTP request must be logged with structured JSON including `requestId`, `method`, `path`, `statusCode`, and `duration`.

```typescript
// Log format
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "duration": 187,
  "userAgent": "Mozilla/5.0..."
}
```

**PII exclusion**: The log must never include passwords, tokens, or email addresses in the message body.

### 5.2 Request ID Tracking

**Requirement**: Every request must have a unique `requestId` (UUID v4) attached to it. The `requestId` must appear in:
- All log entries for that request
- The `X-Request-Id` response header
- Error responses (for support correlation)

### 5.3 Database Connection Resilience

**Requirement**: The backend must handle database connection failures gracefully:
- On startup: fail fast if database is unreachable
- During operation: Prisma's connection pool handles transient failures automatically
- On shutdown: `prisma.$disconnect()` must be called

---

## 6. Extension Compliance Summary

| Rule | Status | Implementation |
|---|---|---|
| SECURITY-01 (JWT 15min + 7d rotation) | Compliant | `generateTokenPair`, `verifyAccessToken`, `verifyRefreshToken` |
| SECURITY-02 (bcrypt cost ≥ 12) | Compliant | `bcrypt.hash(password, 12)` |
| SECURITY-03 (role enforcement server-side) | Compliant | `authMiddleware` + `roleGuard` on all protected routes |
| SECURITY-04 (HTTP security headers) | Compliant | `helmet(helmetConfig)` as first middleware |
| SECURITY-05 (Zod validation) | Compliant | `zodValidate` middleware on all endpoints |
| SECURITY-06 (parameterized queries) | Compliant | Prisma query builder only, no raw SQL |
| SECURITY-07 (CORS restricted) | Compliant | `cors({ origin: env.CORS_ORIGIN })` |
| SECURITY-08 (auth on protected routes) | Compliant | `authMiddleware` + `roleGuard` applied |
| SECURITY-09 (no secrets in code) | Compliant | All secrets from env vars |
| SECURITY-10 (dependency pinning) | Compliant | Exact versions in package.json |
| SECURITY-11 (rate limiting) | Compliant | `authRateLimiter` + `globalRateLimiter` |
| SECURITY-12 (brute-force protection) | Compliant | `LoginAttemptTracker` with 5-attempt lockout |
| SECURITY-13 (no PII in logs) | Compliant | Logger excludes passwords and tokens |
| SECURITY-14 (input sanitization) | Compliant | Zod schemas strip/transform input |
| SECURITY-15 (global error handler) | Compliant | `globalErrorHandler` with fail-closed auth errors |
| PBT-01 through PBT-05 | Compliant | Properties defined in business-rules.md |
| PBT-09 (fast-check) | Compliant | Inherited from Unit 1 |
