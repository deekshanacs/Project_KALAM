# Code Generation Plan — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

**Unit**: Polish, Testing & Finalization  
**Stories**: US-NOTIF-01, all polish items  
**Dependencies**: All prior units complete

---

## Execution Checklist

### Step 1: Animation Polish
- [x] Create `frontend/src/utils/animations.ts` (pageVariants, drawerVariants, cardHoverVariants, fadeVariants — all with useReducedMotion support)
- [x] Update all page components to use `<AnimatedWrapper variants={pageVariants}>` with AnimatePresence in App.tsx
- [x] Update ProfileDrawer to use drawerVariants
- [x] Update TaskCard to use cardHoverVariants on hover

### Step 2: Skeleton Loaders
- [x] Update all async-loading components to show SkeletonLoader while isLoading:
  - [x] OrgChart: skeleton nodes
  - [x] KanbanBoard: skeleton cards per column
  - [x] MessageThread: skeleton bubbles
  - [x] DocList: skeleton list items
  - [x] Dashboard: skeleton charts
  - [x] SummaryCard: skeleton sections

### Step 3: Error States
- [x] Wrap each page in `<ErrorBoundary>` in App.tsx
- [x] Add error state UI to: OrgChart (failed to load), KanbanBoard (failed to load), MessageThread (failed to load), SummaryCard (AI error)
- [x] Add empty state UI: no tasks in column, no messages, no documents

### Step 4: Responsive Layout
- [x] Update Sidebar to collapse to icon-only on screens < 768px (md breakpoint)
- [x] Update Chat page to single-column on mobile (hide DM/Group list when thread is open)
- [x] Update OrgChart to horizontal scroll on mobile
- [x] Test all pages at 375px, 768px, 1280px breakpoints

### Step 5: Notification System (Full Integration)
- [x] Create `frontend/src/components/layout/NotificationDropdown.tsx` (dropdown from bell icon: list of notifications with type icon + title + message + time, mark all read button, click navigates to resource; data-testid: notification-dropdown, notification-item-{id}, mark-all-read-btn)
- [x] Update Topbar to render NotificationDropdown with unreadCount badge
- [x] Verify socket 'notification:new' events update notification state in real-time (US-NOTIF-01)

### Step 6: Backend PBT Tests
- [x] Create `backend/src/services/__tests__/pbt/auth.pbt.test.ts` (JWT round-trip, bcrypt invariant, workload range, token revocation idempotency, hierarchy traversal determinism)
- [x] Create `backend/src/services/__tests__/pbt/task.pbt.test.ts` (workload invariant, assignment determinism, status idempotency, task serialization round-trip)
- [x] Create `backend/src/services/__tests__/pbt/chat.pbt.test.ts` (message serialization round-trip, readBy no duplicates)
- [x] Create `backend/src/services/__tests__/pbt/document.pbt.test.ts` (sharedWith no duplicates, document JSON round-trip)

### Step 7: Frontend PBT Tests
- [x] Create `frontend/src/utils/__tests__/pbt/workload.pbt.test.ts` (percentage in [0,100], color tier invariant)
- [x] Create `frontend/src/utils/__tests__/pbt/rolePermissions.pbt.test.ts` (canAssign determinism)
- [x] Create `frontend/src/hooks/__tests__/pbt/useNotifications.pbt.test.ts` (max 50 invariant)
- [x] Create `frontend/src/hooks/__tests__/pbt/useAIStream.pbt.test.ts` (chunks concatenated = complete content)

### Step 8: Backend Integration Tests
- [x] Create `backend/src/tests/integration/auth.integration.test.ts` (register → login → refresh → logout flow)
- [x] Create `backend/src/tests/integration/task.integration.test.ts` (create task as TM assigning to JTM; create task as JTM → expect 403)
- [x] Create `backend/src/tests/integration/chat.integration.test.ts` (send DM → read receipt)
- [x] Create `backend/src/tests/integration/document.integration.test.ts` (create → share → access as shared user)
- [x] Create `backend/src/tests/helpers/testDb.ts` (cleanDatabase, createTestUser, createTestTask)

### Step 9: CI/CD Configuration
- [x] Create `.github/workflows/ci.yml` (lint → type-check → backend tests → frontend tests → build)
- [x] Create `backend/jest.config.ts` (ts-jest, testEnvironment node, coverage thresholds)
- [x] Create `frontend/vitest.config.ts` (reporters: verbose for seed logging, coverage: v8)

### Step 10: README & Documentation
- [x] Create `README.md` (project overview, prerequisites: Node 20 + PostgreSQL, installation: npm install, env setup, seed: npm run seed, dev: npm run dev:backend + npm run dev:frontend, tests: npm test, deployment notes)
- [x] Finalize `backend/.env.example` (all vars with description comments)
- [x] Finalize `frontend/.env.example` (all vars with description comments)
- [x] Create `vercel.json` (rewrites: all routes → /index.html for SPA routing)

### Step 11: Final Verification
- [x] Run `npm run type-check --workspaces` — zero errors
- [x] Run `npm run build --workspaces` — successful build
- [x] Verify all `data-testid` attributes present on interactive elements
- [x] Verify `.env` files are in `.gitignore`
- [x] Verify no hardcoded secrets in source code

### Step 12: Documentation
- [x] Create `aidlc-docs/construction/unit-8-polish/code/unit-8-summary.md`

---

## Story Coverage
- US-NOTIF-01: NotificationDropdown + socket notification:new integration
- All stories: animations, skeleton loaders, error states, responsive layout

