# Logical Components — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 logical components implement the task management and Socket.io layer. The key components are: the socket service (initialization and emit helpers), the assignment guard (role-based permission validation), the workload service (calculation and emission), and the task filter builder (Prisma where clause construction).

---

## 2. socketService

### 2.1 Purpose

Manages the Socket.io server lifecycle: initialization, room management, and event emission helpers. Acts as the single point of access for all Socket.io operations.

### 2.2 Interface

```typescript
// backend/src/services/socket.service.ts

export function initializeSocket(httpServer: HttpServer): SocketServer;
export function getIO(): SocketServer;
export function emitToUser(userId: string, event: string, data: unknown): void;
export function emitToGroup(groupId: string, event: string, data: unknown): void;
export function emitToUsers(userIds: string[], event: string, data: unknown): void;
```

### 2.3 Full Implementation

```typescript
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';
import { verifyAccessToken } from './auth.service';
import { logger } from '../lib/logger';

let io: SocketServer | null = null;

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
    maxHttpBufferSize: 1e6,  // 1MB max message size
  });

  // JWT authentication middleware
  io.use((socket: Socket, next) => {
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

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    
    logger.info({
      event: 'SOCKET_CONNECTED',
      userId,
      socketId: socket.id,
      transport: socket.conn.transport.name,
    });

    // Auto-join personal room
    void socket.join(`user:${userId}`);

    // Group room management
    socket.on('join:group', (groupId: unknown) => {
      if (typeof groupId !== 'string') return;
      void socket.join(`group:${groupId}`);
      logger.debug({ event: 'SOCKET_JOIN_GROUP', userId, groupId });
    });

    socket.on('leave:group', (groupId: unknown) => {
      if (typeof groupId !== 'string') return;
      void socket.leave(`group:${groupId}`);
    });

    socket.on('disconnect', (reason: string) => {
      logger.info({ event: 'SOCKET_DISCONNECTED', userId, reason });
    });

    socket.on('error', (error: Error) => {
      logger.error({ event: 'SOCKET_ERROR', userId, error: error.message });
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server not initialized. Call initializeSocket() first.');
  }
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  try {
    getIO().to(`user:${userId}`).emit(event, data);
  } catch (error: unknown) {
    logger.error({
      event: 'SOCKET_EMIT_FAILED',
      targetUserId: userId,
      socketEvent: event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function emitToGroup(groupId: string, event: string, data: unknown): void {
  try {
    getIO().to(`group:${groupId}`).emit(event, data);
  } catch (error: unknown) {
    logger.error({
      event: 'SOCKET_EMIT_FAILED',
      targetGroupId: groupId,
      socketEvent: event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function emitToUsers(userIds: string[], event: string, data: unknown): void {
  const uniqueIds = Array.from(new Set(userIds));
  for (const userId of uniqueIds) {
    emitToUser(userId, event, data);
  }
}
```

---

## 3. assignmentGuard

### 3.1 Purpose

Validates that the requesting user has permission to assign a task to the specified `assignedToId`. Implemented as a service-layer function (not Express middleware) because it requires the request body.

### 3.2 Interface

```typescript
// backend/src/services/task.service.ts

export async function validateAssignmentPermission(
  assignerId: string,
  assigneeId: string
): Promise<void>;
// Throws ForbiddenError if permission is denied
// Returns void if permission is granted
```

### 3.3 Implementation

```typescript
export async function validateAssignmentPermission(
  assignerId: string,
  assigneeId: string
): Promise<void> {
  // Self-assignment is always allowed
  if (assignerId === assigneeId) return;

  const assigner = await prisma.user.findUniqueOrThrow({
    where: { id: assignerId },
    select: { role: true, name: true },
  });

  // ADMIN can assign to anyone
  if (assigner.role === 'ADMIN') return;

  // JUNIOR_MEMBER cannot assign to anyone
  if (assigner.role === 'JUNIOR_MEMBER') {
    throw new ForbiddenError('Junior members cannot assign tasks to others');
  }

  // TEAM_LEADER and TEAM_MEMBER: check hierarchy
  const descendants = await getDescendantIds(assignerId);
  
  if (!descendants.includes(assigneeId)) {
    throw new ForbiddenError(
      'You can only assign tasks to users within your team hierarchy'
    );
  }
}
```

### 3.4 Usage in Task Service

```typescript
export async function createTask(
  dto: CreateTaskDto,
  requesterId: string
): Promise<TaskWithRelations> {
  // Validate assignment permission (throws if denied)
  await validateAssignmentPermission(requesterId, dto.assignedToId);
  
  const task = await prisma.task.create({
    data: {
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: 'TODO',
      assignedById: requesterId,
      assignedToId: dto.assignedToId,
      projectId: dto.projectId ?? null,
      attachments: dto.attachments,
    },
    include: taskInclude,
  });

  // Emit events
  emitToUser(dto.assignedToId, 'task:assigned', task);
  emitToUser(requesterId, 'task:assigned', task);

  // Non-blocking workload update
  void recalculateAndEmitWorkload(dto.assignedToId);

  return task;
}
```

---

## 4. workloadService

### 4.1 Purpose

Calculates the workload percentage for a user based on their open task count and role-based max capacity. Returns a `WorkloadDto` with color tier.

### 4.2 Interface

