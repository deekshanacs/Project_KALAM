# Units of Work — TMS (Project KALAM)

The TMS system is decomposed into 8 units of work for structured development.
Each unit is a logical grouping of related implementation tasks that can be developed and tested independently.

---

## Unit 1: Foundation
**Description**: Monorepo scaffolding, shared types, Prisma schema, seed data, and environment configuration.

**Scope**:
- Initialize monorepo with `/frontend`, `/backend`, `/shared` packages
- Install all dependencies (frontend + backend)
- Define `/shared/types/index.ts` with all shared interfaces and enums
- Create `prisma/schema.prisma` with all 6 models (User, Task, Message, Group, Document, Project)
- Create `prisma/seed.ts` with 10 seed users + sample data
- Create `.env.example` files for frontend and backend
- Configure TypeScript strict mode for all packages

**Components**: SC-01 (SharedTypes), Prisma schema  
**Stories**: Foundation for all epics  
**Deliverables**: Working monorepo, compilable TypeScript, seeded database

---

## Unit 2: Backend Core — Auth & Users
**Description**: Authentication system (JWT rotation, bcrypt, brute-force protection) and user management (CRUD, hierarchy, workload, availability).

**Scope**:
- Express server setup with middleware stack (helmet, cors, rate-limit, logger, error handler)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
- JWT middleware (authMiddleware) + role guard middleware
- `GET /api/users`, `GET /api/users/:id`, `PATCH /api/users/:id/status`, `PATCH /api/users/:id/supervisor`
- `GET /api/users/:id/tasks`, `GET /api/users/:id/workload`
- Zod validation schemas for all auth + user DTOs
- Structured logging (Winston/Pino)
- Brute-force protection on login

**Components**: BC-01, BC-02, BC-09 (Socket init), SVC-01, SVC-02, SVC-X1, SVC-X2, SVC-X3, SVC-X4  
**Stories**: US-AUTH-01 through US-AUTH-04  
**Deliverables**: Working auth API, user API, JWT middleware, all security middleware

---

## Unit 3: Backend Features — Tasks & Socket.io
**Description**: Task management with role-based assignment, Kanban status transitions, comments, time tracking, and Socket.io real-time events.

**Scope**:
- Socket.io server initialization and room management
- `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`, `PATCH /api/tasks/:id/status`
- Task comments API: `POST /api/tasks/:id/comments`, `GET /api/tasks/:id/comments`
- Time tracking API: `POST /api/tasks/:id/time-logs`, `GET /api/tasks/:id/time-logs`
- Role-based assignment validation middleware
- Workload recalculation on status change
- Socket.io events: `task:assigned`, `task:updated`

**Components**: BC-03, BC-09, SVC-03, SVC-07  
**Stories**: US-TASK-01 through US-TASK-06  
**Deliverables**: Working task API with role guards, Socket.io server, workload service

---

## Unit 4: Backend AI, Chat & Documents
**Description**: Chat (DMs + groups + read receipts + edit/delete), AI routes (Claude streaming + summarization), file upload, and documents CRUD with sharing.

