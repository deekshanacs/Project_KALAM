# Tech Stack Decisions — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

| Package | Version | Purpose |
|---|---|---|
| `vitest` | `1.6.0` | Frontend unit + PBT test runner |
| `@vitest/coverage-v8` | `1.6.0` | Frontend coverage |
| `@testing-library/react` | `16.0.0` | React component testing |
| `@testing-library/user-event` | `14.5.2` | User interaction simulation |
| `@testing-library/jest-dom` | `6.4.6` | Custom DOM matchers |
| `jest` | `29.7.0` | Backend unit + integration test runner |
| `@types/jest` | `29.5.12` | TypeScript types for Jest |
| `ts-jest` | `29.2.3` | TypeScript transformer for Jest |
| `supertest` | `7.0.0` | HTTP integration testing |
| `@types/supertest` | `6.0.2` | TypeScript types |
| `fast-check` | `3.22.0` | PBT framework (already in Unit 5, reused) |

All versions pinned exactly per SECURITY-10.
