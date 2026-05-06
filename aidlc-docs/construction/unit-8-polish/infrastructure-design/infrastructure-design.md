# Infrastructure Design — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: tms_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run type-check --workspaces
      - run: npm run lint --workspaces
      - run: npm run test --workspace=backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/tms_test
          JWT_SECRET: test-secret-32-chars-minimum-here
          JWT_REFRESH_SECRET: test-refresh-secret-32-chars-here
      - run: npm run test --workspace=frontend
      - run: npm run build --workspaces
```

## Test Database
- Separate PostgreSQL database: `tms_test`
- `DATABASE_URL` for tests: `postgresql://postgres:postgres@localhost:5432/tms_test`
- Migrations run before tests: `npx prisma migrate deploy`
- Data cleaned between tests via `cleanDatabase()` helper

## Coverage
- Backend: Jest with `--coverage` flag, Istanbul/c8 reporter
- Frontend: Vitest with `@vitest/coverage-v8`
- Coverage thresholds: lines 70%, functions 70%, branches 60%
