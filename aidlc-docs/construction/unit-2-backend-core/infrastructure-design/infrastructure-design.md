# Infrastructure Design — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 infrastructure covers the Express server configuration, database connectivity via Prisma, refresh token storage, login attempt tracking, file storage setup, and CORS configuration.

---

## 2. Express Server

### 2.1 Server Configuration

| Parameter | Value | Source |
|---|---|---|
| Port | `env.PORT` | `PORT` environment variable, default 4000 |
| Body size limit | 10MB | `express.json({ limit: '10mb' })` |
| Static files | `/uploads` path | `express.static(path.resolve(env.UPLOAD_DIR))` |
| Health check | `GET /health` | No auth, returns `{ status: 'ok' }` |

### 2.2 Server Startup Sequence

```typescript
// backend/src/index.ts

async function main(): Promise<void> {
  // Step 1: Validate environment variables (throws if missing)
  const { env } = await import('./config/env');
  
  // Step 2: Create uploads directory
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
    logger.info(`[Startup] Created uploads directory: ${uploadDir}`);
  }
  
  // Step 3: Verify database connection
  try {
    await prisma.$connect();
    logger.info('[Startup] Database connection established');
  } catch (error: unknown) {
    logger.error('[Startup] Database connection failed:', error);
    process.exit(1);
  }
  
  // Step 4: Create Express app
  const app = createApp();
  
  // Step 5: Create HTTP server (needed for Socket.io in Unit 3)
  const httpServer = createServer(app);
  
  // Step 6: Start listening
  httpServer.listen(env.PORT, () => {
    logger.info(`[Startup] Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
  
  // Step 7: Graceful shutdown handlers
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[Shutdown] Received ${signal}, shutting down gracefully`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      logger.info('[Shutdown] Database disconnected');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('[Shutdown] Forced exit after timeout');
      process.exit(1);
    }, 10_000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  logger.error('[Startup] Fatal error:', error);
  process.exit(1);
});
```

---

## 3. PostgreSQL via Prisma

### 3.1 Connection Configuration

```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (event) => {
    if (event.duration > 100) {
      console.warn(`[Prisma] Slow query (${event.duration}ms): ${event.query}`);
    }
  });
}
```

### 3.2 Connection Pool

Prisma manages a connection pool automatically. Default settings:
- Pool size: 10 connections (Prisma default)
- Connection timeout: 5 seconds
- Idle timeout: 10 minutes

For Railway/Render free tier (limited connections), the pool size can be reduced:
```
DATABASE_URL="postgresql://...?connection_limit=5"
```

### 3.3 Database Indexes

The following indexes are created by Prisma migrations for query performance:

| Table | Index | Purpose |
|---|---|---|
| `users` | `email` (unique) | Login lookup |
| `refresh_tokens` | `tokenHash` (unique) | Token refresh lookup |
| `refresh_tokens` | `userId` | Find tokens by user (logout) |
| `tasks` | `assignedToId` | User's task list |
| `tasks` | `assignedById` | Tasks assigned by user |
| `messages` | `senderId` | Messages by sender |
| `messages` | `receiverId` | DMs to user |
| `messages` | `groupId` | Group messages |
| `group_members` | `[groupId, userId]` (unique) | Membership check |

---

## 4. Refresh Token Storage

### 4.1 Storage Strategy

Refresh tokens are stored in the `refresh_tokens` PostgreSQL table (defined in Unit 1 schema). Only the SHA-256 hash of the raw token is stored.

```
Client                    Server                    Database
  │                          │                          │
  │── POST /auth/login ──────►│                          │
  │                          │── INSERT refresh_token ──►│
  │                          │   (tokenHash, userId,     │
  │                          │    expiresAt)             │
  │◄── { accessToken,        │                          │
  │      refreshToken } ─────│                          │
  │                          │                          │
  │── POST /auth/refresh ────►│                          │
  │   { refreshToken }       │── SELECT WHERE           │
  │                          │   tokenHash = hash(token)►│
  │                          │◄── token record ──────────│
  │                          │── UPDATE revokedAt ──────►│
  │                          │── INSERT new token ──────►│
  │◄── { new tokens } ───────│                          │
```

