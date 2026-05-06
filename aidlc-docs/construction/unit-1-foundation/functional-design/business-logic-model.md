# Business Logic Model — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 1 establishes the entire structural foundation of the TMS monorepo. It produces no user-facing features but creates every artifact that all subsequent units depend on: the monorepo workspace configuration, the Prisma database schema with all 6 models, the shared TypeScript type library, the seed script, and the environment configuration templates.

All downstream units (2–8) import from `/shared`, connect to the database via the Prisma client initialized here, and rely on the TypeScript strict configuration established in this unit.

---

## 2. Monorepo Workspace Configuration

### 2.1 Structure

```
tms/                          ← workspace root
├── package.json              ← workspace root (npm workspaces)
├── package-lock.json         ← single lock file for all packages
├── tsconfig.base.json        ← shared TypeScript base config
├── .gitignore
├── .env.example              ← root-level (documents all vars)
│
├── backend/
│   ├── package.json          ← backend package ("name": "@tms/backend")
│   ├── tsconfig.json         ← extends tsconfig.base.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│
├── frontend/
│   ├── package.json          ← frontend package ("name": "@tms/frontend")
│   ├── tsconfig.json         ← extends tsconfig.base.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── src/
│
└── shared/
    ├── package.json          ← shared package ("name": "@tms/shared")
    ├── tsconfig.json         ← extends tsconfig.base.json
    └── src/
        └── types/
            └── index.ts      ← single barrel export
```

### 2.2 Root package.json (Workspace Definition)

