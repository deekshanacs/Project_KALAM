# Tech Stack Decisions — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

This document records the technology decisions made for Unit 1 and the rationale behind each choice. All versions are pinned exactly per SECURITY-10 requirements.

---

## 2. Runtime Environment

### 2.1 Node.js: Version 20 LTS

| Decision | Value |
|---|---|
| Version | 20.x LTS (20.18.0 or latest 20.x at time of install) |
| Rationale | LTS release with long-term support through April 2026; stable V8 engine; native ESM support; required by several dependencies |
| Enforcement | `"engines": { "node": ">=20.0.0" }` in root `package.json` |
| `.nvmrc` | `20` |

**Why not Node 22?** Node 22 was in active development at project start. LTS releases are preferred for production systems to avoid unexpected breaking changes.

### 2.2 Package Manager: npm with package-lock.json

| Decision | Value |
|---|---|
| Tool | npm (bundled with Node.js) |
| Version | npm 10.x (bundled with Node 20) |
| Lock file | `package-lock.json` at workspace root |
| CI command | `npm ci` (not `npm install`) |

**Why npm over yarn/pnpm?**
- npm workspaces are natively supported since npm 7
- No additional tooling installation required
- `package-lock.json` is the industry standard for Node.js projects
- SECURITY-10 compliance: `npm ci` strictly enforces the lock file

---

## 3. Monorepo Tooling

### 3.1 npm Workspaces

| Decision | Value |
|---|---|
| Tool | npm workspaces (native, no additional tooling) |
| Configuration | `"workspaces": ["backend", "frontend", "shared"]` in root `package.json` |
| Version | Built into npm 7+ |

**Why not Turborepo or Nx?**
- npm workspaces provide sufficient functionality for a 3-package monorepo
- No additional dependencies or configuration overhead
- Simpler mental model for a focused project
- Turborepo/Nx add value at larger scale (10+ packages, complex build graphs)

**Workspace resolution**: npm workspaces creates symlinks in `node_modules/@tms/` pointing to the local packages. This means `import { User } from '@tms/shared'` resolves to `shared/src/types/index.ts` without publishing.

---

## 4. Database Layer

### 4.1 ORM: Prisma 5.x

| Decision | Value |
|---|---|
| Package | `prisma` (CLI) + `@prisma/client` (runtime) |
| Version | `5.22.0` (pinned exactly) |
| Database | PostgreSQL 15+ |
| Migration tool | Prisma Migrate |

**Why Prisma over alternatives?**

| Criterion | Prisma | TypeORM | Drizzle | Raw SQL |
|---|---|---|---|---|
| TypeScript integration | Excellent (generated types) | Good | Excellent | Manual |
| Schema-first workflow | Yes | No | No | N/A |
| Migration tooling | Built-in | Built-in | Manual | Manual |
| Query builder | Type-safe | Partial | Type-safe | N/A |
| Learning curve | Low | Medium | Medium | High |
| Ecosystem maturity | High | High | Growing | N/A |

Prisma's generated client provides full type safety for all database operations without manual type definitions. The schema-first approach means the Prisma schema is the single source of truth for the database structure.

**Prisma Client Singleton Pattern**: The Prisma client must be instantiated as a singleton to prevent connection pool exhaustion in development (hot reload creates new instances).

