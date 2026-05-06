# Infrastructure Design — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 infrastructure covers the Socket.io server attachment to the Express HTTP server, Socket.io CORS configuration, JWT authentication on Socket.io connections, and task attachment storage strategy.

---

## 2. Socket.io Attached to Same HTTP Server

### 2.1 Architecture

Socket.io must share the same HTTP server as Express. This is achieved by creating the HTTP server explicitly (instead of letting Express create it internally) and passing it to both Express and Socket.io.

```typescript
// backend/src/index.ts
import { createServer } from 'http';
import { createApp } from './app';
import { initializeSocket } from './services/socket.service';

const app = createApp();

// Create HTTP server explicitly
const httpServer = createServer(app);

// Attach Socket.io to the same HTTP server
const io = initializeSocket(httpServer);

// Listen on the HTTP server (not app.listen)
httpServer.listen(env.PORT, () => {
  logger.info(`[Startup] HTTP + WebSocket server on port ${env.PORT}`);
});
```

### 2.2 Why Same Server?

- Socket.io uses HTTP upgrade to establish WebSocket connections
- The upgrade request goes to the same port as the REST API
- No additional port or proxy configuration needed
- Railway/Render expose a single port per service

### 2.3 Port Configuration

| Environment | Port | Source |
|---|---|---|
| Local dev | 4000 | `PORT` env var |
| Railway | 8080 | Auto-injected by Railway |
| Render | 10000 | Auto-injected by Render |

Both HTTP (REST API) and WebSocket (Socket.io) traffic use the same port.

---

## 3. Socket.io CORS Configuration

### 3.1 Configuration

Socket.io has its own CORS configuration, separate from the Express `cors` middleware. Both must allow the same origin.

```typescript
// backend/src/services/socket.service.ts
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,      // Same as Express CORS_ORIGIN
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});
```

### 3.2 Transport Configuration

| Transport | Description | Use Case |
|---|---|---|
| `websocket` | Native WebSocket | Modern browsers, preferred |
| `polling` | HTTP long-polling | Fallback for restricted networks |

Socket.io tries WebSocket first, falls back to polling if WebSocket is blocked (e.g., some corporate firewalls).

---

## 4. Socket.io JWT Authentication

### 4.1 Authentication Flow

```
Client                          Server
  │                               │
  │── io.connect({                │
  │     auth: { token: jwt }      │
  │   }) ─────────────────────────►│
  │                               │
  │                               │ io.use() middleware:
  │                               │ verifyAccessToken(token)
  │                               │
  │                               ├── Valid → socket.data.userId = sub
  │                               │          socket.join(`user:${sub}`)
  │                               │          emit 'connect'
  │                               │
  │                               └── Invalid → emit 'connect_error'
  │                                             connection rejected
```

### 4.2 Token Refresh for Socket.io

When the access token expires (15 minutes), the Socket.io connection is not automatically disconnected. The client must:
1. Detect the token expiry (via HTTP 401 on REST calls)
2. Refresh the token via `POST /api/auth/refresh`
3. Disconnect and reconnect Socket.io with the new token

```typescript
// Frontend pattern (Unit 5)
socket.on('connect_error', (error) => {
  if (error.message === 'Invalid or expired token') {
    // Refresh token and reconnect
    refreshToken().then(newToken => {
      socket.auth = { token: newToken };
      socket.connect();
    });
  }
});
```

### 4.3 Socket.io Auth Middleware

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch {
    // Fail-closed: any error → reject connection
    next(new Error('Invalid or expired token'));
  }
});
```

---

## 5. Task Attachments Storage

### 5.1 Storage Strategy

Task attachments are stored as a JSON array of URL strings in the `attachments` field. The actual files are uploaded separately via `POST /api/upload` (Unit 4).

```
Client uploads file:
  POST /api/upload
  → Multer saves to ./uploads/{uuid}.{ext}
  → Returns { url: '/uploads/{uuid}.{ext}' }

Client creates task with attachment:
  POST /api/tasks
  Body: { ..., attachments: ['/uploads/{uuid}.{ext}'] }
  → Stored in task.attachments JSON array
```

### 5.2 Attachment URL Format

| Environment | URL Format |
|---|---|
| Local dev | `http://localhost:4000/uploads/{filename}` |
| Production | `https://your-backend.railway.app/uploads/{filename}` |

The frontend stores the full URL returned by the upload endpoint. The backend stores whatever URL string the client provides (validated as a URL by Zod).

### 5.3 Attachment Constraints

| Constraint | Value | Enforcement |
|---|---|---|
| Max attachments per task | 10 | Zod: `z.array(...).max(10)` |
| URL format | Valid URL | Zod: `z.string().url()` |
| File size | 10MB | Multer config (Unit 4) |
| File types | Any | Validated at upload time (Unit 4) |

---

## 6. Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIT 3 INFRASTRUCTURE                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    HTTP Server (PORT=4000)                     │   │
│  │                                                               │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │   Express App        │  │   Socket.io Server            │  │   │
│  │  │                      │  │                               │  │   │
│  │  │  REST API routes:    │  │  Rooms:                       │  │   │
│  │  │  /api/tasks/*        │  │  user:{userId}                │  │   │
│  │  │  /api/tasks/:id/     │  │  group:{groupId}              │  │   │
│  │  │    comments          │  │                               │  │   │
│  │  │  /api/tasks/:id/     │  │  Events:                      │  │   │
│  │  │    time-logs         │  │  task:assigned                │  │   │
│  │  │                      │  │  task:updated                 │  │   │
│  │  └─────────────────────┘  │  user:workload-update         │  │   │
│  │                            │  notification:new             │  │   │
│  │                            └──────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                               │
│  │  PostgreSQL DB   │                                               │
│  │                  │                                               │
│  │  tasks           │                                               │
│  │  comments        │                                               │
│  │  time_logs       │                                               │
│  └─────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```
