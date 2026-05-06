# Domain Entities — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

This document defines all domain entities for Unit 1. These entities form the persistent data layer of the TMS system. Every entity is defined in three places that must remain in sync:

1. **Prisma schema** (`backend/prisma/schema.prisma`) — the authoritative database definition
2. **Shared TypeScript interfaces** (`shared/src/types/index.ts`) — the type contract used by both frontend and backend
3. **This document** — the human-readable specification

---

## 2. Enumerations

### 2.1 Role

Defines the four-level user hierarchy. Numeric weight is used for permission comparisons.

| Value | Weight | Description |
|---|---|---|
| `ADMIN` | 4 | Full system access; can assign tasks to anyone; can restructure entire org chart |
| `TEAM_LEADER` | 3 | Can assign tasks to own TMs and their JTMs; can restructure own subtree |
| `TEAM_MEMBER` | 2 | Can assign tasks to own JTMs only |
| `JUNIOR_MEMBER` | 1 | Cannot assign tasks; receives tasks only |

```prisma
enum Role {
  ADMIN
  TEAM_LEADER
  TEAM_MEMBER
  JUNIOR_MEMBER
}
```

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  JUNIOR_MEMBER = 'JUNIOR_MEMBER',
}

export const ROLE_WEIGHT: Record<Role, number> = {
  [Role.ADMIN]: 4,
  [Role.TEAM_LEADER]: 3,
  [Role.TEAM_MEMBER]: 2,
  [Role.JUNIOR_MEMBER]: 1,
};
```

### 2.2 TaskStatus

Represents the four Kanban columns. Transitions are unrestricted — any status can move to any other status.

| Value | Kanban Column | Description |
|---|---|---|
| `TODO` | Column 1 | Task created, not yet started |
| `IN_PROGRESS` | Column 2 | Actively being worked on |
| `REVIEW` | Column 3 | Submitted for review |
| `DONE` | Column 4 | Completed |

```prisma
enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}
```

```typescript
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

// Open statuses count toward workload
export const OPEN_STATUSES: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
];
```

### 2.3 Priority

Task urgency levels, displayed as color-coded badges on task cards.

| Value | Badge Color | Description |
|---|---|---|
| `LOW` | Gray | Non-urgent, background work |
| `MEDIUM` | Blue | Standard priority |
| `HIGH` | Orange | Important, time-sensitive |
| `URGENT` | Red | Critical, immediate attention required |

```prisma
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

