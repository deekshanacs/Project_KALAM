# Logical Components — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 logical components are the middleware functions, service classes, and utility modules that implement the auth and user management layer. Each component has a single responsibility and is independently testable.

---

## 2. authMiddleware

### 2.1 Purpose

Extracts the Bearer token from the `Authorization` header, verifies its JWT signature, and attaches the decoded user to `req.user`. Fails closed on any error.

### 2.2 Interface

```typescript
// Input: Express Request with Authorization header
// Output: req.user populated, or next(UnauthorizedError)
export const authMiddleware: RequestHandler;
```

### 2.3 Implementation

```typescript
// backend/src/middleware/auth.ts
import { RequestHandler } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { UnauthorizedError } from '../lib/errors';

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed authorization header'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    // Fail-closed: any error → 401 with generic message
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
```

### 2.4 Behavior

| Scenario | Behavior |
|---|---|
| No Authorization header | next(UnauthorizedError) |
| Header doesn't start with 'Bearer ' | next(UnauthorizedError) |
| Token has invalid signature | next(UnauthorizedError) |
| Token is expired | next(UnauthorizedError) |
| Token type is 'refresh' (not 'access') | next(UnauthorizedError) |
| Valid token | req.user populated, next() called |

---

## 3. roleGuard

### 3.1 Purpose

Middleware factory that checks `req.user.role` against an allowed roles list. Must be used after `authMiddleware`.

### 3.2 Interface

```typescript
// Factory function — returns a RequestHandler
export function roleGuard(allowedRoles: Role[]): RequestHandler;
```

### 3.3 Implementation

```typescript
// backend/src/middleware/roleGuard.ts
import { RequestHandler } from 'express';
import { Role } from '@tms/shared';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

export function roleGuard(allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      // authMiddleware should have run first — this is a programming error
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      ));
    }

    next();
  };
}
```

### 3.4 Usage Examples

```typescript
// Only Admin can access
router.patch('/:id/role', authMiddleware, roleGuard(['ADMIN']), updateRoleHandler);

// Admin or Team Leader
router.patch('/:id/supervisor', authMiddleware, roleGuard(['ADMIN', 'TEAM_LEADER']), updateSupervisorHandler);

// Any authenticated user (no roleGuard needed, just authMiddleware)
router.get('/me', authMiddleware, getMeHandler);
```

---

## 4. rateLimiter

### 4.1 Purpose

Two rate limiters: one for auth routes (strict) and one for all other API routes (permissive).

### 4.2 Interface

```typescript
export const authRateLimiter: RequestHandler;   // 10 req / 15 min per IP
export const globalRateLimiter: RequestHandler; // 100 req / 1 min per IP
```

### 4.3 Implementation

```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,      // RateLimit-* headers
  legacyHeaders: false,       // No X-RateLimit-* headers
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  },
  handler: (req, res) => {
    const retryAfter = Math.ceil(
      (req.rateLimit.resetTime?.getTime() ?? Date.now() + 15 * 60 * 1000 - Date.now()) / 1000
    );
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      retryAfter,
    });
  },
});

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
  },
});
```

---

## 5. requestIdMiddleware

### 5.1 Purpose

Attaches a unique UUID v4 to each request as `req.requestId`. Returns the ID in the `X-Request-Id` response header.

### 5.2 Interface

```typescript
export const requestIdMiddleware: RequestHandler;
```

### 5.3 Implementation

```typescript
// backend/src/middleware/requestId.ts
import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  // Honor incoming X-Request-Id if present (for distributed tracing)
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
```

---

## 6. loggerMiddleware

### 6.1 Purpose

Logs every HTTP request and response with structured JSON. Uses `req.requestId` for correlation.

### 6.2 Interface

```typescript
export const loggerMiddleware: RequestHandler;
```

### 6.3 Implementation

```typescript
// backend/src/middleware/logger.ts
import { RequestHandler } from 'express';
import { logger } from '../lib/logger';

export const loggerMiddleware: RequestHandler = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  // Log request received
  logger.debug({
    event: 'REQUEST_RECEIVED',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? '[present]' : undefined,
    ip: req.ip,
  });

  // Log response when headers are sent
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs / BigInt(1_000_000));
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, {
      event: 'REQUEST_COMPLETED',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id,
    });
  });

  next();
};
```

---

## 7. globalErrorHandler

### 7.1 Purpose

