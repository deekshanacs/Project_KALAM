# Business Logic Model — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 implements the task management system with role-based assignment enforcement, Kanban status transitions, comment threads, time tracking, and real-time Socket.io events. The Socket.io server is initialized here and used by all subsequent units.

---

## 2. Socket.io Server Initialization

### 2.1 Attachment to HTTP Server

Socket.io must attach to the same HTTP server as Express. The HTTP server is created in `index.ts` and passed to both Express and Socket.io.

```typescript
// backend/src/index.ts
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { initializeSocket } from './services/socket.service';

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.io on the same HTTP server
const io = initializeSocket(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`[Startup] Server + Socket.io listening on port ${env.PORT}`);
});
```

### 2.2 Socket.io Configuration

```typescript
// backend/src/services/socket.service.ts
import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { verifyAccessToken } from './auth.service';
import { logger } from '../lib/logger';

let io: SocketServer;

export function initializeSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT authentication middleware for Socket.io
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
      next(new Error('Invalid or expired token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    logger.info({ event: 'SOCKET_CONNECTED', userId, socketId: socket.id });
    
    // Join user's personal room
    void socket.join(`user:${userId}`);
    
    // Handle group room joins
    socket.on('join:group', (groupId: string) => {
      void socket.join(`group:${groupId}`);
      logger.debug({ event: 'SOCKET_JOIN_GROUP', userId, groupId });
    });
    
    socket.on('leave:group', (groupId: string) => {
      void socket.leave(`group:${groupId}`);
    });
    
    socket.on('disconnect', (reason) => {
      logger.info({ event: 'SOCKET_DISCONNECTED', userId, reason });
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
```

---

## 3. Socket.io Room Strategy

### 3.1 Room Types

| Room Name | Format | Who Joins | Purpose |
|---|---|---|---|
| User room | `user:{userId}` | Each user on connect | Personal notifications, task updates |
| Group room | `group:{groupId}` | Members on request | Group chat messages |

### 3.2 Room Join Flow

```
Client connects with JWT token
      │
      ▼
Socket.io auth middleware verifies token
      │
      ▼
socket.join(`user:{userId}`)  ← automatic on connect
      │
      ▼
Client emits 'join:group' for each group they belong to
      │
      ▼
socket.join(`group:{groupId}`)
```

### 3.3 Emit Helpers

```typescript
// backend/src/services/socket.service.ts

export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}

export function emitToGroup(groupId: string, event: string, data: unknown): void {
  getIO().to(`group:${groupId}`).emit(event, data);
}

export function emitToAll(event: string, data: unknown): void {
  getIO().emit(event, data);
}
```

---

## 4. Role-Based Assignment Validation Algorithm

### 4.1 Algorithm

```typescript
// backend/src/services/task.service.ts

export async function validateAssignmentPermission(
  assignerId: string,
  assigneeId: string
): Promise<void> {
  // Self-assignment is always allowed
  if (assignerId === assigneeId) return;
  
  const assigner = await prisma.user.findUniqueOrThrow({
    where: { id: assignerId },
    select: { role: true },
  });
  
  // ADMIN can assign to anyone
  if (assigner.role === 'ADMIN') return;
  
  // JUNIOR_MEMBER cannot assign to anyone
  if (assigner.role === 'JUNIOR_MEMBER') {
    throw new ForbiddenError('Junior members cannot assign tasks');
  }
  
  // TL and TM: assignee must be in their subtree
  const descendants = await getDescendantIds(assignerId);
  if (!descendants.includes(assigneeId)) {
    throw new ForbiddenError(
      'You can only assign tasks to users within your team hierarchy'
    );
  }
}
```

### 4.2 Permission Matrix

| Assigner Role | Can Assign To |
|---|---|
| ADMIN | Any user in the system |
| TEAM_LEADER | Own TMs + those TMs' JTMs (full subtree) |
| TEAM_MEMBER | Own JTMs only |
| JUNIOR_MEMBER | Nobody (throws ForbiddenError) |

---

## 5. Task CRUD Operations

### 5.1 Create Task

```
POST /api/tasks
Body: { title, description?, priority?, dueDate?, assignedToId, projectId?, attachments? }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(CreateTaskSchema)
      │
      ▼
3. validateAssignmentPermission(req.user.id, assignedToId)
      │
      ├── Permission denied → 403 Forbidden
      │
      ▼
4. prisma.task.create({
     data: {
       title, description, priority, dueDate,
       status: 'TODO',
       assignedById: req.user.id,
       assignedToId,
       projectId,
       attachments: attachments ?? [],
     }
   })
      │
      ▼
5. Emit Socket.io event: emitToUser(assignedToId, 'task:assigned', taskData)
      │
      ▼
6. Emit notification: emitToUser(assignedToId, 'notification:new', notificationData)
      │
      ▼
7. Recalculate workload: workloadService.calculateWorkload(assignedToId)
      │
      ▼
8. Emit workload update: emitToUser(assignedToId, 'user:workload-update', workloadData)
      │
      ▼
9. Return 201: { task: TaskWithRelations }
```