### 4.2 Token Cleanup

Expired and revoked tokens are cleaned up on a schedule:

```typescript
// backend/src/index.ts (after server starts)

// Clean up expired tokens every 24 hours
setInterval(async () => {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
    logger.info(`[Cleanup] Deleted ${result.count} expired/revoked refresh tokens`);
  } catch (error: unknown) {
    logger.error('[Cleanup] Failed to clean up refresh tokens:', error);
  }
}, 24 * 60 * 60 * 1000);
```

---

## 5. Login Attempt Tracking (In-Memory)

### 5.1 Storage Strategy

Login attempts are tracked in an in-memory `Map` within the `LoginAttemptTracker` singleton. This is intentionally simple for MVP.

```typescript
// Singleton instance
export const loginAttemptTracker = new LoginAttemptTracker();
```

### 5.2 Memory Footprint

Each `AttemptRecord` is approximately 100 bytes. With 10,000 concurrent users, the tracker uses ~1MB of memory — negligible.

### 5.3 Limitations and Future Enhancement

| Limitation | Impact | Future Solution |
|---|---|---|
| Resets on server restart | Locked users can retry after restart | Redis with TTL |
| Not shared across instances | Multi-instance bypass possible | Redis shared state |
| No persistence | Cannot audit lockout history | Database logging |

The `LoginAttemptTracker` class implements a `LoginAttemptService` interface, making it swappable with a Redis-backed implementation without changing the auth service.

---

## 6. UPLOAD_DIR Configuration

### 6.1 Directory Setup

```typescript
// backend/src/index.ts
import { mkdirSync, existsSync } from 'fs';
import path from 'path';

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}
```

### 6.2 Static File Serving

```typescript
// backend/src/app.ts
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR), {
  maxAge: '1d',           // Cache uploaded files for 1 day
  etag: true,             // Enable ETag for cache validation
  lastModified: true,     // Enable Last-Modified header
  dotfiles: 'deny',       // Deny access to dotfiles
}));
```

### 6.3 File URL Format

Uploaded files are accessible at:
```
http://localhost:4000/uploads/{filename}
```

In production:
```
https://your-backend.railway.app/uploads/{filename}
```

---

## 7. CORS Configuration

### 7.1 Configuration

```typescript
// backend/src/app.ts
import cors, { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (origin === env.CORS_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,  // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
```

### 7.2 CORS Values by Environment

| Environment | `CORS_ORIGIN` |
|---|---|
| Local development | `http://localhost:5173` |
| Production | `https://your-app.vercel.app` |

---

## 8. Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIT 2 INFRASTRUCTURE                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Express Server (PORT=4000)                  │   │
│  │                                                               │   │
│  │  Middleware Stack:                                            │   │
│  │  helmet → cors → rateLimiter → json → requestId → logger     │   │
│  │                                                               │   │
│  │  Routes:                                                      │   │
│  │  /health (no auth)                                           │   │
│  │  /uploads (static files)                                     │   │
│  │  /api/auth/* (authRateLimiter + auth handlers)               │   │
│  │  /api/users/* (authMiddleware + user handlers)               │   │
│  │                                                               │   │
│  │  Error Handler (last)                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│           │                              │                           │
│           ▼                              ▼                           │
│  ┌─────────────────┐          ┌──────────────────────┐             │
│  │  PostgreSQL DB   │          │  In-Memory State      │             │
│  │  (via Prisma)    │          │                       │             │
│  │                  │          │  LoginAttemptTracker  │             │
│  │  Tables:         │          │  Map<email, record>   │             │
│  │  - users         │          │                       │             │
│  │  - refresh_tokens│          └──────────────────────┘             │
│  │  - tasks         │                                               │
│  │  - messages      │          ┌──────────────────────┐             │
│  │  - groups        │          │  Local Filesystem     │             │
│  │  - documents     │          │                       │             │
│  │  - projects      │          │  ./uploads/           │             │
│  │  - comments      │          │  (static files)       │             │
│  │  - time_logs     │          └──────────────────────┘             │
│  └─────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```