```json
{
  "name": "tms",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend",
    "shared"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspaces",
    "seed": "npm run seed --workspace=backend",
    "db:migrate": "npm run db:migrate --workspace=backend",
    "db:generate": "npm run db:generate --workspace=backend"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### 2.3 Package Naming Convention

| Package | Name | Import Path |
|---|---|---|
| Shared types | `@tms/shared` | `import { User } from '@tms/shared'` |
| Backend | `@tms/backend` | Internal only |
| Frontend | `@tms/frontend` | Internal only |

The `@tms/shared` package is listed as a dependency in both `@tms/backend` and `@tms/frontend` package.json files. npm workspaces resolves this to the local `/shared` directory via symlink — no publishing required.

---

## 3. Prisma Schema Design

### 3.1 Schema File Location

`backend/prisma/schema.prisma`

### 3.2 Generator and Datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3.3 Enums

```prisma
enum Role {
  ADMIN
  TEAM_LEADER
  TEAM_MEMBER
  JUNIOR_MEMBER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum AvailabilityStatus {
  AVAILABLE
  IN_CALL
  AWAY
  OFFLINE
}

enum MessageType {
  TEXT
  FILE
  IMAGE
  LINK
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}
```

### 3.4 Model: User

```prisma
model User {
  id                 String             @id @default(cuid())
  email              String             @unique
  name               String
  password           String
  role               Role               @default(JUNIOR_MEMBER)
  availabilityStatus AvailabilityStatus @default(OFFLINE)
  avatarUrl          String?
  supervisorId       String?

  // Self-relation for org hierarchy
  supervisor         User?              @relation("UserHierarchy", fields: [supervisorId], references: [id])
  subordinates       User[]             @relation("UserHierarchy")

  // Task relations
  tasksAssigned      Task[]             @relation("TaskAssignedBy")
  tasksReceived      Task[]             @relation("TaskAssignedTo")

  // Message relations
  messagesSent       Message[]          @relation("MessageSender")
  messagesReceived   Message[]          @relation("MessageReceiver")

  // Group relations
  groupsCreated      Group[]            @relation("GroupCreator")
  groupMemberships   GroupMember[]

  // Document relations
  documentsOwned     Document[]         @relation("DocumentOwner")

  // Project relations
  projectsOwned      Project[]          @relation("ProjectOwner")

  // Auth relations
  refreshTokens      RefreshToken[]

  // Comment relations
  comments           Comment[]

  // TimeLog relations
  timeLogs           TimeLog[]

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@map("users")
}
```

### 3.5 Model: Task

```prisma
model Task {
  id           String     @id @default(cuid())
  title        String
  description  String?
  status       TaskStatus @default(TODO)
  priority     Priority   @default(MEDIUM)
  dueDate      DateTime?
  completedAt  DateTime?
  attachments  Json       @default("[]")

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

### 3.6 Model: Message

```prisma
model Message {
  id          String      @id @default(cuid())
  content     String?
  type        MessageType @default(TEXT)
  attachments Json        @default("[]")
  readBy      Json        @default("[]")
  editedAt    DateTime?
  deletedAt   DateTime?

  senderId    String
  receiverId  String?
  groupId     String?

  sender      User        @relation("MessageSender", fields: [senderId], references: [id])
  receiver    User?       @relation("MessageReceiver", fields: [receiverId], references: [id])
  group       Group?      @relation(fields: [groupId], references: [id])

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("messages")
}
```

### 3.7 Model: Group

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

  @@unique([groupId, userId])
  @@map("group_members")
}
```

### 3.8 Model: Document

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  content     Json     @default("{}")
  font        String   @default("Inter")
  fontSize    Int      @default(12)
  theme       String   @default("light")
  pageSize    String   @default("A4")
  sharedWith  Json     @default("[]")

  ownerId     String
  owner       User     @relation("DocumentOwner", fields: [ownerId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("documents")
}
```

### 3.9 Model: Project

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

### 3.10 Supporting Models (Auth)

```prisma
model RefreshToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique
  userId    String
  expiresAt DateTime
  revokedAt DateTime?

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime  @default(now())

  @@map("refresh_tokens")
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  taskId    String
  authorId  String

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("comments")
}

model TimeLog {
  id        String   @id @default(cuid())
  hours     Float
  note      String?
  taskId    String
  userId    String

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())

  @@map("time_logs")
}
```

---

## 4. Shared TypeScript Interfaces

### 4.1 File: `shared/src/types/index.ts`

All interfaces mirror the Prisma models exactly. The frontend and backend both import from `@tms/shared` to ensure a single source of truth.

```typescript
// ─── Enums ───────────────────────────────────────────────────────────────────

export enum Role {
  ADMIN = 'ADMIN',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  JUNIOR_MEMBER = 'JUNIOR_MEMBER',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALL = 'IN_CALL',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  LINK = 'LINK',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  availabilityStatus: AvailabilityStatus;
  avatarUrl: string | null;
  supervisorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  attachments: string[];
  assignedById: string;
  assignedToId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string | null;
  type: MessageType;
  attachments: string[];
  readBy: string[];
  editedAt: string | null;
  deletedAt: string | null;
  senderId: string;
  receiverId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface Document {
  id: string;
  title: string;
  content: Record<string, unknown>;
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLog {
  id: string;
  hours: number;
  note: string | null;
  taskId: string;
  userId: string;
  createdAt: string;
}

export interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface WorkloadDto {
  userId: string;
  openTasks: number;
  maxCapacity: number;
  percentage: number;
  colorTier: 'green' | 'amber' | 'red';
}

export interface UserWithWorkload extends User {
  workload: WorkloadDto;
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

export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    user: Pick<User, 'id' | 'name' | 'avatarUrl' | 'role'>;
    joinedAt: string;
  }>;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
```

---

## 5. Seed Script Logic

### 5.1 File: `backend/prisma/seed.ts`

The seed script creates a deterministic, reproducible dataset for development and testing. It uses `upsert` operations so it can be run multiple times without creating duplicates.

### 5.2 User Hierarchy

```
Admin (1)
├── TeamLeader1 (TL)
│   ├── TeamMember1 (TM)
│   │   ├── JuniorMember1 (JTM)
│   │   └── JuniorMember2 (JTM)
│   └── TeamMember2 (TM)
│       └── JuniorMember3 (JTM)
└── TeamLeader2 (TL)
    └── TeamMember3 (TM)
        └── JuniorMember4 (JTM)
```

Total: 10 users (1 Admin + 2 TLs + 3 TMs + 4 JTMs)

### 5.3 Seed User Definitions

| Seed ID | Name | Email | Role | Supervisor |
|---|---|---|---|---|
| admin | Alice Admin | alice@tms.dev | ADMIN | null |
| tl1 | Bob Leader | bob@tms.dev | TEAM_LEADER | admin |
| tl2 | Carol Leader | carol@tms.dev | TEAM_LEADER | admin |
| tm1 | Dave Member | dave@tms.dev | TEAM_MEMBER | tl1 |
| tm2 | Eve Member | eve@tms.dev | TEAM_MEMBER | tl1 |
| tm3 | Frank Member | frank@tms.dev | TEAM_MEMBER | tl2 |
| jtm1 | Grace Junior | grace@tms.dev | JUNIOR_MEMBER | tm1 |
| jtm2 | Henry Junior | henry@tms.dev | JUNIOR_MEMBER | tm1 |
| jtm3 | Iris Junior | iris@tms.dev | JUNIOR_MEMBER | tm2 |
| jtm4 | Jack Junior | jack@tms.dev | JUNIOR_MEMBER | tm3 |

All seed users share the password `Password123!` (bcrypt hashed at cost 12 in the seed script).

### 5.4 Seed Task Distribution

The seed creates 12 sample tasks spread across all statuses and assignees:

| Task | Status | Priority | Assigned By | Assigned To |
|---|---|---|---|---|
| Setup CI/CD pipeline | DONE | HIGH | admin | tl1 |
| Design database schema | DONE | HIGH | admin | tl2 |
| Implement auth module | IN_PROGRESS | HIGH | tl1 | tm1 |
| Build org chart UI | IN_PROGRESS | MEDIUM | tl1 | tm2 |
| Write unit tests | TODO | MEDIUM | tl2 | tm3 |
| API documentation | TODO | LOW | tl1 | tm1 |
| Fix login bug | REVIEW | URGENT | tl1 | jtm1 |
| Update README | TODO | LOW | tm1 | jtm2 |
| Code review tasks | REVIEW | MEDIUM | tm2 | jtm3 |
| Performance testing | TODO | HIGH | tl2 | jtm4 |
| Deploy to staging | IN_PROGRESS | HIGH | admin | tl1 |
| User acceptance testing | TODO | MEDIUM | admin | tl2 |

### 5.5 Seed Messages

- 3 direct messages between admin and tl1
- 3 direct messages between tl1 and tm1
- 1 group "Engineering Team" with all users as members, 5 group messages

### 5.6 Seed Documents

- 1 document owned by admin: "Project Overview" (shared with all TLs, VIEW permission)
- 1 document owned by tl1: "Sprint Plan Q1" (shared with tm1, tm2, EDIT permission)
- 1 document owned by tm1: "Technical Notes" (not shared)

### 5.7 Seed Script Execution Order

```
1. Hash all passwords (bcrypt, cost 12)
2. Upsert Admin user (no supervisorId)
3. Upsert TL1, TL2 (supervisorId = admin.id)
4. Upsert TM1, TM2, TM3 (supervisorId = tl1.id or tl2.id)
5. Upsert JTM1, JTM2, JTM3, JTM4 (supervisorId = tm1.id, tm2.id, or tm3.id)
6. Upsert sample Project
7. Upsert sample Tasks (requires user IDs from step 2-5)
8. Upsert sample Group + GroupMembers
9. Upsert sample Messages (DM + group)
10. Upsert sample Documents
11. Log completion summary
```

---

## 6. TypeScript Configuration

### 6.1 Base Config: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### 6.2 Backend Config: `backend/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@tms/shared": ["../shared/src/types/index.ts"]
    }
  },
  "include": ["src/**/*", "prisma/seed.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 6.3 Frontend Config: `frontend/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "outDir": "./dist",
    "paths": {
      "@tms/shared": ["../shared/src/types/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 6.4 Shared Config: `shared/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 7. Environment Variable Configuration

### 7.1 Backend `.env.example`

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/tms_dev"

# JWT
JWT_SECRET="change-me-to-a-random-256-bit-secret"
JWT_REFRESH_SECRET="change-me-to-a-different-random-256-bit-secret"

# Server
PORT=4000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"

# File Storage
UPLOAD_DIR="./uploads"

# AI
ANTHROPIC_API_KEY="sk-ant-..."
```

### 7.2 Frontend `.env.example`

```bash
# API
VITE_API_URL="http://localhost:4000"
VITE_SOCKET_URL="http://localhost:4000"
```

### 7.3 `.gitignore` Entries

```
.env
.env.local
.env.production
node_modules/
dist/
uploads/
*.js.map
```

---

## 8. Prisma Migration Strategy

### 8.1 Development Workflow

```bash
# Create and apply migration
npx prisma migrate dev --name init

# Generate Prisma client after schema changes
npx prisma generate

# Run seed script
npx prisma db seed
```

### 8.2 `package.json` Prisma Seed Config (backend)

```json
{
  "prisma": {
    "seed": "ts-node --esm prisma/seed.ts"
  }
}
```

### 8.3 Production Migration

```bash
# Applied automatically on deploy (see Unit 2 deployment)
npx prisma migrate deploy
```

---

## 9. Entity Relationship Summary

```
User (1) ──── (many) User          [supervisorId self-relation, org hierarchy]
User (1) ──── (many) Task          [assignedBy relation]
User (1) ──── (many) Task          [assignedTo relation]
User (1) ──── (many) Message       [sender relation]
User (1) ──── (many) Message       [receiver relation, nullable]
User (1) ──── (many) GroupMember   [group memberships]
User (1) ──── (many) Group         [groups created]
User (1) ──── (many) Document      [documents owned]
User (1) ──── (many) Project       [projects owned]
User (1) ──── (many) RefreshToken  [auth tokens]
User (1) ──── (many) Comment       [comments authored]
User (1) ──── (many) TimeLog       [time entries]

Task (1) ──── (many) Comment       [task comments]
Task (1) ──── (many) TimeLog       [time tracking]
Task (many) ── (1) Project         [optional project grouping]

Group (1) ──── (many) GroupMember  [membership join table]
Group (1) ──── (many) Message      [group messages]
```

---

## 10. Deliverables Checklist

- [ ] Root `package.json` with npm workspaces configured
- [ ] `tsconfig.base.json` with strict mode enabled
- [ ] `backend/package.json` with all backend dependencies (exact versions)
- [ ] `frontend/package.json` with all frontend dependencies (exact versions)
- [ ] `shared/package.json` with TypeScript only
- [ ] `backend/prisma/schema.prisma` with all 6 models + supporting models + all enums
- [ ] `shared/src/types/index.ts` with all interfaces and enums
- [ ] `backend/prisma/seed.ts` with 10 users + sample data
- [ ] `backend/.env.example` with all backend env vars
- [ ] `frontend/.env.example` with all frontend env vars
- [ ] `.gitignore` at root
- [ ] Initial Prisma migration (`prisma/migrations/`)
- [ ] `uploads/` directory created (with `.gitkeep`)
