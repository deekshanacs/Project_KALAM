# NFR Requirements — Unit 1: Foundation
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 1 establishes the non-functional baseline for the entire TMS system. The NFRs defined here are foundational — they constrain every subsequent unit. Violations in Unit 1 propagate to all downstream units, so these requirements are treated as blocking constraints.

---

## 2. Performance Requirements

### 2.1 Seed Script Execution Time

| Requirement | Target | Measurement |
|---|---|---|
| Full seed execution | < 30 seconds | Wall clock time from `npx prisma db seed` to completion |
| Individual user creation | < 100ms per user | Prisma upsert per user record |
| Prisma client generation | < 60 seconds | `npx prisma generate` |
| Initial migration | < 10 seconds | `npx prisma migrate dev --name init` |

**Rationale**: The seed script runs in CI and during developer onboarding. Slow seeds degrade the development experience. The 30-second target accommodates bcrypt hashing (cost 12) for 10 users plus all relational data.

### 2.2 Prisma Query Performance Baseline

| Query Type | Target | Notes |
|---|---|---|
| Single record by primary key | < 5ms | `findUnique` by `id` |
| List with simple filter | < 20ms | `findMany` with single `where` clause |
| List with join (include) | < 50ms | `findMany` with `include` for one relation |
| Upsert operation | < 30ms | `upsert` with unique key |

**Rationale**: These are baseline targets for a local development PostgreSQL instance. Production targets (defined in Unit 2) are more stringent.

### 2.3 TypeScript Compilation Time

| Requirement | Target | Notes |
|---|---|---|
| Full build (all packages) | < 60 seconds | `npm run build` from workspace root |
| Incremental build | < 10 seconds | With `tsc --incremental` |
| Type checking only | < 30 seconds | `tsc --noEmit` |

---

## 3. Security Requirements

### 3.1 SECURITY-10: Dependency Pinning and Lock Files

**Requirement**: All npm dependencies must use exact version pinning. No range specifiers (`^`, `~`, `*`, `>=`) are permitted in `dependencies` or `devDependencies`.

**Enforcement**:
- All `package.json` files must use exact versions: `"express": "4.18.2"` not `"express": "^4.18.2"`
- A single `package-lock.json` at the workspace root must be committed to source control
- `npm ci` must be used in CI/CD pipelines (not `npm install`) to enforce lock file integrity
- The lock file must be regenerated and reviewed when dependencies are updated

**Verification**:
```bash
# Check for range specifiers in all package.json files
grep -r '"\^' backend/package.json frontend/package.json shared/package.json
grep -r '"~' backend/package.json frontend/package.json shared/package.json
# Both commands should return no output
```

**Rationale**: Exact pinning prevents supply chain attacks via unexpected minor/patch version updates that could introduce malicious code or breaking changes.

### 3.2 SECURITY-09: No Default Credentials in Seed

**Requirement**: Seed data must not use credentials that could be mistaken for production defaults or that are trivially guessable.

**Rules**:
- Seed passwords must be documented as development-only in `.env.example` comments
- Seed passwords must not be the same as any example value in `.env.example`
- The seed script must log a warning when `NODE_ENV !== 'production'` to confirm it is running in a safe environment
- The seed script must refuse to run if `NODE_ENV === 'production'` (fail-safe guard)

**Implementation**:
```typescript
// In seed.ts
if (process.env.NODE_ENV === 'production') {
  console.error('SEED SCRIPT REFUSED: Cannot run seed in production environment');
  process.exit(1);
}
```

**Rationale**: Seed scripts with weak passwords running in production are a common attack vector. The production guard prevents accidental execution.

### 3.3 SECURITY-09: No Secrets in Source Code

**Requirement**: No secrets, API keys, database credentials, or JWT secrets may appear in source code or committed files.

**Rules**:
- All secrets are loaded from environment variables only
- `.env` files are listed in `.gitignore`
- `.env.example` files use placeholder values (e.g., `JWT_SECRET="change-me-to-a-random-256-bit-secret"`)
- The `ANTHROPIC_API_KEY` placeholder in `.env.example` must clearly indicate it is a secret

**Verification**:
```bash
# Ensure .env is gitignored
git check-ignore -v .env
# Should output: .gitignore:N:.env
```

### 3.4 Dependency Vulnerability Scanning

**Requirement**: The initial dependency set must have zero known high or critical vulnerabilities at the time of installation.

**Enforcement**:
```bash
npm audit --audit-level=high
# Must return: found 0 vulnerabilities
```

**Rationale**: Starting with a clean vulnerability baseline makes it easier to track new vulnerabilities introduced by future dependency updates.

---

## 4. Maintainability Requirements

### 4.1 TypeScript Strict Mode

**Requirement**: All TypeScript files across all packages must compile without errors under strict mode configuration.