```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 4.2 Database: PostgreSQL 15+

| Decision | Value |
|---|---|
| Version | PostgreSQL 15+ |
| Local dev | Docker Compose or local install |
| Production | Railway/Render managed PostgreSQL add-on |
| Connection | Via `DATABASE_URL` environment variable |

**Why PostgreSQL over MySQL/SQLite?**
- JSON column support (used for `attachments`, `readBy`, `sharedWith`, `content`)
- Full ACID compliance
- Railway and Render both offer managed PostgreSQL add-ons
- Prisma has first-class PostgreSQL support
- SQLite is not suitable for production multi-user scenarios

---

## 5. Language

### 5.1 TypeScript 5.x

| Decision | Value |
|---|---|
| Package | `typescript` |
| Version | `5.6.3` (pinned exactly) |
| Mode | Strict (all strict flags enabled) |
| Target | ES2022 (backend), ES2020 (frontend) |
| Module | NodeNext (backend), ESNext/Bundler (frontend) |

**Why TypeScript 5.x over 4.x?**
- `exactOptionalPropertyTypes` is stable in 5.x
- Improved type inference for complex generics
- Better performance for large codebases
- `const` type parameters (useful for type-safe factory functions)

**Strict mode rationale**: Strict TypeScript catches entire categories of bugs at compile time:
- Null pointer exceptions (strictNullChecks)
- Implicit any types (noImplicitAny)
- Unused variables that indicate logic errors (noUnusedLocals)
- Missing return paths (noImplicitReturns)

---

## 6. Property-Based Testing Framework

### 6.1 fast-check (PBT-09 Selection)

| Decision | Value |
|---|---|
| Package | `fast-check` |
| Version | `3.22.0` (pinned exactly) |
| Integration | Jest (backend), Vitest (frontend) |
| Selection rule | PBT-09: framework selected in Unit 1 |

**Why fast-check over alternatives?**

| Criterion | fast-check | jsverify | hypothesis (Python) |
|---|---|---|---|
| TypeScript support | Native, full inference | Partial | N/A |
| Jest integration | Built-in | Manual | N/A |
| Vitest integration | Built-in | Manual | N/A |
| Shrinking | Automatic | Manual | Automatic |
| Seed reproducibility | Yes (`fc.seed`) | Limited | Yes |
| Active maintenance | Yes | Stale | Yes |
| Documentation | Excellent | Limited | Excellent |

fast-check is the de facto standard for property-based testing in the TypeScript/JavaScript ecosystem. Its native TypeScript support means arbitraries (generators) are fully typed, and the integration with Jest/Vitest is seamless.

**Key fast-check features used in TMS**:
- `fc.string()` — generate arbitrary strings for input validation tests
- `fc.integer()` — generate arbitrary integers for workload calculation tests
- `fc.record()` — generate arbitrary objects matching interface shapes
- `fc.oneof()` — generate values from a set of arbitraries (e.g., enum values)
- `fc.assert(fc.property(...))` — the main test runner
- `fc.seed` — log failing seeds for CI reproducibility

---

## 7. Backend Dependencies (Unit 1 Scope)

These are the dependencies installed in Unit 1. Additional dependencies are added in subsequent units.

### 7.1 Backend Production Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "5.22.0",
    "@tms/shared": "*"
  },
  "devDependencies": {
    "prisma": "5.22.0",
    "typescript": "5.6.3",
    "ts-node": "10.9.2",
    "tsx": "4.19.2",
    "@types/node": "20.17.6",
    "fast-check": "3.22.0",
    "jest": "29.7.0",
    "@types/jest": "29.5.12",
    "ts-jest": "29.2.4"
  }
}
```

### 7.2 Shared Package Dependencies

```json
{
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/node": "20.17.6"
  }
}
```

### 7.3 Frontend Dependencies (Unit 1 Scope)

```json
{
  "dependencies": {
    "@tms/shared": "*",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "vite": "5.4.11",
    "@vitejs/plugin-react": "4.3.3",
    "fast-check": "3.22.0",
    "vitest": "1.6.0",
    "@vitest/ui": "1.6.0"
  }
}
```

---

## 8. Decision Log

| Date | Decision | Alternatives Considered | Rationale |
|---|---|---|---|
| Unit 1 | npm workspaces | Turborepo, Nx, Lerna | Simplest solution for 3-package monorepo |
| Unit 1 | Prisma 5.x | TypeORM, Drizzle, Sequelize | Best TypeScript integration, schema-first |
| Unit 1 | PostgreSQL | MySQL, SQLite | JSON support, managed add-ons on Railway/Render |
| Unit 1 | TypeScript 5.x strict | TypeScript 4.x, JSDoc | Maximum type safety, catches bugs at compile time |
| Unit 1 | fast-check 3.x | jsverify, proptest | Native TypeScript, active maintenance, Jest/Vitest integration |
| Unit 1 | Node 20 LTS | Node 18 LTS, Node 22 | Long-term support, stable, widely supported |
| Unit 1 | npm 10 | yarn, pnpm | Bundled with Node 20, no extra tooling |