```typescript
// backend/src/services/workload.service.ts

export async function calculateWorkload(userId: string): Promise<WorkloadDto>;
```

### 4.3 Implementation

```typescript
import { WorkloadDto, Role } from '@tms/shared';
import { prisma } from '../lib/prisma';

const MAX_CAPACITY: Record<Role, number> = {
  ADMIN: 20,
  TEAM_LEADER: 15,
  TEAM_MEMBER: 10,
  JUNIOR_MEMBER: 7,
};

const OPEN_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW'] as const;

export async function calculateWorkload(userId: string): Promise<WorkloadDto> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      role: true,
      _count: {
        select: {
          tasksReceived: {
            where: {
              status: { in: OPEN_STATUSES },
            },
          },
        },
      },
    },
  });

  const openTasks = user._count.tasksReceived;
  const maxCapacity = MAX_CAPACITY[user.role as Role];
  
  // Clamp to [0, 100]
  const rawPercentage = (openTasks / maxCapacity) * 100;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  const colorTier: WorkloadDto['colorTier'] =
    percentage <= 40 ? 'green' :
    percentage <= 70 ? 'amber' :
    'red';

  return {
    userId,
    openTasks,
    maxCapacity,
    percentage,
    colorTier,
  };
}

export async function calculateWorkloadBatch(
  userIds: string[]
): Promise<Map<string, WorkloadDto>> {
  const results = await Promise.all(
    userIds.map(async (userId) => {
      const workload = await calculateWorkload(userId);
      return [userId, workload] as const;
    })
  );
  return new Map(results);
}
```

---

## 5. taskFilters

### 5.1 Purpose

Builds the Prisma `where` clause from a `TaskFiltersDto`. Separates the filter-building logic from the query execution.

### 5.2 Interface

```typescript
// backend/src/services/task.service.ts

export function buildTaskWhereClause(
  filters: TaskFiltersDto
): Prisma.TaskWhereInput;

export async function buildScopeFilter(
  userId: string,
  role: Role
): Promise<Prisma.TaskWhereInput>;
```

### 5.3 Implementation

```typescript
import { Prisma } from '@prisma/client';
import { Role, TaskFiltersDto } from '@tms/shared';

export function buildTaskWhereClause(
  filters: Partial<TaskFiltersDto>
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  if (filters.assigneeId) {
    where.assignedToId = filters.assigneeId;
  }

  if (filters.assignedById) {
    where.assignedById = filters.assignedById;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.dueDate = {};
    if (filters.dateFrom) {
      where.dueDate.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.dueDate.lte = new Date(filters.dateTo);
    }
  }

  return where;
}

export async function buildScopeFilter(
  userId: string,
  role: Role
): Promise<Prisma.TaskWhereInput> {
  // ADMIN sees everything
  if (role === 'ADMIN') return {};

  // JUNIOR_MEMBER sees only their own tasks
  if (role === 'JUNIOR_MEMBER') {
    return { assignedToId: userId };
  }

  // TL and TM see tasks in their subtree + tasks they assigned
  const descendants = await getDescendantIds(userId);
  const scopedUserIds = [userId, ...descendants];

  return {
    OR: [
      { assignedToId: { in: scopedUserIds } },
      { assignedById: userId },
    ],
  };
}
```

---

## 6. Component Dependency Graph

```
task.routes.ts
    │
    ├── authMiddleware              ← middleware/auth.ts
    ├── roleGuard                  ← middleware/roleGuard.ts
    ├── zodValidate                ← middleware/zodValidate.ts
    │
    └── task.service.ts
        ├── validateAssignmentPermission
        │   └── user.service.ts (getDescendantIds)
        │       └── lib/prisma.ts
        ├── buildScopeFilter
        │   └── user.service.ts (getDescendantIds)
        ├── buildTaskWhereClause
        ├── workload.service.ts (calculateWorkload)
        │   └── lib/prisma.ts
        ├── socket.service.ts (emitToUser, emitToUsers)
        │   └── socket.io (getIO)
        └── lib/prisma.ts

socket.service.ts
    ├── auth.service.ts (verifyAccessToken)
    └── lib/logger.ts
```

---

## 7. Route Handler Summary

```typescript
// backend/src/routes/task.routes.ts

const router = Router();

// Task CRUD
router.get('/', authMiddleware, zodValidate(TaskFiltersSchema, 'query'), listTasksHandler);
router.post('/', authMiddleware, zodValidate(CreateTaskSchema), createTaskHandler);
router.get('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), getTaskHandler);
router.patch('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(UpdateTaskSchema), updateTaskHandler);
router.delete('/:id', authMiddleware, roleGuard(['ADMIN']), zodValidate(IdParamSchema, 'params'), deleteTaskHandler);

// Status update
router.patch('/:id/status', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(UpdateTaskStatusSchema), updateTaskStatusHandler);

// Comments
router.get('/:id/comments', authMiddleware, zodValidate(IdParamSchema, 'params'), getCommentsHandler);
router.post('/:id/comments', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(CreateCommentSchema), createCommentHandler);

// Time logs
router.get('/:id/time-logs', authMiddleware, zodValidate(IdParamSchema, 'params'), getTimeLogsHandler);
router.post('/:id/time-logs', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(CreateTimeLogSchema), createTimeLogHandler);

export { router as taskRouter };
```