**Rules**:
- `strict: true` must be set in `tsconfig.base.json`
- No `@ts-ignore` or `@ts-expect-error` directives in production code
- No `any` types in production code
- All functions must have explicit return types

**Verification**:
```bash
# From workspace root
npx tsc --noEmit --project backend/tsconfig.json
npx tsc --noEmit --project frontend/tsconfig.json
npx tsc --noEmit --project shared/tsconfig.json
# All must exit with code 0
```

### 4.2 Shared Types as Single Source of Truth

**Requirement**: All TypeScript interfaces for domain entities must be defined in `shared/src/types/index.ts` and imported from `@tms/shared` in both backend and frontend.

**Rules**:
- No duplicate interface definitions across packages
- No inline type definitions for domain entities in route handlers or components
- The shared types barrel export must be the only export from the shared package

**Verification**:
```bash
# Check for duplicate User interface definitions
grep -r "interface User" backend/src/ frontend/src/
# Should return no results (User is only in shared/)
```

### 4.3 Monorepo Structure Compliance

**Requirement**: The monorepo must follow the defined directory structure exactly.

**Rules**:
- Application code lives in workspace root packages (`/backend`, `/frontend`, `/shared`)
- Documentation lives in `/aidlc-docs` only
- No application code in `/aidlc-docs`
- No documentation in application source directories

---

## 5. Testability Requirements

### 5.1 PBT-09: fast-check Selected as PBT Framework

**Requirement**: `fast-check` is the selected property-based testing framework for the TMS project. It must be installed and configured in Unit 1 so it is available for all subsequent units.

**Installation**:
```json
// backend/package.json devDependencies
{
  "fast-check": "3.22.0",
  "jest": "29.7.0",
  "@types/jest": "29.5.12",
  "ts-jest": "29.2.4"
}
```

```json
// frontend/package.json devDependencies
{
  "fast-check": "3.22.0",
  "vitest": "1.6.0",
  "@vitest/ui": "1.6.0"
}
```

**Rationale for fast-check selection**:
- Native TypeScript support with full type inference
- Integrates with both Jest (backend) and Vitest (frontend)
- Shrinking support: automatically minimizes failing examples
- Seed-based reproducibility: failing seeds can be logged and replayed
- Active maintenance and large community

**Configuration**:
```typescript
// backend/jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
```

### 5.2 Test Directory Structure

**Requirement**: Test files must be co-located with source files using the `.test.ts` or `.spec.ts` suffix.

```
backend/src/
├── services/
│   ├── workload.service.ts
│   └── workload.service.test.ts    ← unit tests + PBT
├── middleware/
│   ├── auth.ts
│   └── auth.test.ts
```

### 5.3 Seed Data Testability

**Requirement**: The seed script must be structured so individual seed functions can be imported and called in test setup/teardown.

```typescript
// seed.ts exports individual functions for test use
export async function seedUsers(prisma: PrismaClient): Promise<SeedUsers>
export async function seedTasks(prisma: PrismaClient, users: SeedUsers): Promise<void>
export async function seedMessages(prisma: PrismaClient, users: SeedUsers): Promise<void>
export async function seedDocuments(prisma: PrismaClient, users: SeedUsers): Promise<void>
```

---

## 6. Reliability Requirements

### 6.1 Environment Validation on Startup

**Requirement**: The backend must validate all required environment variables at startup and exit with a non-zero code if any are missing.

**Required Variables**:
```
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
PORT
CORS_ORIGIN
UPLOAD_DIR
```

**Optional Variables** (with defaults):
```
NODE_ENV (default: 'development')
ANTHROPIC_API_KEY (required only for AI routes)
```

### 6.2 Database Connection Validation

**Requirement**: The backend must verify the database connection on startup before accepting requests.

```typescript
// In startup sequence
await prisma.$connect();
// If this throws, log the error and exit(1)
```

### 6.3 Uploads Directory Creation

**Requirement**: The backend must create the `UPLOAD_DIR` directory on startup if it does not exist.

```typescript
import { mkdirSync, existsSync } from 'fs';
const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}
```

---

## 7. Extension Compliance Summary

| Extension Rule | Status | Notes |
|---|---|---|
| SECURITY-09 (no secrets in code) | Compliant | .env.example with placeholders, .gitignore configured |
| SECURITY-10 (dependency pinning) | Compliant | Exact versions in all package.json files |
| PBT-09 (fast-check selected) | Compliant | fast-check installed in both backend and frontend |
| All other SECURITY rules | N/A | Not applicable to Unit 1 (no auth, no API endpoints) |
| PBT-01 through PBT-08 | N/A | No business logic to test in Unit 1 |
| PBT-10 | N/A | No CI pipeline in Unit 1 scope |
