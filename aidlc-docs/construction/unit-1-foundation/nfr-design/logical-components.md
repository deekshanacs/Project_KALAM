# Logical Components — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 1 logical components are the foundational building blocks that all subsequent units depend on. They are not user-facing features but infrastructure components: the Prisma client singleton, the shared types barrel export, the environment validation module, and the seed script.

---

## 2. Prisma Client Singleton

### 2.1 Component: `backend/src/lib/prisma.ts`

**Purpose**: Provides a single, shared Prisma client instance across the entire backend application. Prevents connection pool exhaustion during development hot reloads.

**Interface**:
```typescript
export const prisma: PrismaClient;
```

**Implementation**:
```typescript
import { PrismaClient } from '@prisma/client';

// Extend globalThis to hold the singleton in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

// In development, attach to global to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
```

**Behavior**:
- In production: creates one PrismaClient instance per process
- In development: reuses the same instance across hot reloads (attached to `global.__prisma`)
- Logging: query logging enabled in development, error-only in production
- Connection: lazy (connects on first query, not on import)

**Usage by other components**:
```typescript
import { prisma } from '../lib/prisma';
// All services import from this single module
```

---

## 3. Shared Types Barrel Export

### 3.1 Component: `shared/src/types/index.ts`

**Purpose**: Single source of truth for all TypeScript interfaces and enums shared between frontend and backend.

**Exports**:
- All 6 enums: `Role`, `TaskStatus`, `Priority`, `AvailabilityStatus`, `MessageType`, `ProjectStatus`
- All entity interfaces: `User`, `Task`, `Message`, `Group`, `GroupMember`, `Document`, `Project`, `Comment`, `TimeLog`, `RefreshToken`
- All DTO interfaces: `WorkloadDto`, `UserWithWorkload`, `TaskWithRelations`, `MessageWithSender`, `GroupWithMembers`, `DocumentShare`, `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`
- Constants: `ROLE_WEIGHT`, `MAX_CAPACITY`, `OPEN_STATUSES`

**Package configuration** (`shared/package.json`):
```json
{
  "name": "@tms/shared",
  "version": "1.0.0",
  "main": "src/types/index.ts",
  "types": "src/types/index.ts",
  "exports": {
    ".": "./src/types/index.ts"
  }
}
```

**Import pattern**:
```typescript
// In backend
import { User, Role, TaskStatus, WorkloadDto } from '@tms/shared';

// In frontend
import { User, Role, TaskStatus, WorkloadDto } from '@tms/shared';
```

**Constraints**:
- This file must not import from any other package
- This file must not contain any runtime logic (only type definitions and pure constants)
- All exports must be named exports (no default export)

---

## 4. Environment Validation Module

### 4.1 Component: `backend/src/config/env.ts`

**Purpose**: Validates all required environment variables at module load time. Provides a typed, centralized configuration object used throughout the backend.

**Interface**:
```typescript
export const env: {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  UPLOAD_DIR: string;
  ANTHROPIC_API_KEY: string | undefined;
};
```

**Implementation**:
```typescript
// backend/src/config/env.ts

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `[Config] Missing required environment variable: ${key}\n` +
      `Please copy .env.example to .env and fill in the required values.`
    );
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// Validate and export — throws on missing required vars
export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  PORT: parseInt(optionalEnv('PORT', '4000'), 10),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  CORS_ORIGIN: requireEnv('CORS_ORIGIN'),
  UPLOAD_DIR: optionalEnv('UPLOAD_DIR', './uploads'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
} as const;

export type Env = typeof env;
```

**Fail-fast behavior**: When `backend/src/index.ts` imports `env`, the module executes immediately. If any required variable is missing, the process throws before the Express server starts. This prevents the server from starting in a misconfigured state.

**Usage**:
```typescript
// backend/src/index.ts
import { env } from './config/env'; // ← validates on import

app.listen(env.PORT, () => {
  console.log(`[Server] Listening on port ${env.PORT} (${env.NODE_ENV})`);
});
```

---

## 5. Seed Script Structure

### 5.1 Component: `backend/prisma/seed.ts`

**Purpose**: Populates the database with deterministic development data. Structured as composable functions so individual seed operations can be used in test setup.

**Exported Functions**:

```typescript
export interface SeedUsers {
  admin: User;
  tl1: User;
  tl2: User;
  tm1: User;
  tm2: User;
  tm3: User;
  jtm1: User;
  jtm2: User;
  jtm3: User;
  jtm4: User;
}

export async function seedUsers(prisma: PrismaClient): Promise<SeedUsers>;
export async function seedProject(prisma: PrismaClient, ownerId: string): Promise<Project>;
export async function seedTasks(prisma: PrismaClient, users: SeedUsers, projectId: string): Promise<void>;
export async function seedGroup(prisma: PrismaClient, users: SeedUsers): Promise<void>;
export async function seedMessages(prisma: PrismaClient, users: SeedUsers): Promise<void>;
export async function seedDocuments(prisma: PrismaClient, users: SeedUsers): Promise<void>;
```

**Main function**:
```typescript
async function main(): Promise<void> {
  // Production guard
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed] REFUSED: Cannot run seed in production environment');
    process.exit(1);
  }

  console.log('[Seed] Starting seed script...');

  const users = await seedUsers(prisma);
  console.log('[Seed] Users created:', Object.keys(users).length);

  const project = await seedProject(prisma, users.admin.id);
  console.log('[Seed] Project created:', project.name);

  await seedTasks(prisma, users, project.id);
  console.log('[Seed] Tasks created');

  await seedGroup(prisma, users);
  console.log('[Seed] Group and messages created');

  await seedDocuments(prisma, users);
  console.log('[Seed] Documents created');

  console.log('[Seed] Seed completed successfully');
}

main()
  .catch((error: unknown) => {
    console.error('[Seed] Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**seedUsers implementation pattern**:
```typescript
export async function seedUsers(prisma: PrismaClient): Promise<SeedUsers> {
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'alice@tms.dev' },
    update: {},
    create: {
      email: 'alice@tms.dev',
      name: 'Alice Admin',
      password: hashedPassword,
      role: 'ADMIN',
      availabilityStatus: 'AVAILABLE',
    },
  });

  const tl1 = await prisma.user.upsert({
    where: { email: 'bob@tms.dev' },
    update: {},
    create: {
      email: 'bob@tms.dev',
      name: 'Bob Leader',
      password: hashedPassword,
      role: 'TEAM_LEADER',
      availabilityStatus: 'AVAILABLE',
      supervisorId: admin.id,
    },
  });

  // ... continue for all 10 users

  return { admin, tl1, tl2, tm1, tm2, tm3, jtm1, jtm2, jtm3, jtm4 };
}
```

---

## 6. TypeScript Express Augmentation

### 6.1 Component: `backend/src/types/express.d.ts`

**Purpose**: Augments the Express `Request` type to include the authenticated user, enabling type-safe access to `req.user` in route handlers.

**Implementation**:
```typescript
// backend/src/types/express.d.ts
import { Role } from '@tms/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
      requestId?: string;
    }
  }
}

export {};
```

**Usage in route handlers**:
```typescript
// backend/src/routes/user.routes.ts
app.get('/api/users/me', authMiddleware, (req, res) => {
  // req.user is typed as { id: string; email: string; role: Role } | undefined
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // TypeScript knows req.user.id is a string here
  const userId = req.user.id;
});
```

---

## 7. Logger Instance

### 7.1 Component: `backend/src/lib/logger.ts`

**Purpose**: Provides a configured Winston logger instance used throughout the backend. Defined in Unit 1 so it is available from the start.

**Implementation**:
```typescript
// backend/src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.Console(),
  ],
  // Prevent PII from appearing in logs
  silent: false,
});
```

**Note**: Winston is installed in Unit 2. This component is defined in Unit 1 as a placeholder and fully implemented in Unit 2.

---

## 8. Component Dependency Graph

```
backend/src/index.ts
    │
    ├── config/env.ts          ← validates env vars (no dependencies)
    │
    ├── lib/prisma.ts          ← Prisma singleton (depends on env.DATABASE_URL)
    │
    ├── lib/logger.ts          ← Winston logger (depends on env.NODE_ENV)
    │
    └── types/express.d.ts     ← Type augmentation (depends on @tms/shared)

shared/src/types/index.ts
    │
    ├── (imported by backend)
    └── (imported by frontend)

backend/prisma/seed.ts
    │
    ├── lib/prisma.ts
    └── @tms/shared (for type references)
```

---

## 9. Startup Sequence

The backend startup sequence in `backend/src/index.ts`:

```
1. Import env (validates all required env vars — throws if missing)
2. Create uploads directory if not exists
3. Import prisma singleton
4. Import logger
5. Create Express app
6. Register middleware (Unit 2)
7. Register routes (Unit 2+)
8. Connect to database: await prisma.$connect()
9. Start HTTP server: app.listen(env.PORT)
10. Log startup message
```

If any step from 1–8 throws, the process exits with code 1 before accepting any connections.
