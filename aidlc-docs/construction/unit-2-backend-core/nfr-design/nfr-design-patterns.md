# NFR Design Patterns — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

This document defines the design patterns that implement the security, performance, and reliability NFRs for Unit 2. These patterns form the backbone of the backend security architecture.

---

## 2. Security Middleware Stack Order

### 2.1 Pattern Description

The order of middleware in Express is critical. Security middleware must run before any business logic. The correct order is:

```
Request arrives
      │
      ▼
1. helmet          ← Set security headers on ALL responses (first, always)
      │
      ▼
2. cors            ← Handle CORS preflight and headers
      │
      ▼
3. globalRateLimiter ← Apply global rate limit (before parsing body)
      │
      ▼
4. express.json()  ← Parse JSON body (after rate limit to avoid parsing DoS)
      │
      ▼
5. express.urlencoded() ← Parse form data
      │
      ▼
6. requestIdMiddleware ← Attach UUID to req.requestId
      │
      ▼
7. loggerMiddleware ← Log request start (has requestId)
      │
      ▼
8. Static files (/uploads) ← Serve files (no auth required)
      │
      ▼
9. Health check (/health) ← No auth required
      │
      ▼
10. authRateLimiter ← Applied only to /api/auth/* routes
      │
      ▼
11. Route handlers ← Business logic
      │
      ├── authMiddleware (on protected routes)
      ├── roleGuard (on role-restricted routes)
      ├── zodValidate (on all routes with input)
      └── Controller logic
      │
      ▼
12. globalErrorHandler ← Catch all errors (must be last, 4-arg signature)
```

### 2.2 Implementation

```typescript
// backend/src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import { loggerMiddleware } from './middleware/logger';
import { globalErrorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';

export function createApp(): express.Application {
  const app = express();

  // 1. Security headers (first)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", env.CORS_ORIGIN],
      },
    },
  }));

  // 2. CORS
  app.use(cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // 3. Global rate limit
  app.use(globalRateLimiter);

  // 4-5. Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Request ID
  app.use(requestIdMiddleware);

  // 7. Request logging
  app.use(loggerMiddleware);

  // 8. Static files
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  // 9. Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 10-11. Routes (auth rate limiter applied to auth routes only)
  app.use('/api/auth', authRateLimiter, authRouter);
  app.use('/api/users', userRouter);  // authMiddleware applied per-route

  // 12. Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
}
```

---

## 3. JWT Rotation Pattern

### 3.1 Pattern Description

On every refresh token use, the old token is revoked and a new token pair is issued. This limits the window of exposure if a refresh token is stolen.

### 3.2 Rotation Flow

```
Client sends refresh token
      │
      ▼
Verify JWT signature (stateless check)
      │
      ▼
Hash token → look up in DB
      │
      ▼
Check: revokedAt IS NULL AND expiresAt > NOW()
      │
      ├── Revoked → 401 (possible replay attack)
      ├── Expired → 401
      │
      ▼
BEGIN TRANSACTION
  1. Mark old token as revoked: UPDATE refresh_tokens SET revokedAt = NOW()
  2. Create new refresh token record
  3. Generate new access token + refresh token JWT strings
END TRANSACTION
      │
      ▼
Return new { accessToken, refreshToken }
```

### 3.3 Implementation

```typescript
// backend/src/services/auth.service.ts

export async function refreshTokens(rawRefreshToken: string): Promise<RefreshResponse> {
  // 1. Verify JWT signature
  const payload = verifyRefreshToken(rawRefreshToken);
  
  // 2. Hash and look up in DB
  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  
  // 3. Validate stored token
  if (!storedToken) {
    throw new UnauthorizedError('Refresh token not found');
  }
  if (storedToken.revokedAt !== null) {
    // Possible token theft — log for security monitoring
    logger.warn({
      event: 'REVOKED_TOKEN_USED',
      userId: storedToken.userId,
      tokenId: storedToken.id,
    });
    throw new UnauthorizedError('Refresh token has been revoked');
  }
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token has expired');
  }
  
  // 4. Rotate: revoke old, issue new (in a transaction)
  const [, newTokens] = await prisma.$transaction(async (tx) => {
    // Revoke old token
    const revoked = await tx.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
    
    // Generate new pair
    const newAccessToken = generateAccessToken(storedToken.user);
    const newRefreshToken = generateRefreshToken(storedToken.userId);
    
    // Store new refresh token
    await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId: storedToken.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });
    
    return [revoked, { accessToken: newAccessToken, refreshToken: newRefreshToken }];
  });
  
  return newTokens;
}
```

---

## 4. Brute-Force Protection Pattern

### 4.1 Pattern Description

An in-memory map tracks failed login attempts per email address. After 5 failures, the account is locked for 15 minutes.

### 4.2 State Machine

```
State: UNLOCKED (default)
  │
  ├── Failed login → count++
  │     ├── count < 5 → stay UNLOCKED
  │     └── count >= 5 → transition to LOCKED (lockedUntil = now + 15min)
  │
  └── Successful login → DELETE record → UNLOCKED

State: LOCKED
  │
  ├── Any login attempt → reject with 429
  │
  └── lockedUntil < now → DELETE record → UNLOCKED (auto-expire)
```

