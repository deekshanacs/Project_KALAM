# Domain Entities — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 3 domain entities cover the task management layer: the Task entity with all fields, Comment and TimeLog supporting entities, all request/response DTOs for task endpoints, and the filter DTO for task queries.

---

## 2. Task Entity

### 2.1 Prisma Model (defined in Unit 1)

```prisma
model Task {
  id           String     @id @default(cuid())
  title        String                          // 1-200 characters
  description  String?                         // optional, rich text or plain text
  status       TaskStatus @default(TODO)
  priority     Priority   @default(MEDIUM)
  dueDate      DateTime?                       // optional deadline
  completedAt  DateTime?                       // set when status = DONE, cleared otherwise
  attachments  Json       @default("[]")       // string[] of file URLs, max 10

  assignedById String                          // user who created/assigned the task
  assignedToId String                          // user responsible for the task
  projectId    String?                         // optional project grouping

  assignedBy   User       @relation("TaskAssignedBy", fields: [assignedById], references: [id])
  assignedTo   User       @relation("TaskAssignedTo", fields: [assignedToId], references: [id])
  project      Project?   @relation(fields: [projectId], references: [id])

  comments     Comment[]
  timeLogs     TimeLog[]

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@map("tasks")
}
```

### 2.2 TypeScript Interface

```typescript
// In @tms/shared
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;              // ISO 8601 date string
  completedAt: string | null;          // ISO 8601, set when DONE
  attachments: string[];               // array of file URLs, max 10
  assignedById: string;
  assignedToId: string;
  projectId: string | null;
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}
```

### 2.3 TaskWithRelations (API Response Type)

```typescript
export interface TaskWithRelations extends Task {
  assignedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: Role;
  };
  assignedTo: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: Role;
  };
  project: {
    id: string;
    name: string;
  } | null;
  _count: {
    comments: number;
    timeLogs: number;
  };
}
```

### 2.4 Prisma Include Clause (reused across queries)

```typescript
// backend/src/services/task.service.ts

export const taskInclude = {
  assignedBy: {
    select: { id: true, name: true, avatarUrl: true, role: true },
  },
  assignedTo: {
    select: { id: true, name: true, avatarUrl: true, role: true },
  },
  project: {
    select: { id: true, name: true },
  },
  _count: {
    select: { comments: true, timeLogs: true },
  },
} as const;
```

---

## 3. Comment Entity

### 3.1 Prisma Model

```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String                            // 1-5000 characters
  taskId    String
  authorId  String

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("comments")
}
```

### 3.2 TypeScript Interface

```typescript
export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}
```

---

## 4. TimeLog Entity

### 4.1 Prisma Model

```prisma
model TimeLog {
  id        String   @id @default(cuid())
  hours     Float                             // positive, max 24 per entry
  note      String?                           // optional description
  taskId    String
  userId    String

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())

  @@map("time_logs")
}
```

### 4.2 TypeScript Interface

```typescript
export interface TimeLog {
  id: string;
  hours: number;
  note: string | null;
  taskId: string;
  userId: string;
  createdAt: string;
}

export interface TimeLogWithUser extends TimeLog {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface TimeLogSummary {
  timeLogs: TimeLogWithUser[];
  totalHours: number;
}
```

---

## 5. Request DTOs (Zod Schemas)

### 5.1 Task Creation

```typescript
// backend/src/schemas/task.schemas.ts
import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(10000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().cuid('Invalid user ID'),
  projectId: z.string().cuid().optional().nullable(),
  attachments: z.array(z.string().url()).max(10, 'Maximum 10 attachments').default([]),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
```

### 5.2 Task Update

```typescript
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(10000).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional().nullable(),
  attachments: z.array(z.string().url()).max(10).optional(),
});

export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
```

### 5.3 Task Status Update

```typescript
export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
});

export type UpdateTaskStatusDto = z.infer<typeof UpdateTaskStatusSchema>;
```

### 5.4 Task Filters (Query Parameters)

```typescript
export const TaskFiltersSchema = z.object({
  assigneeId: z.string().cuid().optional(),
  assignedById: z.string().cuid().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  projectId: z.string().cuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  orderBy: z.enum(['createdAt', 'dueDate', 'priority', 'status']).default('createdAt'),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
});

export type TaskFiltersDto = z.infer<typeof TaskFiltersSchema>;
```

### 5.5 Comment Creation

```typescript
export const CreateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment too long (max 5000 characters)')
    .trim(),
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;
```

### 5.6 Time Log Creation

```typescript
export const CreateTimeLogSchema = z.object({
  hours: z.number()
    .positive('Hours must be positive')
    .max(24, 'Cannot log more than 24 hours per entry')
    .multipleOf(0.25, 'Hours must be in 15-minute increments'),
  note: z.string().max(500).optional(),
});

export type CreateTimeLogDto = z.infer<typeof CreateTimeLogSchema>;
```

---

## 6. Response DTOs

### 6.1 Task Responses

```typescript
export interface TaskResponse {
  task: TaskWithRelations;
}

export interface TaskListResponse {
  data: TaskWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 6.2 Comment Responses

```typescript
export interface CommentResponse {
  comment: CommentWithAuthor;
}

export interface CommentListResponse {
  comments: CommentWithAuthor[];
}
```

### 6.3 Time Log Responses

```typescript
export interface TimeLogResponse {
  timeLog: TimeLogWithUser;
}

export interface TimeLogListResponse {
  timeLogs: TimeLogWithUser[];
  totalHours: number;
}
```

---

## 7. Socket.io Event Payloads

### 7.1 Task Events

```typescript
// Emitted when a task is assigned to a user
export interface TaskAssignedEvent {
  task: TaskWithRelations;
  assignedBy: {
    id: string;
    name: string;
  };
}

// Emitted when a task is updated (status, fields, etc.)
export interface TaskUpdatedEvent {
  task: TaskWithRelations;
  updatedBy: {
    id: string;
    name: string;
  };
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}
```

### 7.2 Workload Update Event

```typescript
// Emitted after task status change triggers workload recalculation
export interface WorkloadUpdateEvent {
  userId: string;
  workload: WorkloadDto;
}
```

### 7.3 Notification Event

```typescript
export interface NotificationDto {
  id: string;                          // client-generated UUID
  type: 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'MESSAGE_RECEIVED' | 'DOCUMENT_SHARED';
  title: string;
  message: string;
  data: Record<string, unknown>;       // type-specific payload
  createdAt: string;                   // ISO 8601
  read: boolean;                       // false on creation
}
```

---

## 8. Prisma Where Clause Builder

### 8.1 Task Filter Builder

```typescript
// backend/src/services/task.service.ts
import { Prisma } from '@prisma/client';

export function buildTaskWhereClause(
  filters: TaskFiltersDto,
  scopeFilter: Prisma.TaskWhereInput
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    ...scopeFilter,
  };

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
    where.dueDate = {
      ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
      ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
    };
  }

  return where;
}
```

### 8.2 Scope Filter by Role

```typescript
export async function buildScopeFilter(
  userId: string,
  role: Role
): Promise<Prisma.TaskWhereInput> {
  if (role === 'ADMIN') {
    return {};  // No scope restriction
  }

  if (role === 'JUNIOR_MEMBER') {
    return { assignedToId: userId };
  }

  // TL and TM: see tasks in their subtree + tasks they assigned
  const descendants = await getDescendantIds(userId);
  return {
    OR: [
      { assignedToId: { in: [userId, ...descendants] } },
      { assignedById: userId },
    ],
  };
}
```