Catches all errors passed to `next(error)` in the middleware chain. Logs full error details server-side. Returns generic, safe error responses to clients.

### 7.2 Interface

```typescript
// Must have 4 parameters to be recognized as error handler by Express
export const globalErrorHandler: ErrorRequestHandler;
```

### 7.3 Implementation

```typescript
// backend/src/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';
import {
  AppError, UnauthorizedError, ForbiddenError,
  ValidationError, TooManyRequestsError, NotFoundError, ConflictError
} from '../lib/errors';

export const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // Log full error server-side (never sent to client)
  logger.error({
    event: 'UNHANDLED_ERROR',
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.stack
      : undefined,
  });

  // Handle known application errors
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  if (error instanceof UnauthorizedError) {
    // Fail-closed: generic message
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (error instanceof ForbiddenError) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message });
  }

  if (error instanceof ConflictError) {
    return res.status(409).json({ error: error.message });
  }

  if (error instanceof TooManyRequestsError) {
    res.setHeader('Retry-After', String(error.retryAfter));
    return res.status(429).json({
      error: error.message,
      retryAfter: error.retryAfter,
    });
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
    // Other Prisma errors → 500
    return res.status(500).json({ error: 'Database error' });
  }

  // Unknown errors — never expose internals
  return res.status(500).json({ error: 'Internal server error' });
};
```

---

## 8. zodValidate

### 8.1 Purpose

Middleware factory that validates request input against a Zod schema. Replaces the raw input with the parsed/transformed output.

### 8.2 Interface

```typescript
export function zodValidate<T extends z.ZodTypeAny>(
  schema: T,
  source?: 'body' | 'query' | 'params'
): RequestHandler;
```

### 8.3 Implementation

```typescript
// backend/src/middleware/zodValidate.ts
import { RequestHandler } from 'express';
import { z } from 'zod';
import { ValidationError } from '../lib/errors';

export function zodValidate<T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const formatted = result.error.flatten();
      return next(new ValidationError('Validation failed', {
        fieldErrors: formatted.fieldErrors,
        formErrors: formatted.formErrors,
      }));
    }

    // Replace with parsed data (Zod may have coerced/transformed values)
    (req as Record<string, unknown>)[source] = result.data;
    next();
  };
}
```

---

## 9. Component Dependency Graph

```
app.ts (createApp)
    │
    ├── helmet                    (npm package)
    ├── cors                      (npm package)
    ├── globalRateLimiter         ← middleware/rateLimiter.ts
    ├── express.json              (express built-in)
    ├── requestIdMiddleware       ← middleware/requestId.ts
    ├── loggerMiddleware          ← middleware/logger.ts → lib/logger.ts
    │
    ├── /api/auth routes
    │   ├── authRateLimiter       ← middleware/rateLimiter.ts
    │   ├── zodValidate           ← middleware/zodValidate.ts
    │   └── auth.service.ts
    │       ├── lib/prisma.ts
    │       ├── loginAttempt.service.ts
    │       └── jsonwebtoken (npm)
    │
    ├── /api/users routes
    │   ├── authMiddleware        ← middleware/auth.ts → auth.service.ts
    │   ├── roleGuard             ← middleware/roleGuard.ts
    │   ├── zodValidate           ← middleware/zodValidate.ts
    │   └── user.service.ts
    │       ├── lib/prisma.ts
    │       └── workload.service.ts
    │
    └── globalErrorHandler        ← middleware/errorHandler.ts → lib/logger.ts
```

---

## 10. Route Handler Pattern

All route handlers follow the same pattern: validate → authorize → execute → respond.

```typescript
// Standard route handler pattern
router.patch(
  '/:id/status',
  authMiddleware,                              // 1. Authenticate
  zodValidate(ParamsSchema, 'params'),         // 2. Validate params
  zodValidate(UpdateStatusSchema, 'body'),     // 3. Validate body
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const { availabilityStatus } = req.body as UpdateStatusDto;
      
      // 4. Authorize (ownership check)
      if (req.user!.id !== id && req.user!.role !== 'ADMIN') {
        return next(new ForbiddenError('Cannot update another user\'s status'));
      }
      
      // 5. Execute business logic
      const user = await userService.updateStatus(id, availabilityStatus);
      
      // 6. Respond
      res.json({ user });
    } catch (error: unknown) {
      next(error);  // Pass to globalErrorHandler
    }
  }
);
```
