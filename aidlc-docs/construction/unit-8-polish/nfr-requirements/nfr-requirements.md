# NFR Requirements — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## Performance
- Lighthouse performance score > 80 on production build.
- All images lazy-loaded.
- Code splitting: each page is a lazy-loaded chunk (React.lazy + Suspense).

## Accessibility
- WCAG 2.1 AA target: color contrast ratio ≥ 4.5:1 for all text.
- All interactive elements keyboard accessible (Tab, Enter, Space, Escape).
- All form inputs have associated `<label>` elements.
- All images have `alt` attributes.
- Focus management: modals trap focus; drawers return focus on close.

## Testing (PBT Compliance)
- **PBT-08**: fast-check seed logged on every CI run; failing seed reproducible.
- **PBT-09**: fast-check 3.x configured as PBT framework (already selected in Unit 5).
- **PBT-10**: All critical business paths have both example-based and property-based tests.

## Documentation
- README covers: prerequisites (Node 20, PostgreSQL), installation, env setup, seed, dev start, test commands, deployment notes.
- `.env.example` files complete and accurate for both frontend and backend.
- All `data-testid` attributes present on interactive elements.

## CI/CD
- GitHub Actions workflow: lint → type-check → unit tests → PBT tests → build → deploy.
- Backend tests run against `tms_test` database (separate from dev).
- Frontend tests run with Vitest in CI mode (no watch).
