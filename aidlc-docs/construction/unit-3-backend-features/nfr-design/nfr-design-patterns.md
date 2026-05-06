# NFR Design Patterns — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 introduces four key design patterns: the Socket.io room pattern for targeted event delivery, role guard composition for task endpoints, non-blocking workload recalculation, and optimistic locking for concurrent updates.

---

## 2. Socket.io Room Pattern

### 2.1 Pattern Description

Each user has a dedicated Socket.io room named `user:{userId}`. Events are emitted to specific rooms rather than broadcast to all clients. This ensures:
- Users only receive events relevant to them
- Task data is not leaked to unauthorized users
- Network traffic scales with the number of affected users, not total users

### 2.2 Room Lifecycle

```
Client connects (with JWT)
      │
      ▼
Auth middleware: socket.data.userId = payload.sub
      │
      ▼
io.on('connection', socket => {
  socket.join(`user:${socket.data.userId}`)  ← automatic
})
      │
      ▼
Client emits 'join:group' for each group
      │
      ▼
socket.join(`group:${groupId}`)  ← explicit
      │
      ▼
Client disconnects
      │
      ▼
Socket.io automatically removes socket from all rooms
```

### 2.3 Emit Patterns

```typescript
// backend/src/services/socket.service.ts

// Emit to a specific user (their personal room)
export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

// Emit to all members of a group
export function emitToGroup(groupId: string, event: string, data: unknown): void {
  getIO().to(`group:${groupId}`).emit(event, data);
}

// Emit to multiple users (e.g., both task parties)
export function emitToUsers(userIds: string[], event: string, data: unknown): void {
  for (const userId of userIds) {
    emitToUser(userId, event, data);
  }
}
```

### 2.4 Task Event Emission Pattern

```typescript
// After task status update
const affectedUserIds = Array.from(new Set([
  task.assignedToId,
  task.assignedById,
]));

emitToUsers(affectedUserIds, 'task:updated', {
  task: updatedTask,
  updatedBy: { id: requesterId, name: requesterName },
});
```

### 2.5 Anti-Patterns

```typescript
// WRONG: Broadcasts to all connected clients
io.emit('task:updated', taskData);

// WRONG: Emits to a room that includes unauthorized users
io.to('all-users').emit('task:updated', taskData);

// CORRECT: Targeted emission to specific user rooms
io.to(`user:${task.assignedToId}`).emit('task:updated', taskData);
io.to(`user:${task.assignedById}`).emit('task:updated', taskData);
```

---

## 3. Role Guard Composition Pattern

### 3.1 Pattern Description

Role guards are composed with `authMiddleware` to create layered authorization. The composition order is always: authenticate → authorize → validate → handle.

### 3.2 Composition Examples

```typescript
// backend/src/routes/task.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { zodValidate } from '../middleware/zodValidate';

const router = Router();

// Any authenticated user can list tasks (scope applied in handler)
router.get('/',
  authMiddleware,
  zodValidate(TaskFiltersSchema, 'query'),
  listTasksHandler
);

// Any authenticated user can create tasks (assignment validated in service)
router.post('/',
  authMiddleware,
  zodValidate(CreateTaskSchema),
  createTaskHandler
);

// Task status update: authenticated + ownership check in handler
router.patch('/:id/status',
  authMiddleware,
  zodValidate(IdParamSchema, 'params'),
  zodValidate(UpdateTaskStatusSchema),
  updateTaskStatusHandler
);

// Task deletion: Admin only
router.delete('/:id',
  authMiddleware,
  roleGuard(['ADMIN']),
  zodValidate(IdParamSchema, 'params'),
  deleteTaskHandler
);
```

### 3.3 Assignment Guard as Service-Layer Check

Assignment permission is validated in the service layer (not as middleware) because it requires database access to traverse the hierarchy:

```typescript
// backend/src/services/task.service.ts

export async function createTask(
  dto: CreateTaskDto,
  requesterId: string
): Promise<TaskWithRelations> {
  // Service-layer assignment validation (not middleware)
  await validateAssignmentPermission(requesterId, dto.assignedToId);
  
  // Proceed with creation
  const task = await prisma.task.create({ ... });
  return task;
}
```

**Why service layer instead of middleware?**
- Assignment validation requires the `assignedToId` from the request body
- Middleware runs before body parsing in some configurations
- Service-layer validation is easier to unit test
- The validation logic is business logic, not infrastructure

---

## 4. Workload Recalculation Pattern

### 4.1 Pattern Description

Workload recalculation is a non-blocking side effect triggered by task status changes. It uses the "fire-and-forget" pattern with error isolation.

### 4.2 Implementation

