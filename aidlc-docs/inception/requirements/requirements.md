# Requirements Document — TMS (Team Management System)
## Project KALAM

---

## Intent Analysis Summary

| Field | Value |
|---|---|
| **Request Type** | New Project (Greenfield) |
| **Scope** | System-wide — full-stack monorepo |
| **Complexity** | Complex |
| **Project Type** | Professional web application |
| **Primary Users** | Admin, Team Leader, Team Member, Junior Team Member |

---

## 1. Functional Requirements

### 1.1 Authentication & User Management

- **FR-AUTH-01**: Users can self-register with name, email, and password; accounts are active immediately (no email verification).
- **FR-AUTH-02**: JWT authentication uses short-lived access tokens (15 min) + long-lived refresh tokens (7 days) with rotation.
- **FR-AUTH-03**: Admin assigns roles (ADMIN | TEAM_LEADER | TEAM_MEMBER | JUNIOR_MEMBER) to registered users.
- **FR-AUTH-04**: Users can update their own availability status (AVAILABLE | IN_CALL | AWAY | OFFLINE).
- **FR-AUTH-05**: Each user has a `supervisorId` self-relation defining the org hierarchy.
- **FR-AUTH-06**: Passwords hashed with bcrypt (adaptive algorithm).
- **FR-AUTH-07**: Login endpoint has brute-force protection (progressive delay / lockout after repeated failures).
- **FR-AUTH-08**: Sessions invalidated on logout; refresh tokens revoked server-side.

### 1.2 Role-Based Hierarchy & Permissions

- **FR-ROLE-01**: Four roles in strict hierarchy: ADMIN > TEAM_LEADER > TEAM_MEMBER > JUNIOR_MEMBER.
- **FR-ROLE-02**: Admin can assign tasks to ANY user.
- **FR-ROLE-03**: Team Leader can assign tasks to their direct Team Members and those TMs' Junior Members.
- **FR-ROLE-04**: Team Member can assign tasks only to their direct Junior Members.
- **FR-ROLE-05**: Junior Member cannot assign tasks.
- **FR-ROLE-06**: Role permissions enforced both on frontend (UI guards) and backend (middleware).
- **FR-ROLE-07**: Admin can drag/drop any user in the org chart to restructure the entire hierarchy (no role-rule validation on drag — Admin is trusted).
- **FR-ROLE-08**: Team Leader can drag/drop TMs and JTMs within their own subtree.

### 1.3 Org Chart / Team Hierarchy

- **FR-ORG-01**: Interactive drag-and-drop org tree rendered visually using @dnd-kit.
- **FR-ORG-02**: Each org node displays: avatar (with colored availability ring), name, role badge, current project, mini workload bar.
- **FR-ORG-03**: Clicking a node opens a Profile Drawer (slide-in panel) with: full profile, availability status dropdown, current project, workload meter, work progress (tasks done/total), [Assign Task] button (role-gated), [Chat] button, recent task list.
- **FR-ORG-04**: When a node is dragged, all its descendants move with it (subtree drag).
- **FR-ORG-05**: Availability status updates broadcast in real-time via Socket.io.

### 1.4 Task Management

- **FR-TASK-01**: Kanban board with four columns: TODO | IN_PROGRESS | REVIEW | DONE.
- **FR-TASK-02**: Task cards show: title, priority badge (color-coded), due date, assignee avatar, attachment count, comment count.
- **FR-TASK-03**: Cards can be dragged between columns (status update).
- **FR-TASK-04**: Filter tasks by: assignee, priority, project, date.
- **FR-TASK-05**: Create task modal: title, description, priority, due date, file attachments, user assignment (role-gated).
- **FR-TASK-06**: Tasks support comment/discussion threads (each task has a comment thread).
- **FR-TASK-07**: Tasks support time tracking — users can log hours spent against a task.
- **FR-TASK-08**: Task priority levels: LOW | MEDIUM | HIGH | URGENT.
- **FR-TASK-09**: Task status changes trigger workload recalculation and Socket.io events.
- **FR-TASK-10**: File attachments stored as JSON array of URLs; files uploaded via `/api/upload`.

### 1.5 Real-Time Chat

- **FR-CHAT-01**: Direct messages between any two users.
- **FR-CHAT-02**: Group chat: create group with name + selected members; group messages visible to all members.
- **FR-CHAT-03**: Message composer supports: basic rich text (bold, italic, link), file attachments (image, doc), emoji picker, link preview cards.
- **FR-CHAT-04**: Messages support editing and deletion by the sender.
- **FR-CHAT-05**: Read receipts shown per message (who has read it).
- **FR-CHAT-06**: Unread badge counts on DM list and group list.
- **FR-CHAT-07**: Real-time delivery via Socket.io.
- **FR-CHAT-08**: Message types: TEXT | FILE | IMAGE | LINK.
- **FR-CHAT-09**: Basic video/audio call capability (WebRTC-based, peer-to-peer).