### 4.3 Integration with Login Flow

```typescript
// backend/src/routes/auth.routes.ts

router.post('/login', zodValidate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as LoginDto;
    
    // Check brute-force lock BEFORE any DB query
    if (loginAttemptTracker.isLocked(email)) {
      const retryAfter = loginAttemptTracker.getRemainingLockSeconds(email);
      return next(new TooManyRequestsError(
        'Account temporarily locked due to too many failed attempts',
        retryAfter
      ));
    }
    
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      loginAttemptTracker.recordFailure(email);
      return next(new UnauthorizedError('Invalid credentials'));
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      loginAttemptTracker.recordFailure(email);
      return next(new UnauthorizedError('Invalid credentials'));
    }
    
    // Success — reset counter
    loginAttemptTracker.reset(email);
    
    // Issue tokens
    const tokens = await generateTokenPair(user);
    
    res.json({ user: toApiUser(user), ...tokens });
  } catch (error: unknown) {
    next(error);
  }
});
```

---

## 5. Structured Logging Pattern

### 5.1 Pattern Description

Every HTTP request is logged with a consistent structure. The `requestId` ties all log entries for a single request together.

### 5.2 Request Logger Middleware

```typescript
// backend/src/middleware/logger.ts
import { RequestHandler } from 'express';
import { logger } from '../lib/logger';

export const loggerMiddleware: RequestHandler = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logger.info({
    event: 'REQUEST_START',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, {
      event: 'REQUEST_END',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,  // undefined if not authenticated
    });
  });
  
  next();
};
```

### 5.3 Log Entry Format

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "event": "REQUEST_END",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/api/auth/login",
  "statusCode": 200,
  "duration": 187,
  "userId": "clxyz123"
}
```

**PII exclusion rules**:
- Never log `password` (even hashed)
- Never log `Authorization` header value
- Never log `refreshToken` value
- Log `userId` (not email) for authenticated requests
- Log `path` but not query parameters that might contain tokens

---

## 6. Fail-Closed Pattern

### 6.1 Pattern Description

Any error in the authentication flow results in a 401 response with a generic message. The server never reveals whether an error was due to an invalid token, an expired token, a missing user, or a database error.

### 6.2 Implementation

```typescript
// backend/src/middleware/auth.ts
export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Missing header
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization header'));
  }
  
  const token = authHeader.slice(7);
  
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    // Fail-closed: ANY error → 401 with generic message
    // The specific error (expired, invalid signature, wrong type) is NOT revealed
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
```

### 6.3 Error Handler Fail-Closed Rules

```typescript
// backend/src/middleware/errorHandler.ts

export const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // Always log the full error server-side
  logger.error({
    requestId: req.requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  
  if (error instanceof UnauthorizedError) {
    // Fail-closed: generic message, no details
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (error instanceof ForbiddenError) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (error instanceof ValidationError) {
    // Validation errors CAN include details (they're not security-sensitive)
    return res.status(400).json({
      error: error.message,
      details: error.details,
    });
  }
  
  if (error instanceof TooManyRequestsError) {
    res.setHeader('Retry-After', String(error.retryAfter));
    return res.status(429).json({
      error: error.message,
      retryAfter: error.retryAfter,
    });
  }
  
  // Unknown errors — never expose internals
  return res.status(500).json({ error: 'Internal server error' });
};
```

---

## 7. Request ID Pattern

### 7.1 Implementation

```typescript
// backend/src/middleware/requestId.ts
import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
```

The `X-Request-Id` header is returned in every response, allowing clients to correlate their requests with server logs for debugging.

---

## 8. Zod Validation Middleware Pattern

### 8.1 Implementation

```typescript
// backend/src/middleware/zodValidate.ts
import { RequestHandler } from 'express';
import { z } from 'zod';
import { ValidationError } from '../lib/errors';

type ValidationSource = 'body' | 'query' | 'params';

export function zodValidate<T extends z.ZodTypeAny>(
  schema: T,
  source: ValidationSource = 'body'
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    
    if (!result.success) {
      const formatted = result.error.flatten();
      return next(new ValidationError('Validation failed', formatted));
    }
    
    // Replace req[source] with parsed/transformed data
    // (Zod may have coerced types, trimmed strings, etc.)
    (req as Record<string, unknown>)[source] = result.data;
    next();
  };
}
```

### 8.2 Usage in Routes

```typescript
// backend/src/routes/auth.routes.ts
router.post(
  '/register',
  zodValidate(RegisterSchema),        // validates req.body
  async (req, res, next) => {
    const { name, email, password } = req.body as RegisterDto;
    // body is now typed and validated
  }
);

router.get(
  '/users',
  authMiddleware,
  zodValidate(UserListQuerySchema, 'query'),  // validates req.query
  async (req, res, next) => {
    const { page, pageSize, role } = req.query as UserListQueryDto;
  }
);
```
