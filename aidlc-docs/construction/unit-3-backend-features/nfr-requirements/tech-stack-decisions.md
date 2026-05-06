# Tech Stack Decisions — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 introduces Socket.io as the primary new dependency. All other dependencies (Prisma, Zod, Winston, Express) are reused from Unit 2. All versions are pinned exactly per SECURITY-10.

---

## 2. Real-Time Communication

### 2.1 Socket.io 4.x

| Decision | Value |
|---|---|
| Package | `socket.io` (server) |
| Version | `4.8.1` |
| Client package | `socket.io-client` (frontend, Unit 5) |
| Client version | `4.8.1` |

**Why Socket.io over alternatives?**

| Criterion | Socket.io | ws (raw WebSocket) | Server-Sent Events |
|---|---|---|---|
| Bidirectional | Yes | Yes | No (server → client only) |
| Auto-reconnect | Built-in | Manual | Built-in |
| Room/namespace support | Built-in | Manual | N/A |
| Fallback (polling) | Yes | No | N/A |
| TypeScript support | Good | Good | N/A |
| Scaling (Redis adapter) | Built-in | Manual | N/A |

Socket.io is chosen because:
- Room-based targeting is built-in (critical for `user:{userId}` rooms)
- Automatic reconnection with exponential backoff
- Polling fallback for environments that block WebSockets
- Redis adapter available for future multi-instance scaling
- The `socket.io-client` package provides a typed client for the frontend

**Socket.io version alignment**: The server and client versions must match exactly. Both are pinned to `4.8.1`.

### 2.2 Socket.io Redis Adapter (Future Enhancement)

Not installed in Unit 3. Documented here for future reference:

```json
// Future: for multi-instance deployment
{
  "@socket.io/redis-adapter": "8.3.0",
  "ioredis": "5.4.1"
}
```

When installed, the adapter is configured in `socket.service.ts`:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'ioredis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

## 3. Reused Dependencies

### 3.1 Prisma (from Unit 1)

| Package | Version | Usage in Unit 3 |
|---|---|---|
| `@prisma/client` | `5.22.0` | Task, Comment, TimeLog CRUD |
| `prisma` | `5.22.0` | Schema management |

New Prisma queries in Unit 3:
- `prisma.task.findMany` with complex `where` clauses and `include`
- `prisma.task.create` with nested relations
- `prisma.comment.findMany` ordered by `createdAt`
- `prisma.timeLog.aggregate` for total hours calculation

### 3.2 Zod (from Unit 2)

| Package | Version | Usage in Unit 3 |
|---|---|---|
| `zod` | `3.23.8` | Task, Comment, TimeLog validation schemas |

New schemas in Unit 3:
- `CreateTaskSchema`
- `UpdateTaskSchema`
- `UpdateTaskStatusSchema`
- `TaskFiltersSchema`
- `CreateCommentSchema`
- `CreateTimeLogSchema`
- `IdParamSchema`

### 3.3 Winston (from Unit 2)

| Package | Version | Usage in Unit 3 |
|---|---|---|
| `winston` | `3.17.0` | Socket.io connection/disconnection logging, workload recalculation errors |

### 3.4 fast-check (from Unit 1)

| Package | Version | Usage in Unit 3 |
|---|---|---|
| `fast-check` | `3.22.0` | PBT for workload calculation, assignment permission, task serialization |

---

## 4. Complete Dependency Summary for Unit 3

No new production dependencies are added in Unit 3 beyond Socket.io. The full backend `package.json` after Unit 3:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "0.32.1",
    "@prisma/client": "5.22.0",
    "@tms/shared": "*",
    "bcrypt": "5.1.1",
    "cors": "2.8.5",
    "docx": "9.0.2",
    "express": "4.21.1",
    "express-rate-limit": "7.4.1",
    "helmet": "8.0.0",
    "jsonwebtoken": "9.0.2",
    "multer": "1.4.5-lts.1",
    "socket.io": "4.8.1",
    "uuid": "11.0.3",
    "winston": "3.17.0",
    "zod": "3.23.8"
  }
}
```

**Note**: `@anthropic-ai/sdk`, `multer`, and `docx` are listed here because they are installed in Unit 1's initial `package.json` setup (all backend dependencies are installed upfront). They are used in Unit 4.

---

## 5. Decision Log

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Real-time | Socket.io 4.x | ws, SSE, long-polling | Room support, auto-reconnect, Redis adapter ready |
| Socket.io version | 4.8.1 | 4.7.x, 3.x | Latest stable 4.x, matches client version |
| Redis adapter | Not installed (MVP) | @socket.io/redis-adapter | Single instance for MVP, documented for future |
| All other deps | Reused from Unit 2 | — | No new dependencies needed |