### 1.6 AI Tools

- **FR-AI-01 (Summarizer)**: Upload area (drag & drop or click) accepting PDF, DOCX, TXT, images (PNG, JPG), CSV, XLSX, PPTX.
- **FR-AI-02 (Summarizer)**: File sent to Claude API for: summary, key points extraction, detailed analysis. Response displayed in formatted card.
- **FR-AI-03 (Creator)**: Text area to describe desired document; AI asks 10 setup questions with option buttons (type, tone, font, font size, page size, TOC, sections, color theme, header/footer, output format).
- **FR-AI-04 (Creator)**: Claude generates full document content; response streamed progressively (tokens appear as generated).
- **FR-AI-05 (Creator)**: Document rendered styled in a preview pane.
- **FR-AI-06 (Creator)**: Download as DOCX using the `docx` npm package (real DOCX generation with proper formatting and styles).
- **FR-AI-07**: Claude model: `claude-sonnet-4-20250514`.

### 1.7 Documents

- **FR-DOC-01**: List of documents created by or shared with the current user.
- **FR-DOC-02**: Create / Open / Edit documents using TipTap rich text editor.
- **FR-DOC-03**: Single-user editing (no real-time collaborative editing).
- **FR-DOC-04**: Share options: copy share link, share with individual user (search & select), share with group.
- **FR-DOC-05**: Share permissions: view-only vs edit.
- **FR-DOC-06**: Document metadata: title, content (rich text JSON), font, fontSize, theme, pageSize, sharedWith.

### 1.8 Dashboard & Analytics

- **FR-DASH-01**: Dashboard shows analytics/charts using Recharts: tasks by status, workload distribution.
- **FR-DASH-02**: Top bar: current user avatar + status badge + notification bell + search.
- **FR-DASH-03**: Left sidebar: navigation icons (Dashboard, Team, Tasks, Chat, AI Tools, Documents); collapses to icons on small screens.

### 1.9 Workload Meter

- **FR-WORK-01**: Workload = (open tasks count / max capacity) × 100.
- **FR-WORK-02**: Max capacity per role: ADMIN=20, TEAM_LEADER=15, TEAM_MEMBER=10, JUNIOR_MEMBER=7.
- **FR-WORK-03**: Color coding: green (0–40%), amber (41–70%), red (71–100%).
- **FR-WORK-04**: Shown as slim horizontal progress bar on profile cards and in profile drawer.
- **FR-WORK-05**: Recalculated on every task status change event.

### 1.10 Notifications

- **FR-NOTIF-01**: In-app bell icon with badge count.
- **FR-NOTIF-02**: Notification triggers: task assigned, task completed, message received, document shared.
- **FR-NOTIF-03**: Real-time delivery via Socket.io.
- **FR-NOTIF-04**: In-memory only — notifications do not persist in the database (disappear on page refresh).

### 1.11 File Upload

- **FR-FILE-01**: File uploads stored in local filesystem (`/uploads` folder).
- **FR-FILE-02**: Upload endpoint returns a public URL stored in DB as a string.
- **FR-FILE-03**: Multer used for multipart handling.

---

## 2. Non-Functional Requirements

### 2.1 Performance
- **NFR-PERF-01**: API response time < 300ms for standard CRUD operations under normal load.
- **NFR-PERF-02**: Socket.io events delivered < 100ms under normal load.
- **NFR-PERF-03**: Claude API streaming begins rendering within 2s of request submission.
- **NFR-PERF-04**: Kanban board renders up to 200 tasks without perceptible lag.