```typescript
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

### 2.4 AvailabilityStatus

User's current availability, shown as a colored ring around their avatar.

| Value | Ring Color | Description |
|---|---|---|
| `AVAILABLE` | Green | Ready to receive tasks and messages |
| `IN_CALL` | Yellow | Currently in a video/audio call |
| `AWAY` | Orange | Temporarily unavailable |
| `OFFLINE` | Gray | Not connected |

```prisma
enum AvailabilityStatus {
  AVAILABLE
  IN_CALL
  AWAY
  OFFLINE
}
```

```typescript
export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALL = 'IN_CALL',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}
```

### 2.5 MessageType

Classifies the content type of a chat message.

| Value | Description |
|---|---|
| `TEXT` | Plain or rich text message |
| `FILE` | File attachment (non-image) |
| `IMAGE` | Image attachment |
| `LINK` | URL with link preview card |

```prisma
enum MessageType {
  TEXT
  FILE
  IMAGE
  LINK
}
```

```typescript
export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  LINK = 'LINK',
}
```

### 2.6 ProjectStatus

Lifecycle state of a project.

| Value | Description |
|---|---|
| `ACTIVE` | Currently in progress |
| `ON_HOLD` | Paused temporarily |
| `COMPLETED` | Finished successfully |
| `ARCHIVED` | Closed, read-only |

```prisma
enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}
```

```typescript
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}
```

---

## 3. Core Entities

### 3.1 User

The central entity of the TMS system. Users exist in a self-referential hierarchy via `supervisorId`.

#### Prisma Model

```prisma
model User {
  id                 String             @id @default(cuid())
  email              String             @unique
  name               String
  password           String             // bcrypt hash, never returned in API responses
  role               Role               @default(JUNIOR_MEMBER)
  availabilityStatus AvailabilityStatus @default(OFFLINE)
  avatarUrl          String?            // URL to uploaded avatar image

  // Org hierarchy self-relation
  supervisorId       String?
  supervisor         User?              @relation("UserHierarchy", fields: [supervisorId], references: [id])
  subordinates       User[]             @relation("UserHierarchy")

  // Relations (see full schema in business-logic-model.md)
  tasksAssigned      Task[]             @relation("TaskAssignedBy")
  tasksReceived      Task[]             @relation("TaskAssignedTo")
  messagesSent       Message[]          @relation("MessageSender")
  messagesReceived   Message[]          @relation("MessageReceiver")
  groupsCreated      Group[]            @relation("GroupCreator")
  groupMemberships   GroupMember[]
  documentsOwned     Document[]         @relation("DocumentOwner")
  projectsOwned      Project[]          @relation("ProjectOwner")
  refreshTokens      RefreshToken[]
  comments           Comment[]
  timeLogs           TimeLog[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@map("users")
}
```

#### TypeScript Interface

```typescript
export interface User {
  id: string;                          // cuid
  email: string;                       // unique, lowercase
  name: string;                        // display name
  role: Role;
  availabilityStatus: AvailabilityStatus;
  avatarUrl: string | null;
  supervisorId: string | null;         // null for Admin (root node)
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
  // NOTE: password is NEVER included in this interface
}

// Safe user type for API responses (no password)
export type SafeUser = Omit<User, never>; // password excluded at service layer

// User with populated supervisor
export interface UserWithSupervisor extends User {
  supervisor: Pick<User, 'id' | 'name' | 'role'> | null;
}
```

#### Field Constraints

| Field | Constraint | Notes |
|---|---|---|
| `id` | Auto-generated cuid | Globally unique |
| `email` | Unique, required | Validated as email format |
| `name` | Required, non-empty | 1–100 characters |
| `password` | Required | Stored as bcrypt hash only |
| `role` | Default: JUNIOR_MEMBER | Admin assigns roles post-registration |
| `availabilityStatus` | Default: OFFLINE | Updated by user or on socket disconnect |
| `supervisorId` | Nullable | Null only for the root Admin |

---

### 3.2 Task

Represents a unit of work assigned from one user to another.

#### Prisma Model

```prisma
model Task {
  id           String     @id @default(cuid())
  title        String                          // required, 1–200 chars
  description  String?                         // optional rich text
  status       TaskStatus @default(TODO)
  priority     Priority   @default(MEDIUM)
  dueDate      DateTime?                       // optional deadline
  completedAt  DateTime?                       // set when status → DONE
  attachments  Json       @default("[]")       // string[] of file URLs

  assignedById String
  assignedToId String
  projectId    String?

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

#### TypeScript Interface

```typescript
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
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithRelations extends Task {
  assignedBy: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  assignedTo: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  project: Pick<Project, 'id' | 'name'> | null;
  _count: {
    comments: number;
    timeLogs: number;
  };
}
```

---

### 3.3 Message

Represents a chat message, either direct (receiverId set) or group (groupId set).

#### Prisma Model

```prisma
model Message {
  id          String      @id @default(cuid())
  content     String?                          // null when deleted
  type        MessageType @default(TEXT)
  attachments Json        @default("[]")       // string[] of file URLs
  readBy      Json        @default("[]")       // string[] of userIds
  editedAt    DateTime?                        // set on edit
  deletedAt   DateTime?                        // soft delete timestamp

  senderId    String
  receiverId  String?                          // set for DMs
  groupId     String?                          // set for group messages

  sender      User        @relation("MessageSender", fields: [senderId], references: [id])
  receiver    User?       @relation("MessageReceiver", fields: [receiverId], references: [id])
  group       Group?      @relation(fields: [groupId], references: [id])

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("messages")
}
```

#### TypeScript Interface

```typescript
export interface Message {
  id: string;
  content: string | null;              // null = deleted
  type: MessageType;
  attachments: string[];
  readBy: string[];                    // array of userIds who have read this
  editedAt: string | null;
  deletedAt: string | null;            // soft delete
  senderId: string;
  receiverId: string | null;           // DM target
  groupId: string | null;              // group target
  createdAt: string;
  updatedAt: string;
}

export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}
```

---

### 3.4 Group

A named chat group with multiple members.

#### Prisma Models

```prisma
model Group {
  id          String        @id @default(cuid())
  name        String
  createdById String

  createdBy   User          @relation("GroupCreator", fields: [createdById], references: [id])
  members     GroupMember[]
  messages    Message[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("groups")
}

model GroupMember {
  id        String   @id @default(cuid())
  groupId   String
  userId    String

  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  joinedAt  DateTime @default(now())

  @@unique([groupId, userId])          // prevents duplicate membership
  @@map("group_members")
}
```

#### TypeScript Interfaces

```typescript
export interface Group {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    user: Pick<User, 'id' | 'name' | 'avatarUrl' | 'role'>;
    joinedAt: string;
  }>;
  _count: {
    messages: number;
  };
}
```

---

### 3.5 Document

A rich-text document created and optionally shared by users.

#### Prisma Model

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  content     Json     @default("{}")          // TipTap JSON content
  font        String   @default("Inter")
  fontSize    Int      @default(12)
  theme       String   @default("light")       // 'light' | 'dark' | custom
  pageSize    String   @default("A4")          // 'A4' | 'Letter' | 'Legal'
  sharedWith  Json     @default("[]")          // DocumentShare[]

  ownerId     String
  owner       User     @relation("DocumentOwner", fields: [ownerId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("documents")
}
```

#### TypeScript Interfaces

```typescript
export interface Document {
  id: string;
  title: string;
  content: Record<string, unknown>;    // TipTap JSON
  font: string;
  fontSize: number;
  theme: string;
  pageSize: string;
  sharedWith: DocumentShare[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentShare {
  userId?: string;
  groupId?: string;
  permission: 'VIEW' | 'EDIT';
}
```

---

### 3.6 Project

A container for grouping related tasks.

#### Prisma Model

```prisma
model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  ownerId     String

  owner       User          @relation("ProjectOwner", fields: [ownerId], references: [id])
  tasks       Task[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("projects")
}
```

#### TypeScript Interface

```typescript
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Supporting Entities

### 4.1 RefreshToken

Stores hashed refresh tokens for JWT rotation. Revoked tokens are soft-deleted via `revokedAt`.

```prisma
model RefreshToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique                  // SHA-256 hash of the raw token
  userId    String
  expiresAt DateTime
  revokedAt DateTime?                          // null = active

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())

  @@map("refresh_tokens")
}
```

```typescript
export interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}
```

### 4.2 Comment

A comment on a task, forming a discussion thread.

```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String                            // max 5000 chars
  taskId    String
  authorId  String

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("comments")
}
```

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
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}
```

### 4.3 TimeLog

A time entry logged by a user against a task.

```prisma
model TimeLog {
  id        String   @id @default(cuid())
  hours     Float                             // positive, max 24 per entry
  note      String?
  taskId    String
  userId    String

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())

  @@map("time_logs")
}
```

```typescript
export interface TimeLog {
  id: string;
  hours: number;
  note: string | null;
  taskId: string;
  userId: string;
  createdAt: string;
}
```

---

## 5. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                       │
└─────────────────────────────────────────────────────────────────────┘

User ──[supervisorId]──► User          (self-relation, org hierarchy)
User ──[1:N]──────────► Task           (assignedBy)
User ──[1:N]──────────► Task           (assignedTo)
User ──[1:N]──────────► Message        (sender)
User ──[1:N]──────────► Message        (receiver, nullable)
User ──[1:N]──────────► GroupMember    (join table)
User ──[1:N]──────────► Group          (createdBy)
User ──[1:N]──────────► Document       (owner)
User ──[1:N]──────────► Project        (owner)
User ──[1:N]──────────► RefreshToken   (auth)
User ──[1:N]──────────► Comment        (author)
User ──[1:N]──────────► TimeLog        (logger)

Task ──[1:N]──────────► Comment        (thread)
Task ──[1:N]──────────► TimeLog        (time entries)
Task ──[N:1]──────────► Project        (optional grouping)

Group ──[1:N]─────────► GroupMember    (membership)
Group ──[1:N]─────────► Message        (group messages)
```

---

## 6. Workload Calculation Entity

Not a database model — computed on demand.

```typescript
export interface WorkloadDto {
  userId: string;
  openTasks: number;                   // count of TODO + IN_PROGRESS + REVIEW tasks
  maxCapacity: number;                 // role-based max: ADMIN=20, TL=15, TM=10, JTM=7
  percentage: number;                  // (openTasks / maxCapacity) * 100, clamped to [0, 100]
  colorTier: 'green' | 'amber' | 'red'; // green: 0-40%, amber: 41-70%, red: 71-100%
}

export const MAX_CAPACITY: Record<Role, number> = {
  [Role.ADMIN]: 20,
  [Role.TEAM_LEADER]: 15,
  [Role.TEAM_MEMBER]: 10,
  [Role.JUNIOR_MEMBER]: 7,
};
```