```typescript
// backend/src/services/task.service.ts

/**
 * Recalculates workload for a user and emits the result via Socket.io.
 * Non-blocking: errors are logged but not propagated.
 */
async function recalculateAndEmitWorkload(userId: string): Promise<void> {
  try {
    const workload = await workloadService.calculateWorkload(userId);
    emitToUser(userId, 'user:workload-update', workload);
    logger.debug({
      event: 'WORKLOAD_RECALCULATED',
      userId,
      percentage: workload.percentage,
      colorTier: workload.colorTier,
    });
  } catch (error: unknown) {
    logger.error({
      event: 'WORKLOAD_RECALCULATION_FAILED',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Do NOT re-throw — this is a non-critical side effect
  }
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  requesterId: string
): Promise<TaskWithRelations> {
  // ... validation and update logic ...
  
  const updatedTask = await prisma.task.update({ ... });
  
  // Emit task update (synchronous — part of the response)
  emitToUsers([task.assignedToId, task.assignedById], 'task:updated', updatedTask);
  
  // Workload recalculation (non-blocking — fire and forget)
  void recalculateAndEmitWorkload(task.assignedToId);
  
  return updatedTask;
}
```

### 4.3 Why Non-Blocking?

- Workload recalculation requires a database query (count of open tasks)
- This query is not on the critical path of the status update
- If the workload update fails, the task status update should still succeed
- The client can always request the current workload via `GET /api/users/:id/workload`

---

## 5. Optimistic Locking Pattern

### 5.1 Pattern Description

Concurrent task updates are detected using the `updatedAt` timestamp. If two clients try to update the same task simultaneously, the second update detects the conflict via the `updatedAt` mismatch.

### 5.2 Implementation

```typescript
// backend/src/schemas/task.schemas.ts
export const UpdateTaskSchema = z.object({
  // ... other fields ...
  updatedAt: z.string().datetime().optional(),  // Client sends current updatedAt
});

// backend/src/services/task.service.ts
export async function updateTask(
  taskId: string,
  dto: UpdateTaskDto,
  requesterId: string
): Promise<TaskWithRelations> {
  // If client provided updatedAt, check for concurrent modification
  if (dto.updatedAt) {
    const currentTask = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { updatedAt: true },
    });
    
    const clientTimestamp = new Date(dto.updatedAt).getTime();
    const serverTimestamp = currentTask.updatedAt.getTime();
    
    if (Math.abs(clientTimestamp - serverTimestamp) > 1000) {
      // More than 1 second difference — likely a concurrent modification
      throw new ConflictError(
        'Task was modified by another user. Please refresh and try again.'
      );
    }
  }
  
  // Proceed with update
  const { updatedAt: _, ...updateData } = dto;
  return prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: taskInclude,
  });
}
```

**Note**: Optimistic locking is optional for MVP. The `updatedAt` check is only performed if the client sends the field. This is a best-effort conflict detection, not a strict lock.

---

## 6. Task Filter Builder Pattern

### 6.1 Pattern Description

Task filters are built in two layers:
1. **Scope filter**: Built from the user's role (server-side, cannot be overridden)
2. **User filter**: Built from query parameters (user-controlled, within scope)

The two filters are combined with `AND` logic.

### 6.2 Implementation

```typescript
// backend/src/services/task.service.ts

export async function listTasks(
  filters: TaskFiltersDto,
  requesterId: string,
  requesterRole: Role
): Promise<PaginatedResponse<TaskWithRelations>> {
  // Layer 1: Scope filter (enforced, cannot be bypassed)
  const scopeFilter = await buildScopeFilter(requesterId, requesterRole);
  
  // Layer 2: User filter (from query params)
  const userFilter = buildTaskWhereClause(filters);
  
  // Combine: scope AND user filters
  const where: Prisma.TaskWhereInput = {
    AND: [scopeFilter, userFilter],
  };
  
  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      include: taskInclude,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.orderBy]: filters.orderDir },
    }),
    prisma.task.count({ where }),
  ]);
  
  return {
    data: tasks,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
```

### 6.3 Security Guarantee

The scope filter is always applied, even if the user provides conflicting query parameters:

```
User query: GET /api/tasks?assigneeId=someOtherUserId

JUNIOR_MEMBER scope filter: { assignedToId: req.user.id }
User filter: { assignedToId: 'someOtherUserId' }

Combined: { AND: [{ assignedToId: req.user.id }, { assignedToId: 'someOtherUserId' }] }
Result: Empty (no task can have two different assignedToId values)
```

The JUNIOR_MEMBER cannot see another user's tasks by passing their ID as `assigneeId`.