### 2.2 Security
- **NFR-SEC-01**: JWT access tokens expire in 15 minutes; refresh tokens expire in 7 days with rotation.
- **NFR-SEC-02**: All passwords hashed with bcrypt (cost factor ≥ 12).
- **NFR-SEC-03**: Role permissions enforced server-side on every request (never trust client).
- **NFR-SEC-04**: HTTP security headers set on all responses (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- **NFR-SEC-05**: Input validation on all API endpoints using a schema validation library (Zod).
- **NFR-SEC-06**: Parameterized queries via Prisma ORM (no raw SQL string concatenation).
- **NFR-SEC-07**: CORS restricted to explicitly allowed origins.
- **NFR-SEC-08**: Rate limiting on public-facing endpoints (auth routes especially).
- **NFR-SEC-09**: No secrets or credentials in source code; use `.env` files (gitignored).
- **NFR-SEC-10**: Structured logging with no PII or tokens in log output.
- **NFR-SEC-11**: Global error handler returns generic messages to clients (no stack traces).
- **NFR-SEC-12**: Brute-force protection on login endpoint.

### 2.3 Scalability
- **NFR-SCALE-01**: Stateless backend (JWT-based) — horizontally scalable.
- **NFR-SCALE-02**: Socket.io configured for potential multi-instance use (Redis adapter ready).

### 2.4 Usability & Accessibility
- **NFR-UX-01**: Responsive layout — sidebar collapses to icons on small screens.
- **NFR-UX-02**: Skeleton loaders for all async content.
- **NFR-UX-03**: Toast notifications for user feedback (react-hot-toast or shadcn Toaster).
- **NFR-UX-04**: Smooth Framer Motion transitions (page enter, drawer slide, card hover).
- **NFR-UX-05**: Dark/light mode support.
- **NFR-UX-06**: WCAG 2.1 AA compliance target (keyboard navigation, ARIA labels, color contrast).

### 2.5 Maintainability
- **NFR-MAINT-01**: Strict TypeScript throughout — no `any` types.
- **NFR-MAINT-02**: Shared TypeScript interfaces in `/shared/types`.
- **NFR-MAINT-03**: All API calls through a typed axios client.
- **NFR-MAINT-04**: Monorepo structure: `/frontend`, `/backend`, `/shared`.

### 2.6 Testability
- **NFR-TEST-01**: Property-based testing with `fast-check` (TypeScript/JavaScript) for business logic, data transformations, and serialization.
- **NFR-TEST-02**: Example-based unit tests with Vitest (frontend) and Jest (backend).
- **NFR-TEST-03**: Integration tests for API endpoints.
- **NFR-TEST-04**: PBT seeds logged on failure for reproducibility; CI includes PBT runs.

### 2.7 Deployment
- **NFR-DEPLOY-01**: Deployment target: Vercel (frontend) + Vercel Serverless Functions or Railway/Render for backend.
- **NFR-DEPLOY-02**: `.env.example` files provided for both frontend and backend.
- **NFR-DEPLOY-03**: Seed script for development data.

---

## 3. Technical Decisions (from Answers)

| Decision | Choice | Rationale |
|---|---|---|
| Deployment | Vercel (frontend) + backend hosting TBD | User specified Vercel |
| File Storage | Local filesystem `/uploads` | Simpler, no cloud credentials needed |
| JWT Strategy | Access (15min) + Refresh (7d) with rotation | Secure, industry standard |
| Email Verification | None | Accounts active immediately |
| User Registration | Self-register, Admin assigns roles | Open registration |
| Message Edit/Delete | Yes | Users can edit/delete own messages |
| Read Receipts | Yes | Per-message read receipts |
| Video/Audio Calls | Yes (WebRTC) | Basic peer-to-peer calls |
| AI Streaming | Yes | Progressive token rendering |
| AI File Types | PDF, DOCX, TXT, PNG, JPG, CSV, XLSX, PPTX | Full format support |
| DOCX Export | `docx` npm package | Real DOCX with proper formatting |
| Task Comments | Yes | Per-task comment threads |
| Time Tracking | Yes | Log hours against tasks |
| Dashboard Charts | Yes (Recharts) | Analytics included |
| Collaborative Editing | No | Single-user editing only |
| Rich Text Editor | TipTap | Headless, React-friendly |
| Org Chart Validation | No (Admin trusted) | Free restructuring |
| Notifications Persistence | No | In-memory only |
| Security Extension | Enabled (full enforcement) | Production-grade |
| PBT Extension | Enabled (full enforcement) | Full property-based testing |

---

## 4. Extension Configuration

| Extension | Enabled | Enforcement Mode |
|---|---|---|
| Security Baseline | Yes | Full (all 15 rules, blocking) |
| Property-Based Testing | Yes | Full (all 10 rules, blocking) |

---

## 5. Seed Data Requirements

- 1 Admin user
- 2 Team Leaders (under Admin)
- 3 Team Members (distributed under TLs)
- 4 Junior Members (distributed under TMs)
- Sample tasks in various statuses
- Sample messages (DM + group)
- Sample documents

---

## 6. Environment Variables

### Backend
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ANTHROPIC_API_KEY=...
PORT=4000
UPLOAD_DIR=./uploads
CORS_ORIGIN=http://localhost:5173
```

### Frontend
```
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```
