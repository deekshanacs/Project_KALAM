# Unit of Work Dependency Matrix — TMS (Project KALAM)

---

## Dependency Matrix

| Unit | Depends On | Reason |
|---|---|---|
| Unit 1: Foundation | None | Starting point — no dependencies |
| Unit 2: Backend Core | Unit 1 | Requires Prisma schema, shared types, env config |
| Unit 3: Backend Features | Unit 2 | Requires auth middleware, user hierarchy, Socket.io init |
| Unit 4: Backend AI & Chat | Unit 2, Unit 3 | Requires auth middleware, Socket.io server, file upload |
| Unit 5: Frontend Core | Unit 1, Unit 2 | Requires shared types, auth API endpoints |
| Unit 6: Frontend Team & Tasks | Unit 5, Unit 3 | Requires layout, auth context, task API, Socket.io events |
| Unit 7: Frontend Chat & AI | Unit 5, Unit 4 | Requires layout, auth context, chat/AI/docs API |
| Unit 8: Polish & Finalization | All units | Requires all features complete for integration testing |

---

## Critical Path

```
Unit 1 (Foundation)
    |
    +---> Unit 2 (Backend Core)
    |         |
    |         +---> Unit 3 (Backend Features)
    |         |         |
    |         |         +---> Unit 4 (Backend AI & Chat)
    |         |                   |
    |         +---> Unit 5 (Frontend Core)
    |                   |
    |                   +---> Unit 6 (Frontend Team & Tasks)
    |                   |         |
    |                   +---> Unit 7 (Frontend Chat & AI)
    |                             |
    +-----------------------------+---> Unit 8 (Polish & Finalization)
```

---

## Parallelization Opportunities

After Unit 2 is complete, the following can proceed in parallel:
- **Unit 3** (Backend Features) and **Unit 5** (Frontend Core) can be developed simultaneously
- After Unit 3 and Unit 5 are complete: **Unit 4** (Backend AI & Chat) and **Unit 6** (Frontend Team & Tasks) can proceed in parallel
- After Unit 4 and Unit 6 are complete: **Unit 7** (Frontend Chat & AI) can proceed
- **Unit 8** requires all prior units complete

---

## Recommended Development Sequence

For a single developer (sequential):
1. Unit 1 → Unit 2 → Unit 3 → Unit 4 → Unit 5 → Unit 6 → Unit 7 → Unit 8

For a two-developer team (parallel):
- Developer A: Unit 1 → Unit 2 → Unit 3 → Unit 4
- Developer B: (waits for Unit 2) → Unit 5 → Unit 6 → Unit 7
- Both: Unit 8 together
