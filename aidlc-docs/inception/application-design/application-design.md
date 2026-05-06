# Application Design — TMS (Project KALAM)

This document consolidates all application design artifacts.

---

## 1. System Overview

TMS is a full-stack monorepo with three packages:
- **`/frontend`** — React 18 + TypeScript + Vite SPA
- **`/backend`** — Node.js + Express + TypeScript REST API + Socket.io server
- **`/shared`** — Shared TypeScript interfaces and enums

The backend connects to a PostgreSQL database via Prisma ORM. Real-time features use Socket.io. AI features use the Anthropic Claude API. File uploads are stored locally in `/uploads`.

---

## 2. Components

See [components.md](./components.md) for full component definitions.

### Backend Components Summary
| ID | Name | Primary Responsibility |
|---|---|---|
| BC-01 | AuthComponent | Registration, login, JWT token management |
| BC-02 | UserComponent | User profiles, hierarchy, availability, workload |
| BC-03 | TaskComponent | Task CRUD, role-based assignment, comments, time logs |
| BC-04 | ChatComponent | DMs, group messages, read receipts, edit/delete |
| BC-05 | AIComponent | Claude API integration (summarize + create + stream) |
| BC-06 | DocumentComponent | Rich-text documents, sharing, permissions |
| BC-07 | FileComponent | Multer file upload, local storage, URL return |
| BC-08 | NotificationComponent | In-memory real-time notifications via Socket.io |
| BC-09 | SocketComponent | Socket.io server, rooms, event broadcasting |

### Frontend Components Summary
| ID | Name | Primary Responsibility |
|---|---|---|
| FC-01 | AuthModule | Login/register pages, AuthContext, useAuth hook |
| FC-02 | LayoutModule | Sidebar, Topbar, PageWrapper |
| FC-03 | OrgChartModule | DnD org tree, ProfileCard, ProfileDrawer |
| FC-04 | TaskModule | Kanban board, TaskCard, TaskModal, FilterBar |
| FC-05 | ChatModule | DMs, groups, composer, WebRTC calls |
| FC-06 | AIToolsModule | File summarizer, document creator, DOCX export |
| FC-07 | DocumentsModule | TipTap editor, document list, ShareModal |
| FC-08 | DashboardModule | Recharts analytics dashboard |
| FC-09 | CommonComponents | Avatar, StatusBadge, WorkloadBar, Skeleton, Toast |

### Shared
| ID | Name | Primary Responsibility |
|---|---|---|
| SC-01 | SharedTypes | TypeScript interfaces and enums for User, Task, Message, etc. |

---

## 3. Services

See [services.md](./services.md) for full service definitions.

| ID | Name | Orchestrates |
|---|---|---|
| SVC-01 | AuthService | BC-01, BC-09 |
| SVC-02 | UserService | BC-02, BC-08, BC-09 |
| SVC-03 | TaskService | BC-03, BC-02, BC-08, BC-09 |
| SVC-04 | ChatService | BC-04, BC-07, BC-08, BC-09 |
| SVC-05 | AIService | BC-05, BC-07 |
| SVC-06 | DocumentService | BC-06, BC-08 |
| SVC-07 | WorkloadService | BC-02, BC-03 |
| SVC-X1 | LoggerService | Cross-cutting: structured logging |
| SVC-X2 | ValidationService | Cross-cutting: Zod input validation |
| SVC-X3 | RateLimitService | Cross-cutting: rate limiting |
| SVC-X4 | ErrorHandlerService | Cross-cutting: global error handling |

---

## 4. Component Dependencies

See [component-dependency.md](./component-dependency.md) for full dependency map and data flow diagrams.

---

## 5. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo structure | `/frontend` + `/backend` + `/shared` | Shared types, single repo |
| ORM | Prisma | Type-safe, excellent TypeScript support |
| Real-time | Socket.io | Mature, reliable, room-based routing |
| Auth | JWT (access + refresh) | Stateless, horizontally scalable |
| Rich text | TipTap | Headless, React-native, JSON storage |
| AI streaming | Anthropic SDK streaming | Progressive UX for document creation |
| File storage | Local `/uploads` | Simple, no cloud credentials needed |
| Validation | Zod | TypeScript-first, composable schemas |
| Logging | Winston/Pino | Structured JSON, Vercel-compatible |
| Rate limiting | express-rate-limit | Simple, Express-native |
| PBT framework | fast-check | TypeScript-native, Jest/Vitest integration |
| DOCX export | `docx` npm package | Real DOCX with proper formatting |
| Video/Audio | WebRTC (simple-peer) | Peer-to-peer, no server relay needed |

---

## 6. Security Architecture

- **Authentication**: JWT access (15min) + refresh (7d) with rotation; bcrypt (cost ≥ 12)
- **Authorization**: Role middleware on every protected route; object-level auth checks
- **Input validation**: Zod schemas on all request bodies/params/query
- **Rate limiting**: express-rate-limit on auth routes + global API limit
- **HTTP headers**: helmet.js for CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **CORS**: Restricted to explicit origins (VITE_API_URL)
- **Error handling**: Global error handler returns generic messages; no stack traces to client
- **Logging**: Structured JSON; no PII or tokens in logs
- **Secrets**: All in `.env` files (gitignored); `.env.example` provided

---

## 7. Folder Structure

```
/tms
├── /frontend                    # Vite + React + TS
│   ├── /src
│   │   ├── /components
│   │   │   ├── /layout          # Sidebar, Topbar, PageWrapper
│   │   │   ├── /team            # OrgChart, ProfileCard, ProfileDrawer, WorkloadBar
│   │   │   ├── /tasks           # KanbanBoard, TaskCard, TaskModal, FilterBar
│   │   │   ├── /chat            # ChatWindow, MessageBubble, GroupModal, FilePreview
│   │   │   ├── /ai              # FileUploader, SummaryCard, DocCreator, SetupQuestions
│   │   │   ├── /documents       # DocList, DocViewer, ShareModal
│   │   │   └── /common          # Avatar, StatusBadge, RoleBadge, Button, Modal
│   │   ├── /pages               # Dashboard, Team, Tasks, Chat, AITools, Documents
│   │   ├── /hooks               # useAuth, useSocket, useWorkload, usePermissions
│   │   ├── /context             # AuthContext, SocketContext
│   │   ├── /api                 # axios client + all API call functions
│   │   ├── /types               # TypeScript interfaces (imports from /shared)
│   │   └── /utils               # rolePermissions.ts, workloadCalc.ts, formatters.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env.example
│
├── /backend                     # Node + Express + TS
│   ├── /src
│   │   ├── /routes              # auth, users, tasks, messages, groups, documents, ai, upload
│   │   ├── /controllers         # one per route file
│   │   ├── /middleware          # authMiddleware, roleGuard, upload, rateLimiter, errorHandler
│   │   ├── /services            # aiService, socketService, fileService, workloadService, etc.
│   │   ├── /prisma              # schema.prisma, seed.ts
│   │   └── /types               # backend-specific DTOs
│   ├── server.ts
│   ├── tsconfig.json
│   └── .env.example
│
└── /shared
    └── /types
        └── index.ts             # Shared interfaces and enums
```
