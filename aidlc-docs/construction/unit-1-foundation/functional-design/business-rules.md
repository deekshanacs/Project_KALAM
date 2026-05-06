# Business Rules — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 1 business rules govern the structural constraints of the TMS system: how the database schema is constrained, how seed data is structured, how TypeScript is configured, and how the monorepo workspace is organized. These rules are enforced at the schema level (Prisma), the type level (TypeScript strict mode), and the tooling level (npm workspaces).

---

## 2. Prisma Schema Constraints

### 2.1 Uniqueness Rules

| Model | Field | Constraint | Rationale |
|---|---|---|---|
| User | `email` | `@unique` | One account per email address |
| RefreshToken | `tokenHash` | `@unique` | Each token hash must be distinct |
| GroupMember | `[groupId, userId]` | `@@unique` | A user can only be a member of a group once |

### 2.2 Required Fields (Non-Nullable)

All fields without `?` in the Prisma schema are required. Key required fields:

| Model | Required Fields |
|---|---|
| User | `id`, `email`, `name`, `password`, `role`, `availabilityStatus`, `createdAt`, `updatedAt` |
| Task | `id`, `title`, `status`, `priority`, `assignedById`, `assignedToId`, `createdAt`, `updatedAt` |
| Message | `id`, `type`, `senderId`, `createdAt`, `updatedAt` |
| Group | `id`, `name`, `createdById`, `createdAt`, `updatedAt` |
| Document | `id`, `title`, `content`, `font`, `fontSize`, `theme`, `pageSize`, `sharedWith`, `ownerId`, `createdAt`, `updatedAt` |
| Project | `id`, `name`, `status`, `ownerId`, `createdAt`, `updatedAt` |

### 2.3 Default Values

| Model | Field | Default | Notes |
|---|---|---|---|
| User | `role` | `JUNIOR_MEMBER` | Admin assigns roles post-registration |
| User | `availabilityStatus` | `OFFLINE` | Set to AVAILABLE on first login |
| Task | `status` | `TODO` | All new tasks start in TODO |
| Task | `priority` | `MEDIUM` | Default priority if not specified |
| Task | `attachments` | `[]` | Empty JSON array |
| Message | `type` | `TEXT` | Default message type |
| Message | `attachments` | `[]` | Empty JSON array |
| Message | `readBy` | `[]` | Empty JSON array |
| Document | `content` | `{}` | Empty TipTap JSON |
| Document | `font` | `"Inter"` | Default font |
| Document | `fontSize` | `12` | Default font size in pt |
| Document | `theme` | `"light"` | Default theme |
| Document | `pageSize` | `"A4"` | Default page size |
| Document | `sharedWith` | `[]` | Empty JSON array |
| Project | `status` | `ACTIVE` | New projects are active |

### 2.4 Cascade Delete Rules

| Relation | On Delete Behavior | Rationale |
|---|---|---|
| RefreshToken → User | `Cascade` | Deleting a user removes all their tokens |
| GroupMember → Group | `Cascade` | Deleting a group removes all memberships |
| GroupMember → User | `Cascade` | Deleting a user removes all their memberships |
| Comment → Task | `Cascade` | Deleting a task removes all its comments |
| TimeLog → Task | `Cascade` | Deleting a task removes all its time logs |

### 2.5 Nullable Foreign Keys

| Model | Field | Nullable | Rationale |
|---|---|---|---|
| User | `supervisorId` | Yes | Root Admin has no supervisor |
| User | `avatarUrl` | Yes | Avatar is optional |
| Task | `dueDate` | Yes | Not all tasks have deadlines |
| Task | `completedAt` | Yes | Only set when status = DONE |
| Task | `projectId` | Yes | Tasks can exist outside a project |
| Message | `receiverId` | Yes | Group messages have no direct receiver |
| Message | `groupId` | Yes | DMs have no group |
| Message | `content` | Yes | Deleted messages have null content |
| Message | `editedAt` | Yes | Only set after first edit |
| Message | `deletedAt` | Yes | Only set on soft delete |
| RefreshToken | `revokedAt` | Yes | Only set on revocation |
| TimeLog | `note` | Yes | Note is optional |

### 2.6 JSON Field Rules

JSON fields in Prisma store structured data that does not warrant a separate table at MVP scale:

| Model | Field | Type | Validation |
|---|---|---|---|
| Task | `attachments` | `string[]` | Array of URL strings, max 10 items |
| Message | `attachments` | `string[]` | Array of URL strings |
| Message | `readBy` | `string[]` | Array of user IDs (no duplicates) |
| Document | `content` | `TipTap JSON` | Valid TipTap editor JSON object |
| Document | `sharedWith` | `DocumentShare[]` | Array of `{userId?, groupId?, permission}` |

