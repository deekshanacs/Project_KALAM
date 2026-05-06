# NFR Design Patterns — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

This document defines the design patterns that implement the NFR requirements for Unit 1. These patterns are foundational — they establish conventions that all subsequent units follow.

---

## 2. Dependency Pinning Pattern

### 2.1 Pattern Description

All npm dependencies use exact version pinning. No range specifiers are permitted.

### 2.2 Implementation

**Correct** (exact pin):
```json
{
  "dependencies": {
    "express": "4.18.2",
    "@prisma/client": "5.22.0",
    "bcrypt": "5.1.1"
  }
}
```

**Incorrect** (range specifiers):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@prisma/client": "~5.22.0",
    "bcrypt": ">=5.0.0"
  }
}
```

### 2.3 Enforcement Mechanism

A pre-commit check (or CI step) validates that no range specifiers exist:

```bash
#!/bin/bash
# scripts/check-pinned-deps.sh
for pkg in backend/package.json frontend/package.json shared/package.json; do
  if grep -E '"\^|"~|">=|"<=|">' "$pkg" > /dev/null 2>&1; then
    echo "ERROR: Range specifiers found in $pkg"
    exit 1
  fi
done
echo "All dependencies are pinned exactly."
```

### 2.4 Update Process

When a dependency needs updating:
1. Update the exact version in `package.json`
2. Run `npm install` to regenerate `package-lock.json`
3. Run `npm audit` to check for new vulnerabilities
4. Commit both `package.json` and `package-lock.json` together

---

## 3. Shared Types Pattern (Single Source of Truth)

### 3.1 Pattern Description

All domain entity interfaces and enums are defined once in `shared/src/types/index.ts` and imported by both backend and frontend via the `@tms/shared` package alias.

### 3.2 Type Flow

```
shared/src/types/index.ts
        │
        ├──► backend/src/**/*.ts    (import { User } from '@tms/shared')
        │
        └──► frontend/src/**/*.tsx  (import { User } from '@tms/shared')
```

### 3.3 Barrel Export Pattern

The shared package uses a single barrel export file:

```typescript
// shared/src/types/index.ts
// All types exported from a single file — no sub-imports needed

export * from './enums';        // or inline all enums
export * from './entities';     // or inline all interfaces
export * from './dtos';         // or inline all DTOs
```

For simplicity in a small project, all types are defined inline in `index.ts` rather than split across files.

### 3.4 TypeScript Path Alias Configuration

Both backend and frontend `tsconfig.json` files define a path alias so TypeScript resolves `@tms/shared` to the local source:

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@tms/shared": ["../shared/src/types/index.ts"]
    }
  }
}
```

This means TypeScript gets full type checking against the source TypeScript file, not a compiled `.d.ts` file, which gives better error messages and IDE support.

### 3.5 Anti-Patterns to Avoid

```typescript
// WRONG: Defining User interface in backend
// backend/src/types/user.ts
interface User { ... }  // ← duplicate, will diverge from shared

// WRONG: Relative path import across packages
// frontend/src/components/UserCard.tsx
import { User } from '../../../shared/src/types/index';  // ← fragile path

// CORRECT: Always use package alias
import { User } from '@tms/shared';
```

---

## 4. Environment Variable Pattern

### 4.1 Pattern Description

Environment variables are the only mechanism for injecting configuration. The pattern has three components:
1. `.env.example` — documents all variables with placeholder values
2. `.env` — actual values, gitignored, never committed
3. `config/env.ts` — validates and exports typed environment variables

### 4.2 Environment Validation Module

```typescript
// backend/src/config/env.ts

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  PORT: parseInt(optionalEnv('PORT', '4000'), 10),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  CORS_ORIGIN: requireEnv('CORS_ORIGIN'),
  UPLOAD_DIR: optionalEnv('UPLOAD_DIR', './uploads'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, // optional, validated at route level
} as const;

// Validate on module load (fail fast)
// The requireEnv calls above throw immediately if missing
```

