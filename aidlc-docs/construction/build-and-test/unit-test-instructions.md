# Unit Test Execution Instructions — TMS (Project KALAM)

## Backend Unit Tests (Jest + fast-check)

### Setup
```bash
# Create test database
createdb tms_test
# Or with Docker:
docker exec tms-postgres psql -U postgres -c "CREATE DATABASE tms_test;"

# Run migrations on test database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tms_test npx prisma migrate deploy --prefix backend
```

### Run All Backend Tests
```bash
npm run test --workspace=backend
```

### Run with Coverage
```bash
npm run test:coverage --workspace=backend
```

### Run Specific Test File
```bash
npm run test --workspace=backend -- --testPathPattern=auth.service
```

**Expected**: All tests pass. Coverage ≥ 70% lines/functions.

### PBT Tests (Property-Based)
PBT tests are co-located with unit tests in `__tests__/pbt/` subdirectories.
```bash
# Run only PBT tests
npm run test --workspace=backend -- --testPathPattern=pbt
```
**Seed logging**: On failure, fast-check prints the seed. Re-run with:
```bash
fc.assert(fc.property(...), { seed: <SEED_FROM_OUTPUT> })
```

---

## Frontend Unit Tests (Vitest + fast-check)

### Run All Frontend Tests
```bash
npm run test --workspace=frontend
```

### Run with Coverage
```bash
npm run test:coverage --workspace=frontend
```

### Run in Watch Mode (development)
```bash
npm run test:watch --workspace=frontend
```

**Expected**: All tests pass. Coverage ≥ 70% lines/functions.

---

## Test File Locations

| Unit | Backend Tests | Frontend Tests |
|---|---|---|
| Unit 1 | N/A (schema only) | N/A |
| Unit 2 | `backend/src/services/__tests__/auth.service.test.ts` | N/A |
| Unit 2 | `backend/src/services/__tests__/workload.service.test.ts` | N/A |
| Unit 2 | `backend/src/services/__tests__/user.service.test.ts` | N/A |
| Unit 3 | `backend/src/services/__tests__/task.service.test.ts` | N/A |
| Unit 4 | `backend/src/services/__tests__/chat.service.test.ts` | N/A |
| Unit 4 | `backend/src/services/__tests__/document.service.test.ts` | N/A |
| Unit 5 | N/A | `frontend/src/utils/__tests__/workload.test.ts` |
| Unit 5 | N/A | `frontend/src/utils/__tests__/rolePermissions.test.ts` |
| Unit 6 | N/A | `frontend/src/utils/__tests__/orgTree.test.ts` |
| Unit 7 | N/A | `frontend/src/hooks/__tests__/useAIStream.test.ts` |
| Unit 8 (PBT) | `backend/src/services/__tests__/pbt/*.pbt.test.ts` | `frontend/src/utils/__tests__/pbt/*.pbt.test.ts` |