**Rule**: JSON fields must be validated at the application layer (Zod schemas) before writing to the database. Prisma does not enforce JSON structure.

---

## 3. Seed Data Rules

### 3.1 User Hierarchy Rules

- **Rule SD-01**: The seed must create exactly 1 Admin, 2 Team Leaders, 3 Team Members, and 4 Junior Members (10 users total).
- **Rule SD-02**: The Admin user has `supervisorId = null` (root of the hierarchy).
- **Rule SD-03**: Both Team Leaders have `supervisorId = admin.id`.
- **Rule SD-04**: Team Members are distributed: TM1 and TM2 under TL1, TM3 under TL2.
- **Rule SD-05**: Junior Members are distributed: JTM1 and JTM2 under TM1, JTM3 under TM2, JTM4 under TM3.
- **Rule SD-06**: No circular supervisor relationships are permitted.

### 3.2 Password Rules for Seed Data

- **Rule SD-07**: All seed users use the password `Password123!`.
- **Rule SD-08**: The password is hashed with bcrypt at cost factor 12 before insertion.
- **Rule SD-09**: The plaintext password is never stored in the database or logged.
- **Rule SD-10**: Seed passwords are documented in `.env.example` comments for developer reference only.

### 3.3 Task Distribution Rules

- **Rule SD-11**: Seed tasks must cover all four `TaskStatus` values (at least one task per status).
- **Rule SD-12**: Seed tasks must cover all four `Priority` values.
- **Rule SD-13**: Task `assignedById` must be a user with a role that has permission to assign to `assignedToId` (respects hierarchy rules).
- **Rule SD-14**: At least one task must have a `dueDate` set.
- **Rule SD-15**: At least one task must have `completedAt` set (for DONE tasks).

### 3.4 Idempotency Rules

- **Rule SD-16**: The seed script uses `upsert` (not `create`) for all records, keyed on a stable identifier (email for users, title for tasks, etc.).
- **Rule SD-17**: Running the seed script multiple times must produce the same final database state.
- **Rule SD-18**: The seed script must not fail if the database already contains seed data.

### 3.5 Seed Execution Order

- **Rule SD-19**: Users must be created before tasks (tasks reference user IDs).
- **Rule SD-20**: The Admin user must be created before Team Leaders (TLs reference admin.id as supervisorId).
- **Rule SD-21**: Team Leaders must be created before Team Members.
- **Rule SD-22**: Team Members must be created before Junior Members.
- **Rule SD-23**: Projects must be created before tasks that reference them.
- **Rule SD-24**: Groups must be created before GroupMembers.
- **Rule SD-25**: Users must be created before Messages.

---

## 4. TypeScript Strict Mode Rules

### 4.1 Compiler Flags (All Must Be Enabled)

| Flag | Value | Effect |
|---|---|---|
| `strict` | `true` | Enables all strict type-checking options |
| `noImplicitAny` | `true` | Variables must have explicit types |
| `strictNullChecks` | `true` | `null` and `undefined` are not assignable to other types |
| `strictFunctionTypes` | `true` | Function parameter types are checked contravariantly |
| `strictBindCallApply` | `true` | `bind`, `call`, `apply` are type-checked |
| `strictPropertyInitialization` | `true` | Class properties must be initialized in constructor |
| `noImplicitThis` | `true` | `this` must have explicit type |
| `alwaysStrict` | `true` | Emits `"use strict"` in all files |
| `noUnusedLocals` | `true` | Unused local variables are errors |
| `noUnusedParameters` | `true` | Unused function parameters are errors |
| `noImplicitReturns` | `true` | All code paths must return a value |
| `noFallthroughCasesInSwitch` | `true` | Switch cases must have break/return |
| `exactOptionalPropertyTypes` | `true` | Optional properties cannot be set to `undefined` explicitly |

### 4.2 Prohibited Patterns

- **Rule TS-01**: The `any` type is prohibited. Use `unknown` for truly unknown types, then narrow with type guards.
- **Rule TS-02**: Type assertions (`as SomeType`) must be justified with a comment explaining why the assertion is safe.
- **Rule TS-03**: Non-null assertions (`!`) are prohibited except in test files. Use optional chaining (`?.`) or explicit null checks.
- **Rule TS-04**: `@ts-ignore` and `@ts-expect-error` are prohibited in production code.
- **Rule TS-05**: `Object` (capital O) type is prohibited. Use `Record<string, unknown>` or a specific interface.

### 4.3 Required Patterns