### 5.2 Update Task Status

```
PATCH /api/tasks/:id/status
Body: { status: TaskStatus }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(UpdateStatusSchema)
      │
      ▼
3. Fetch task: prisma.task.findUniqueOrThrow({ where: { id } })
      │
      ▼
4. Permission check: req.user.id === task.assignedToId OR req.user.id === task.assignedById OR ADMIN
      │
      ▼
5. Update task:
   prisma.task.update({
     where: { id },
     data: {
       status,
       completedAt: status === 'DONE' ? new Date() : null,
       updatedAt: new Date(),
     }
   })
      │
      ▼
6. Emit: emitToUser(task.assignedToId, 'task:updated', updatedTask)
         emitToUser(task.assignedById, 'task:updated', updatedTask)
      │
      ▼
7. Recalculate workload (non-blocking):
   workloadService.calculateWorkload(task.assignedToId)
     .then(workload => emitToUser(task.assignedToId, 'user:workload-update', workload))
     .catch(err => logger.error('Workload recalculation failed', err))
      │
      ▼
8. Return 200: { task: TaskWithRelations }
```

### 5.3 Task List with Filters

```
GET /api/tasks
Query: { assigneeId?, assignedById?, status?, priority?, projectId?, dateFrom?, dateTo?, page?, pageSize? }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(TaskListQuerySchema, 'query')
      │
      ▼
3. Build scope filter based on role:
   - ADMIN: no scope restriction
   - TEAM_LEADER: tasks where assignedToId IN subtree OR assignedById = req.user.id
   - TEAM_MEMBER: tasks where assignedToId IN subtree OR assignedById = req.user.id
   - JUNIOR_MEMBER: tasks where assignedToId = req.user.id
      │
      ▼
4. Build Prisma where clause from filters + scope
      │
      ▼
5. prisma.task.findMany({ where, include, skip, take, orderBy })
      │
      ▼
6. Return 200: PaginatedResponse<TaskWithRelations>
```

---

## 6. Task Status Machine

### 6.1 Status Transitions

All transitions are permitted in any direction. There is no strict state machine — users can move tasks freely between columns.

```
TODO ◄──────────────────────────────────────────► DONE
  │                                                  │
  ▼                                                  ▼
IN_PROGRESS ◄──────────────────────────────────► REVIEW
```

**Allowed transitions** (all combinations):
- TODO → IN_PROGRESS, REVIEW, DONE
- IN_PROGRESS → TODO, REVIEW, DONE
- REVIEW → TODO, IN_PROGRESS, DONE
- DONE → TODO, IN_PROGRESS, REVIEW

**completedAt behavior**:
- Set to `new Date()` when status transitions TO `DONE`
- Set to `null` when status transitions FROM `DONE` to any other status

---

## 7. Workload Recalculation Trigger

### 7.1 Trigger Points

Workload is recalculated whenever a task's status changes. This is a side effect of the status update, not a blocking operation.

```typescript
// backend/src/services/task.service.ts

async function recalculateAndEmitWorkload(userId: string): Promise<void> {
  try {
    const workload = await workloadService.calculateWorkload(userId);
    emitToUser(userId, 'user:workload-update', workload);
  } catch (error: unknown) {
    // Non-blocking: log but don't fail the main operation
    logger.error({
      event: 'WORKLOAD_RECALCULATION_FAILED',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  requesterId: string
): Promise<TaskWithRelations> {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  
  // Permission check
  if (
    requesterId !== task.assignedToId &&
    requesterId !== task.assignedById &&
    !(await isAdmin(requesterId))
  ) {
    throw new ForbiddenError('Cannot update this task');
  }
  
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      completedAt: newStatus === 'DONE' ? new Date() : null,
    },
    include: taskInclude,
  });
  
  // Emit task update to both parties
  emitToUser(task.assignedToId, 'task:updated', updatedTask);
  emitToUser(task.assignedById, 'task:updated', updatedTask);
  
  // Non-blocking workload recalculation
  void recalculateAndEmitWorkload(task.assignedToId);
  
  return updatedTask;
}
```

---

## 8. Comment Thread

### 8.1 Add Comment

```
POST /api/tasks/:id/comments
Body: { content: string }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(CreateCommentSchema)
      │
      ▼
3. Verify task exists and user has access (assignedTo, assignedBy, or ADMIN)
      │
      ▼
4. prisma.comment.create({
     data: { content, taskId: id, authorId: req.user.id }
   })
      │
      ▼
5. Emit: emitToUser(task.assignedToId, 'task:comment-added', commentData)
         emitToUser(task.assignedById, 'task:comment-added', commentData)
      │
      ▼
6. Return 201: { comment: CommentWithAuthor }
```

