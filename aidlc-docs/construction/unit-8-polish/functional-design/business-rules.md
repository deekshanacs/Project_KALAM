# Business Rules — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## Animation Rules
- **BR-ANIM-01**: All animations must respect `prefers-reduced-motion` media query. Use `useReducedMotion()` from Framer Motion and disable animations when true.
- **BR-ANIM-02**: Page transitions: 300ms max duration.
- **BR-ANIM-03**: Drawer slides: spring animation (damping 25, stiffness 200).
- **BR-ANIM-04**: Card hover: 150ms scale transition.

## Error Boundary Rules
- **BR-ERR-01**: Every page component is wrapped in an `ErrorBoundary`.
- **BR-ERR-02**: Error fallback shows a friendly message ("Something went wrong") with a Retry button.
- **BR-ERR-03**: In development, error details logged to console. In production, generic message only (SECURITY-09).

## Notification Rules
- **BR-NOTIF-01**: Max 50 notifications in memory. When limit reached, oldest is removed (FIFO).
- **BR-NOTIF-02**: Badge shows count up to 99; above 99 shows "99+".
- **BR-NOTIF-03**: Clicking a notification navigates to the relevant resource and marks it read.
- **BR-NOTIF-04**: "Mark all read" button sets all notifications to read state.

## Testing Rules
- **BR-TEST-01**: All fast-check (PBT) tests must log the seed on failure (PBT-08 compliance).
- **BR-TEST-02**: CI pipeline runs PBT tests with `--reporter=verbose` to capture seed output.
- **BR-TEST-03**: Every business logic function must have both example-based tests AND PBT tests (PBT-10).
- **BR-TEST-04**: Test database uses a separate `DATABASE_URL` (e.g., `tms_test` database).
- **BR-TEST-05**: Each integration test creates its own data and cleans up after (no shared state).

## Documentation Rules
- **BR-DOC-01**: README must include: prerequisites, installation steps, env var setup, seed instructions, dev server start, test commands.
- **BR-DOC-02**: `.env.example` must document every environment variable with a description comment.
- **BR-DOC-03**: All `data-testid` attributes must follow the convention `{component}-{element-role}`.