- **Rule TS-06**: All function parameters and return types must be explicitly typed.
- **Rule TS-07**: All exported functions must have JSDoc comments.
- **Rule TS-08**: Enums must be defined as TypeScript `enum` (not `const` objects) to match Prisma enum generation.
- **Rule TS-09**: All async functions must return `Promise<T>` with an explicit type parameter.
- **Rule TS-10**: Error handling must use typed catch blocks: `catch (error: unknown)` followed by `instanceof` checks.

---

## 5. Monorepo Workspace Rules

### 5.1 Package Naming

- **Rule MW-01**: All packages must use the `@tms/` scope prefix.
- **Rule MW-02**: Package names: `@tms/backend`, `@tms/frontend`, `@tms/shared`.
- **Rule MW-03**: Package names must match the directory name (e.g., `@tms/backend` lives in `/backend`).

### 5.2 Dependency Rules

- **Rule MW-04**: All dependency versions must be pinned to exact versions (no `^` or `~` prefixes). This satisfies SECURITY-10.
- **Rule MW-05**: A single `package-lock.json` at the workspace root is the authoritative lock file.
- **Rule MW-06**: `npm install` must be run from the workspace root, not from individual package directories.
- **Rule MW-07**: The `@tms/shared` package must be listed as a dependency in both `@tms/backend` and `@tms/frontend`.
- **Rule MW-08**: Dev dependencies used only in one package belong in that package's `package.json`, not the root.
- **Rule MW-09**: Dev dependencies shared across packages (e.g., TypeScript) belong in the root `package.json`.

### 5.3 Shared Type Import Rules

- **Rule MW-10**: All shared types must be imported from `@tms/shared`, never via relative paths across package boundaries.
- **Rule MW-11**: The `/shared` package must export all types from a single barrel file: `shared/src/types/index.ts`.
- **Rule MW-12**: The `/shared` package must not import from `/backend` or `/frontend`.
- **Rule MW-13**: The `/backend` package may import from `@tms/shared` only.
- **Rule MW-14**: The `/frontend` package may import from `@tms/shared` only.

### 5.4 Environment Variable Rules

- **Rule MW-15**: Every environment variable used in the application must have a corresponding entry in `.env.example`.
- **Rule MW-16**: `.env` files must be listed in `.gitignore` and must never be committed to source control. This satisfies SECURITY-09.
- **Rule MW-17**: `.env.example` files must use placeholder values (not real secrets).
- **Rule MW-18**: The backend must validate all required environment variables on startup and fail fast if any are missing.
- **Rule MW-19**: Frontend environment variables must be prefixed with `VITE_` to be exposed to the browser bundle.

### 5.5 Script Conventions

- **Rule MW-20**: Each package must define a `build` script that compiles TypeScript to the `dist/` directory.
- **Rule MW-21**: The backend must define a `dev` script using `ts-node` or `tsx` for development.
- **Rule MW-22**: The frontend must define a `dev` script using `vite`.
- **Rule MW-23**: The backend must define a `seed` script: `npx prisma db seed`.
- **Rule MW-24**: The backend must define `db:migrate` and `db:generate` scripts for Prisma operations.

---

## 6. File Organization Rules

### 6.1 Backend Source Structure

```
backend/src/
├── index.ts              ← Express app entry point
├── app.ts                ← Express app factory (for testing)
├── config/
│   └── env.ts            ← Environment variable validation
├── middleware/
│   ├── auth.ts
│   ├── roleGuard.ts
│   ├── rateLimiter.ts
│   ├── requestId.ts
│   ├── logger.ts
│   └── errorHandler.ts
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── task.routes.ts
│   ├── message.routes.ts
│   ├── group.routes.ts
│   ├── document.routes.ts
│   ├── ai.routes.ts
│   └── upload.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── task.service.ts
│   ├── workload.service.ts
│   ├── chat.service.ts
│   ├── ai.service.ts
│   ├── document.service.ts
│   └── socket.service.ts
├── lib/
│   ├── prisma.ts         ← Prisma client singleton
│   └── logger.ts         ← Winston logger instance
└── types/
    └── express.d.ts      ← Express Request type augmentation
```

### 6.2 Shared Source Structure

```
shared/src/
└── types/
    └── index.ts          ← Single barrel export (all interfaces + enums)
```

### 6.3 Frontend Source Structure

```
frontend/src/
├── main.tsx
├── App.tsx
├── api/
│   └── client.ts         ← Typed axios instance
├── contexts/
│   ├── AuthContext.tsx
│   └── SocketContext.tsx
├── hooks/
├── pages/
├── components/
│   ├── common/
│   └── [feature]/
└── types/
    └── index.ts          ← Re-exports from @tms/shared + frontend-only types
```