### 8.2 Get Comments

```
GET /api/tasks/:id/comments
      │
      ▼
1. authMiddleware
      │
      ▼
2. Verify task access
      │
      ▼
3. prisma.comment.findMany({
     where: { taskId: id },
     include: { author: { select: { id, name, avatarUrl } } },
     orderBy: { createdAt: 'asc' }
   })
      │
      ▼
4. Return 200: { comments: CommentWithAuthor[] }
```

---

## 9. Time Tracking

### 9.1 Log Time

```
POST /api/tasks/:id/time-logs
Body: { hours: number, note?: string }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(CreateTimeLogSchema)
      │
      ▼
3. Validate: hours > 0 AND hours <= 24
      │
      ▼
4. Verify task exists and user has access
      │
      ▼
5. prisma.timeLog.create({
     data: { hours, note, taskId: id, userId: req.user.id }
   })
      │
      ▼
6. Return 201: { timeLog: TimeLog }
```

### 9.2 Get Time Logs

```
GET /api/tasks/:id/time-logs
      │
      ▼
1. authMiddleware
      │
      ▼
2. Verify task access
      │
      ▼
3. prisma.timeLog.findMany({
     where: { taskId: id },
     include: { user: { select: { id, name, avatarUrl } } },
     orderBy: { createdAt: 'desc' }
   })
      │
      ▼
4. Calculate total hours: sum of all entries
      │
      ▼
5. Return 200: { timeLogs: TimeLogWithUser[], totalHours: number }
```

---

## 10. Socket.io Events Reference

| Event Name | Direction | Payload | Trigger |
|---|---|---|---|
| `task:assigned` | Server → Client | `TaskWithRelations` | New task created |
| `task:updated` | Server → Client | `TaskWithRelations` | Task status/fields updated |
| `task:comment-added` | Server → Client | `CommentWithAuthor` | New comment on task |
| `user:workload-update` | Server → Client | `WorkloadDto` | Task status changed |
| `user:status-change` | Server → Client | `{ userId, availabilityStatus }` | User updates availability |
| `notification:new` | Server → Client | `NotificationDto` | Any notification trigger |
| `join:group` | Client → Server | `groupId: string` | Client joins group room |
| `leave:group` | Client → Server | `groupId: string` | Client leaves group room |

---

## 11. Testable Properties (PBT-01)

### 11.1 Invariant: Workload Percentage Always in [0, 100] (PBT-03)

```typescript
fc.assert(
  fc.property(
    fc.nat({ max: 10000 }),
    fc.constantFrom<Role>('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    (openTasks, role) => {
      const maxCapacity = MAX_CAPACITY[role];
      const percentage = Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
      return percentage >= 0 && percentage <= 100;
    }
  )
);
```

### 11.2 Invariant: Assignment Permission Check is Deterministic (PBT-03)

```typescript
// Property: canAssign(assignerId, assigneeId) returns the same result for the same inputs
fc.assert(
  fc.asyncProperty(
    fc.constantFrom(...seedUserIds),
    fc.constantFrom(...seedUserIds),
    async (assignerId, assigneeId) => {
      const result1 = await canAssign(assignerId, assigneeId);
      const result2 = await canAssign(assignerId, assigneeId);
      return result1 === result2;
    }
  )
);
```

### 11.3 Idempotent: Updating Task Status to Same Status is Safe (PBT-04)

```typescript
// Property: updating a task to its current status produces the same result as updating once
fc.assert(
  fc.asyncProperty(
    fc.constantFrom(...seedTaskIds),
    fc.constantFrom<TaskStatus>('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
    async (taskId, status) => {
      const task1 = await updateTaskStatus(taskId, status, adminId);
      const task2 = await updateTaskStatus(taskId, status, adminId);
      return task1.status === task2.status && task1.status === status;
    }
  )
);
```

### 11.4 Round-Trip: Task Serialization → Deserialization Preserves All Fields (PBT-02)

```typescript
// Property: JSON.stringify then JSON.parse preserves all task fields
fc.assert(
  fc.property(
    fc.record({
      id: fc.string({ minLength: 1 }),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      status: fc.constantFrom<TaskStatus>('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
      priority: fc.constantFrom<Priority>('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
      attachments: fc.array(fc.webUrl(), { maxLength: 10 }),
    }),
    (task) => {
      const serialized = JSON.stringify(task);
      const deserialized = JSON.parse(serialized) as typeof task;
      return (
        deserialized.id === task.id &&
        deserialized.title === task.title &&
        deserialized.status === task.status &&
        deserialized.priority === task.priority &&
        deserialized.attachments.length === task.attachments.length
      );
    }
  )
);
```
