# NFR Requirements — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 NFR requirements cover the performance, security, scalability, and reliability requirements for the task management and Socket.io real-time layer.

---

## 2. Performance Requirements

### 2.1 Response Time Targets

| Endpoint | Target | Notes |
|---|---|---|
| `GET /api/tasks` | < 300ms | Includes scope filter + workload data |
| `POST /api/tasks` | < 200ms | Includes assignment validation + Socket.io emit |
| `PATCH /api/tasks/:id` | < 200ms | Includes workload recalculation trigger |
| `PATCH /api/tasks/:id/status` | < 200ms | Includes workload recalculation trigger |
| `DELETE /api/tasks/:id` | < 100ms | Cascade delete |
| `GET /api/tasks/:id/comments` | < 100ms | Simple list query |
| `POST /api/tasks/:id/comments` | < 100ms | Insert + Socket.io emit |
| `GET /api/tasks/:id/time-logs` | < 100ms | Simple list query with sum |
| `POST /api/tasks/:id/time-logs` | < 100ms | Insert only |

### 2.2 Socket.io Event Delivery

| Event | Target | Notes |
|---|---|---|
| `task:assigned` | < 100ms | From HTTP response to Socket.io delivery |
| `task:updated` | < 100ms | From status update to Socket.io delivery |
| `user:workload-update` | < 200ms | Includes DB query for workload calculation |
| `notification:new` | < 100ms | In-memory notification, no DB |

### 2.3 Kanban Board Performance

- The task list endpoint must support rendering up to 200 tasks without pagination issues.
- The `pageSize` parameter defaults to 20 but can be set up to 100.
- For the Kanban board view, the frontend fetches all tasks for the current user's scope (up to 200) in a single request.

---

## 3. Security Requirements

### 3.1 SECURITY-05: Zod Validation on All Task Endpoints

**Requirement**: Every task endpoint must validate its input with a Zod schema.

| Endpoint | Schema | Source |
|---|---|---|
| `POST /api/tasks` | `CreateTaskSchema` | body |
| `PATCH /api/tasks/:id` | `UpdateTaskSchema` | body |
| `PATCH /api/tasks/:id/status` | `UpdateTaskStatusSchema` | body |
| `GET /api/tasks` | `TaskFiltersSchema` | query |
| `POST /api/tasks/:id/comments` | `CreateCommentSchema` | body |
| `POST /api/tasks/:id/time-logs` | `CreateTimeLogSchema` | body |
| All `/:id` routes | `IdParamSchema` | params |

**ID parameter validation**:
```typescript
export const IdParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});
```

### 3.2 SECURITY-08: Role Guard on Assignment

**Requirement**: Task creation and reassignment must enforce role-based assignment rules server-side.

**Implementation**: The `assignmentGuard` middleware (or service-layer check) validates that the requesting user has permission to assign to the specified `assignedToId` before creating or updating the task.

**Enforcement points**:
- `POST /api/tasks` — validate `assignedToId` against requester's role
- `PATCH /api/tasks/:id` — if `assignedToId` changes, re-validate assignment permission

### 3.3 SECURITY-06: Least Privilege — Users Only See Scoped Tasks

**Requirement**: The task list endpoint must apply scope filters based on the requesting user's role. Users must not be able to see tasks outside their scope by manipulating query parameters.

**Scope filter enforcement**:
```typescript
// The scope filter is built server-side from req.user.role
// It cannot be overridden by query parameters
const scopeFilter = await buildScopeFilter(req.user.id, req.user.role);
const userFilter = buildTaskWhereClause(filters, scopeFilter);
// scopeFilter is always applied — it's ANDed with user filters
```

**Prohibited pattern**:
```typescript
// WRONG: User can bypass scope by passing assigneeId
const where = { assignedToId: filters.assigneeId };  // No scope enforcement

// CORRECT: Scope is always enforced
const where = { AND: [scopeFilter, userFilter] };
```

### 3.4 Socket.io Authentication

