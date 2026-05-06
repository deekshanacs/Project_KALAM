# Integration Test Instructions — TMS (Project KALAM)

## Setup

```bash
# Ensure test database exists and is migrated
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tms_test npx prisma migrate deploy --prefix backend

# Start backend in test mode (optional — supertest starts it internally)
```

## Run Integration Tests

```bash
npm run test:integration --workspace=backend
```

Or run specific integration test:
```bash
npm run test --workspace=backend -- --testPathPattern=integration
```

---

## Test Scenarios

### Scenario 1: Auth Flow (register → login → refresh → logout)
**File**: `backend/src/tests/integration/auth.integration.test.ts`
- POST /api/auth/register → 201, returns user + tokens
- POST /api/auth/login → 200, returns user + tokens
- POST /api/auth/refresh → 200, returns new token pair
- POST /api/auth/logout → 200, refresh token revoked
- POST /api/auth/refresh (with revoked token) → 401

### Scenario 2: Task CRUD with Role Guards
**File**: `backend/src/tests/integration/task.integration.test.ts`
- POST /api/tasks as TM assigning to own JTM → 201
- POST /api/tasks as JTM → 403 Forbidden
- POST /api/tasks as TM assigning to another TM's JTM → 403
- PATCH /api/tasks/:id/status → 200, workload recalculated

### Scenario 3: Chat Message Flow
**File**: `backend/src/tests/integration/chat.integration.test.ts`
- POST /api/messages/direct → 201, message created
- POST /api/messages/:id/read → 200, userId added to readBy
- PATCH /api/messages/:id (by sender) → 200, content updated
- PATCH /api/messages/:id (by non-sender) → 403
- DELETE /api/messages/:id (by sender) → 200, soft deleted

### Scenario 4: Document Create → Share → Access
**File**: `backend/src/tests/integration/document.integration.test.ts`
- POST /api/documents → 201
- POST /api/documents/:id/share (with userId, VIEW) → 200
- GET /api/documents/:id (as shared user) → 200
- PATCH /api/documents/:id (as VIEW-only user) → 403

---

## Test Helpers

```bash
# Clean test database between test suites
# Handled automatically by beforeEach in testDb.ts helper
```

**Test isolation**: Each test suite calls `cleanDatabase()` in `beforeEach` to ensure no state leakage between tests.