**Scope**:
- `GET /api/messages/direct/:userId`, `POST /api/messages/direct`
- `GET /api/messages/group/:groupId`, `POST /api/messages/group`
- `POST /api/groups`, `GET /api/groups`
- Message edit/delete endpoints
- Socket.io events: `message:new`, `notification:new`
- WebRTC signaling relay via Socket.io (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`)
- `POST /api/ai/summarize` (multipart → Claude → JSON response)
- `POST /api/ai/create-document` (JSON → Claude streaming → SSE/chunked response)
- `POST /api/upload` (Multer → local /uploads → URL)
- `GET /api/documents`, `POST /api/documents`, `PATCH /api/documents/:id`, `GET /api/documents/:id`, `POST /api/documents/:id/share`
- DOCX generation using `docx` npm package

**Components**: BC-04, BC-05, BC-06, BC-07, BC-08, SVC-04, SVC-05, SVC-06  
**Stories**: US-CHAT-01 through US-CHAT-05, US-AI-01, US-AI-02, US-DOC-01, US-DOC-02  
**Deliverables**: Working chat API, AI API (with streaming), file upload, documents API

---

## Unit 5: Frontend Core — Auth, Layout & Dashboard
**Description**: Vite project scaffold, Tailwind + shadcn/ui setup, auth pages, AuthContext, SocketContext, layout shell, and dashboard.

**Scope**:
- Vite + React 18 + TypeScript scaffold
- Tailwind CSS + shadcn/ui + Framer Motion setup
- Login and registration pages (dark/light mode, animated background)
- AuthContext + useAuth hook (token storage, refresh interceptor)
- SocketContext + useSocket hook
- Layout: Sidebar (collapsible), Topbar (avatar, status badge, notification bell, search)
- Dashboard page with Recharts charts (tasks by status, workload distribution)
- CommonComponents: Avatar, StatusBadge, RoleBadge, WorkloadBar, SkeletonLoader, Toast
- Typed axios client with interceptors

**Components**: FC-01, FC-02, FC-08, FC-09, SC-01  
**Stories**: US-AUTH-01, US-AUTH-02, US-DASH-01  
**Deliverables**: Working frontend scaffold, auth flow, layout, dashboard

---

## Unit 6: Frontend Team & Tasks
**Description**: Interactive org chart with drag-and-drop, profile drawer, and Kanban task board with drag-and-drop.

**Scope**:
- Org chart page using @dnd-kit/core
- ProfileCard nodes (avatar ring, workload bar, role badge)
- Subtree drag-and-drop with role-based permission checks
- ProfileDrawer (slide-in, full profile, assign task, chat button)
- Kanban board using @dnd-kit/sortable
- TaskCard components (priority badge, due date, assignee avatar)
- TaskModal (create/edit, file attach, role-gated assignment)
- FilterBar (assignee, priority, project, date)
- Task comment thread in TaskModal
- Time log section in TaskModal
- Real-time updates via useSocket

**Components**: FC-03, FC-04  
**Stories**: US-ORG-01 through US-ORG-04, US-TASK-01 through US-TASK-06  
**Deliverables**: Working org chart, profile drawer, Kanban board

---

## Unit 7: Frontend Chat, AI Tools & Documents
**Description**: Real-time chat page, AI tools page (both modes), and documents page.

**Scope**:
- Chat page: DM list, group list, message thread, composer (rich text, emoji, file attach)
- Message edit/delete, read receipts, unread badges
- Group creation modal
- Link preview cards
- WebRTC video/audio call UI (simple-peer or native WebRTC)
- AI Tools page: tab switcher (Summarizer / Creator)
- FileUploader (drag & drop, multi-format)
- SummaryCard (formatted Claude response)
- DocCreator (10-question setup flow with option buttons)
- Streaming response rendering (progressive token display)
- Document preview pane + DOCX download button
- Documents page: DocList, TipTap editor, ShareModal

**Components**: FC-05, FC-06, FC-07  
**Stories**: US-CHAT-01 through US-CHAT-05, US-AI-01, US-AI-02, US-DOC-01, US-DOC-02  
**Deliverables**: Working chat, AI tools, documents pages

---

## Unit 8: Polish, Testing & Finalization
**Description**: Animations, skeleton loaders, error states, responsive layout, PBT tests, README, and final integration.

**Scope**:
- Framer Motion page transitions, drawer slides, card hover animations
- Skeleton loaders for all async content
- Error boundary components and error state UI
- Responsive layout (sidebar collapse on small screens)
- Notification system (bell icon, badge, real-time delivery)
- Property-based tests (fast-check) for: workload calculation, role permission logic, task status transitions, message serialization
- Example-based unit tests for all business logic
- Integration tests for key API endpoints
- `.env.example` files finalized
- README with setup instructions
- Final end-to-end smoke test

**Components**: All  
**Stories**: US-NOTIF-01, all polish items  
**Deliverables**: Production-ready application with full test coverage
