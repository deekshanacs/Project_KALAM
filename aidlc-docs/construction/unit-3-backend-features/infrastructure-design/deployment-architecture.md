# Deployment Architecture — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 deployment architecture covers Socket.io on the same Railway/Render instance as Express, the single-instance limitation for Socket.io, and the future Redis adapter path for multi-instance scaling.

---

## 2. Socket.io on Same Railway/Render Instance

### 2.1 Single Instance Architecture

For MVP, Socket.io runs on the same process as Express. Railway and Render both support WebSocket connections on the same port as HTTP.

```
Internet
    │
    ▼
Railway/Render Load Balancer
    │
    ├── HTTP requests → Express routes
    └── WebSocket upgrade → Socket.io
    │
    ▼
Single Node.js process (PORT=8080 or 10000)
    ├── Express app
    └── Socket.io server (attached to same HTTP server)
```

### 2.2 Railway WebSocket Support

Railway supports WebSocket connections natively. No additional configuration is needed. The `railway.toml` from Unit 2 is unchanged.

### 2.3 Render WebSocket Support

Render supports WebSocket connections on web services. The `render.yaml` from Unit 2 is unchanged.

---

## 3. Single Instance Limitation

### 3.1 Current State (MVP)

With a single instance:
- All Socket.io connections go to the same process
- The in-memory room state is consistent
- No sticky sessions needed
- No Redis adapter needed

### 3.2 Multi-Instance Limitation

If the service is scaled to multiple instances (e.g., Railway horizontal scaling), Socket.io rooms are not shared between instances:

```
Instance 1                    Instance 2
  user:alice connected          user:bob connected
  room: user:alice              room: user:bob

Task assigned to bob by alice:
  Instance 1 emits to user:bob  ← bob is on Instance 2!
  Instance 2 never receives it  ← bob misses the event
```

### 3.3 Future Enhancement: Redis Adapter

To support multi-instance deployment, the Redis adapter must be installed:

```typescript
// Future: backend/src/services/socket.service.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'ioredis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

With the Redis adapter, all instances share room state via Redis pub/sub. Events emitted on any instance are delivered to the correct client regardless of which instance they're connected to.

**When to implement**: When Railway/Render horizontal scaling is needed (typically > 100 concurrent users).

---

## 4. Sticky Sessions

### 4.1 Not Required for Single Instance

With a single instance, sticky sessions are not needed — all connections go to the same process.

### 4.2 Required for Multi-Instance (Without Redis Adapter)

If scaling without the Redis adapter, sticky sessions must be configured so each client always connects to the same instance. Railway and Render support sticky sessions via their load balancer configuration.

**Recommendation**: Use the Redis adapter instead of sticky sessions. Sticky sessions are a workaround; the Redis adapter is the correct solution.

---

## 5. Socket.io Polling Fallback

### 5.1 Configuration

Socket.io is configured with both WebSocket and polling transports:

```typescript
const io = new SocketServer(httpServer, {
  transports: ['websocket', 'polling'],
});
```

### 5.2 Polling on Railway/Render

HTTP long-polling works on Railway and Render without additional configuration. The polling requests go to the same HTTP server as the REST API.

### 5.3 Performance Impact

Polling is significantly less efficient than WebSocket:
- Each poll is a new HTTP request
- Higher latency (up to 1 second per poll cycle)
- Higher server load

For production, encourage clients to use WebSocket by ensuring the deployment environment supports WebSocket upgrades (both Railway and Render do).

---

## 6. Deployment Checklist (Unit 3)

- [ ] `httpServer = createServer(app)` used instead of `app.listen()`
- [ ] `initializeSocket(httpServer)` called before `httpServer.listen()`
- [ ] Socket.io CORS origin matches `CORS_ORIGIN` env var
- [ ] Socket.io auth middleware validates JWT on connection
- [ ] WebSocket connections work on Railway/Render (test with `wscat` or browser)
- [ ] Task assignment emits `task:assigned` to correct user room
- [ ] Task status update emits `task:updated` to both task parties
- [ ] Workload recalculation emits `user:workload-update` after status change
- [ ] Redis adapter documented as future enhancement (not implemented in MVP)
- [ ] Single instance limitation documented in README