**Requirement**: Socket.io connections must be authenticated with a valid JWT access token.

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) return next(new Error('Authentication required'));
  
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});
```

Unauthenticated Socket.io connections are rejected before the `connection` event fires.

---

## 4. Scalability Requirements

### 4.1 Socket.io Rooms for Targeted Delivery

**Requirement**: Socket.io events must be emitted to specific rooms (not broadcast to all connected clients).

**Correct pattern**:
```typescript
// Emit only to the affected user
io.to(`user:${userId}`).emit('task:updated', taskData);
```

**Prohibited pattern**:
```typescript
// WRONG: Broadcasts to all connected clients
io.emit('task:updated', taskData);
```

**Rationale**: Broadcasting to all clients would expose task data to users who don't have permission to see it, and would create unnecessary network traffic as the user base grows.

### 4.2 Non-Blocking Workload Recalculation

**Requirement**: Workload recalculation must not block the HTTP response. It runs as a fire-and-forget side effect.

```typescript
// Non-blocking: void the promise, handle errors internally
void recalculateAndEmitWorkload(task.assignedToId);

// Return the HTTP response immediately
res.json({ task: updatedTask });
```

### 4.3 Pagination

**Requirement**: All list endpoints must support pagination to prevent unbounded result sets.

| Parameter | Default | Maximum |
|---|---|---|
| `page` | 1 | Unlimited |
| `pageSize` | 20 | 100 |

---

## 5. Reliability Requirements

### 5.1 Socket.io Reconnection Handling

**Requirement**: The Socket.io server must handle client reconnections gracefully.

- When a client reconnects, they re-join their user room automatically (the auth middleware runs again)
- Group rooms must be re-joined by the client after reconnection (client responsibility)
- The server does not maintain reconnection state — each connection is independent

### 5.2 Task Update Idempotency

**Requirement**: Updating a task to its current status must be safe and produce the same result.

```typescript
// Idempotent: updating TODO → TODO is safe
const task = await prisma.task.update({
  where: { id: taskId },
  data: {
    status: newStatus,
    completedAt: newStatus === 'DONE' ? new Date() : null,
  },
});
// If status was already TODO and we set it to TODO again:
// - completedAt remains null (correct)
// - updatedAt is refreshed (acceptable)
// - Socket.io event is emitted (acceptable — client handles duplicate events)
```

### 5.3 Workload Recalculation Failure Handling

**Requirement**: If workload recalculation fails (e.g., database error), the task status update must still succeed.

```typescript
async function recalculateAndEmitWorkload(userId: string): Promise<void> {
  try {
    const workload = await workloadService.calculateWorkload(userId);
    emitToUser(userId, 'user:workload-update', workload);
  } catch (error: unknown) {
    // Log but don't propagate — workload update is non-critical
    logger.error({
      event: 'WORKLOAD_RECALCULATION_FAILED',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

---

## 6. Extension Compliance Summary

| Rule | Status | Implementation |
|---|---|---|
| SECURITY-05 (Zod validation) | Compliant | Zod schemas on all task/comment/timelog endpoints |
| SECURITY-06 (least privilege) | Compliant | Scope filters applied server-side based on role |
| SECURITY-08 (role guard on assignment) | Compliant | `validateAssignmentPermission` in task service |
| SECURITY-03 (role enforcement server-side) | Compliant | Assignment validation uses DB role, not JWT |
| SECURITY-04 (HTTP headers) | Compliant | Inherited from Unit 2 middleware stack |
| SECURITY-11 (rate limiting) | Compliant | Inherited from Unit 2 global rate limiter |
| SECURITY-15 (global error handler) | Compliant | Inherited from Unit 2 error handler |
| PBT-01 (properties defined) | Compliant | 4 properties defined in business-rules.md |
| PBT-02 (round-trip) | Compliant | Task serialization round-trip property |
| PBT-03 (invariants) | Compliant | Workload [0,100] + deterministic assignment |
| PBT-04 (idempotency) | Compliant | Status update idempotency property |
| PBT-09 (fast-check) | Compliant | Inherited from Unit 1 |