### 4.3 Usage Pattern

```typescript
// backend/src/index.ts
import { env } from './config/env';  // ← validates all required vars on import

const app = express();
app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
```

### 4.4 .env.example Template

```bash
# ─── Database ─────────────────────────────────────────────────────────────────
# PostgreSQL connection string
# Local dev: postgresql://postgres:password@localhost:5432/tms_dev
# Production: provided by Railway/Render managed PostgreSQL add-on
DATABASE_URL="postgresql://postgres:password@localhost:5432/tms_dev"

# ─── JWT ──────────────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="change-me-to-a-random-256-bit-secret"
JWT_REFRESH_SECRET="change-me-to-a-different-random-256-bit-secret"

# ─── Server ───────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Frontend URL — must match exactly (no trailing slash)
CORS_ORIGIN="http://localhost:5173"

# ─── File Storage ─────────────────────────────────────────────────────────────
# Directory for uploaded files (created automatically on startup)
UPLOAD_DIR="./uploads"

# ─── AI ───────────────────────────────────────────────────────────────────────
# Anthropic API key — get from https://console.anthropic.com
# Required only for AI routes (/api/ai/*)
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### 4.5 .gitignore Pattern

```gitignore
# Environment files — NEVER commit these
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production

# Keep .env.example (it has placeholder values only)
!.env.example
```

---

## 5. Database Migration Pattern

### 5.1 Pattern Description

Prisma Migrate manages all database schema changes. The pattern distinguishes between development and production workflows.

### 5.2 Development Workflow

```bash
# 1. Modify schema.prisma
# 2. Create and apply migration
npx prisma migrate dev --name <descriptive-name>
# This: creates migration SQL, applies it, regenerates Prisma client

# 3. If schema changes break existing data, reset dev database
npx prisma migrate reset
# This: drops DB, recreates, applies all migrations, runs seed

# 4. Regenerate client after schema changes (without migration)
npx prisma generate
```

### 5.3 Production Workflow

```bash
# Applied as part of deployment startup command
npx prisma migrate deploy
# This: applies pending migrations only (no reset, no seed)
```

### 5.4 Migration Naming Convention

Migration names must be descriptive and follow snake_case:

```
migrations/
├── 20240101000000_init/
│   └── migration.sql
├── 20240115000000_add_project_model/
│   └── migration.sql
└── 20240120000000_add_refresh_token_revoked_at/
    └── migration.sql
```

### 5.5 Migration Safety Rules

- **Never edit** a migration file after it has been applied to any environment
- **Never delete** migration files from the `migrations/` directory
- **Always commit** migration files to source control
- **Always test** migrations on a copy of production data before deploying

---

## 6. Prisma Client Singleton Pattern

### 6.1 Pattern Description

The Prisma client is instantiated once and reused across all requests. In development, the singleton is attached to `globalThis` to survive hot module reloads.

### 6.2 Implementation

```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

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

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
```

### 6.3 Usage

```typescript
// Any service file
import { prisma } from '../lib/prisma';

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
```

### 6.4 Graceful Shutdown

```typescript
// backend/src/index.ts
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## 7. Uploads Directory Pattern

### 7.1 Pattern Description

The uploads directory is created on startup if it does not exist. A `.gitkeep` file ensures the directory is tracked in git without tracking its contents.

### 7.2 Implementation

```typescript
// backend/src/index.ts (startup sequence)
import { mkdirSync, existsSync } from 'fs';
import { env } from './config/env';

// Ensure uploads directory exists
if (!existsSync(env.UPLOAD_DIR)) {
  mkdirSync(env.UPLOAD_DIR, { recursive: true });
  console.log(`Created uploads directory: ${env.UPLOAD_DIR}`);
}
```

### 7.3 .gitignore for Uploads

```gitignore
# Uploaded files — not committed to source control
uploads/*
!uploads/.gitkeep
```
