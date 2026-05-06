# Execution Plan — TMS (Project KALAM)

---

## Detailed Analysis Summary

### Change Impact Assessment
- **User-facing changes**: Yes — entire application is user-facing across 6 pages
- **Structural changes**: Yes — new full-stack monorepo from scratch
- **Data model changes**: Yes — 6 Prisma models (User, Task, Message, Group, Document, Project)
- **API changes**: Yes — 30+ REST endpoints + Socket.io events
- **NFR impact**: Yes — security (JWT, bcrypt, rate limiting), performance (real-time), scalability (stateless backend)

### Risk Assessment
- **Risk Level**: High (complex, multi-subsystem, AI integration, real-time, WebRTC)
- **Rollback Complexity**: N/A (greenfield — no rollback needed)
- **Testing Complexity**: Complex (unit + integration + PBT + real-time)

---

## Workflow Visualization

```
INCEPTION PHASE
+---------------------------+
| Workspace Detection       | COMPLETED
| Reverse Engineering       | SKIPPED (Greenfield)
| Requirements Analysis     | COMPLETED
| User Stories              | COMPLETED
| Workflow Planning         | IN PROGRESS
| Application Design        | EXECUTE
| Units Generation          | EXECUTE
+---------------------------+
            |
            v
CONSTRUCTION PHASE (per unit)
+---------------------------+
| Functional Design         | EXECUTE
| NFR Requirements          | EXECUTE
| NFR Design                | EXECUTE
| Infrastructure Design     | EXECUTE
| Code Generation           | EXECUTE (ALWAYS)
| Build and Test            | EXECUTE (ALWAYS)
+---------------------------+
            |
            v
OPERATIONS PHASE
+---------------------------+
| Operations                | PLACEHOLDER
+---------------------------+
```

---

## Phases to Execute

### INCEPTION PHASE
- [x] Workspace Detection — COMPLETED
- [x] Reverse Engineering — SKIPPED (Greenfield)
- [x] Requirements Analysis — COMPLETED
- [x] User Stories — COMPLETED
- [x] Workflow Planning — IN PROGRESS
- [ ] Application Design — **EXECUTE**
  - **Rationale**: New full-stack system with 6+ major components (Auth, OrgChart, Tasks, Chat, AI, Documents). Component boundaries, service layer, and dependency graph must be defined before decomposing into units.
- [ ] Units Generation — **EXECUTE**
  - **Rationale**: System has multiple distinct subsystems (frontend, backend, shared types) and 22 implementation steps. Decomposing into units enables structured parallel development and clear ownership.

### CONSTRUCTION PHASE (per unit)
- [ ] Functional Design — **EXECUTE** (per unit)
  - **Rationale**: New data models, complex business logic (role-based permissions, workload calculation, AI streaming), and business rules need detailed design per unit.
- [ ] NFR Requirements — **EXECUTE** (per unit)
  - **Rationale**: Security (JWT rotation, bcrypt, rate limiting), performance (real-time Socket.io, Claude streaming), and scalability concerns are significant and need explicit NFR assessment.
- [ ] NFR Design — **EXECUTE** (per unit)
  - **Rationale**: NFR patterns (security middleware, rate limiting, structured logging, PBT framework) need to be incorporated into the design.
- [ ] Infrastructure Design — **EXECUTE** (per unit)
  - **Rationale**: Deployment to Vercel requires specific configuration; PostgreSQL + Prisma + Socket.io + local file storage need infrastructure mapping.
- [ ] Code Generation — **EXECUTE** (ALWAYS, per unit)
- [ ] Build and Test — **EXECUTE** (ALWAYS)

### OPERATIONS PHASE
- [ ] Operations — PLACEHOLDER

---

## Recommended Unit Decomposition (Preview)

The system will be decomposed into the following units (finalized in Units Generation stage):

| Unit | Description |
|---|---|
| **Unit 1: Foundation** | Monorepo setup, shared types, Prisma schema, seed data, env config |
| **Unit 2: Backend Core** | Auth routes, JWT middleware, Users CRUD, hierarchy, workload API |
| **Unit 3: Backend Features** | Tasks CRUD + role guard, Socket.io setup, Chat + Groups routes |
| **Unit 4: Backend AI & Docs** | AI routes (Claude), File upload, Documents CRUD + sharing, Notifications |
| **Unit 5: Frontend Core** | Vite scaffold, Tailwind + shadcn, Auth pages, AuthContext, Layout |
| **Unit 6: Frontend Team & Tasks** | Org chart (DnD), Profile drawer, Task Kanban board (DnD) |
| **Unit 7: Frontend Chat & AI** | Chat page (Socket.io), AI Tools page (both modes), Documents page |
| **Unit 8: Polish & Finalization** | Animations, skeleton loaders, error states, responsive layout, README |

---

## Success Criteria
- **Primary Goal**: Fully functional TMS with all 22 implementation steps completed
- **Key Deliverables**: Working frontend + backend + database + real-time + AI integration
- **Quality Gates**:
  - All Security Baseline rules (SECURITY-01 through SECURITY-15) compliant
  - All PBT rules (PBT-01 through PBT-10) compliant
  - TypeScript strict mode — no `any` types
  - All API endpoints have role-based authorization
  - Real-time events working for status, tasks, chat, notifications
