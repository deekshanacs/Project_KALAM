# TMS — Team Management System (Project KALAM)

A full-stack, AI-powered Team Management System built for streamlined organizational workflows. Features hierarchical team management, task tracking, real-time chat, AI document tools, and rich collaboration — all in a unified dark-themed workspace.

🌐 **Live Demo**: [project-kalam-frontend.vercel.app](https://project-kalam-frontend.vercel.app)

---

## Features

- **Team Management** — Org hierarchy with ADMIN / TEAM_LEADER / TEAM_MEMBER / JUNIOR_MEMBER roles, workload tracking, availability status
- **Task Management** — Create, assign, prioritize, and track tasks with comments and time logs
- **Real-time Chat** — Direct messages and group channels powered by Socket.io, with reactions, replies, and file attachments
- **AI Tools** — Document summarization (upload PDF/DOCX/TXT) and AI document generation, powered by Google Gemini 2.5 Flash with local NLP fallback
- **Document Editor** — Rich text editor (TipTap) with sharing, export to DOCX, and collaborative access control
- **Live Notifications** — Real-time in-app notifications for task assignments, messages, and document shares
- **Video Calling** — WebRTC peer-to-peer video calls via simple-peer
- **Dark/Light Theme** — Persistent theme toggle

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.4.5 | Type safety |
| Vite | 5.3.5 | Build tool & dev server |
| Tailwind CSS | 3.4.7 | Utility-first styling |
| Framer Motion | 11.3.8 | Animations |
| React Router DOM | 6.26.2 | Client-side routing |
| Socket.io Client | 4.7.5 | Real-time communication |
| Axios | 1.7.2 | HTTP client |
| TipTap | 2.4.0 | Rich text editor |
| Recharts | 2.12.7 | Charts and analytics |
| @dnd-kit | 6.1.0 | Drag and drop |
| Radix UI | various | Accessible UI primitives |
| Lucide React | 0.414.0 | Icons |
| simple-peer | 9.11.1 | WebRTC video calls |
| react-hot-toast | 2.4.1 | Toast notifications |
| DOMPurify | 3.1.6 | XSS sanitization |
| docx | 8.5.0 | DOCX export |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Express | 4.19.2 | Web framework |
| TypeScript | 5.4.5 | Type safety |
| Prisma | 5.17.0 | ORM + migrations |
| PostgreSQL | 15+ | Primary database |
| Socket.io | 4.7.5 | Real-time WebSocket server |
| jsonwebtoken | 9.0.2 | JWT auth (access 15min + refresh 7d) |
| bcrypt | 5.1.1 | Password hashing |
| Zod | 3.23.8 | Runtime validation |
| Winston | 3.14.2 | Structured logging |
| Helmet | 7.1.0 | HTTP security headers |
| express-rate-limit | 7.4.0 | Rate limiting |
| multer | 1.4.5 | File uploads |
| Google Generative AI | 0.21.0 | Gemini AI integration |
| mammoth | 1.8.0 | DOCX parsing |
| pdf-parse | 1.1.1 | PDF parsing |

### Shared
| Technology | Purpose |
|---|---|
| TypeScript | Shared types, enums, interfaces between frontend and backend |

### Testing
| Technology | Purpose |
|---|---|
| Jest + ts-jest | Backend unit and integration tests |
| Vitest | Frontend unit tests |
| fast-check | Property-based testing |
| supertest | API integration tests |
| @testing-library/react | React component tests |

### Infrastructure
| Service | Purpose |
|---|---|
| Railway | Backend hosting + managed PostgreSQL |
| Vercel | Frontend static hosting + CDN |
| GitHub | Source control + CI/CD triggers |

---

## Project Structure

```
Project_KALAM/
├── backend/                    # Node.js + Express API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   ├── seed.ts             # Seed data (10 users, tasks, messages, docs)
│   │   └── migrations/         # Prisma migration history
│   └── src/
│       ├── config/env.ts       # Zod-validated environment config
│       ├── controllers/        # Route handlers
│       ├── middleware/         # Auth, CORS, rate limit, upload, validation
│       ├── routes/             # Express routers
│       ├── schemas/            # Zod validation schemas
│       ├── services/           # Business logic (auth, tasks, AI, socket)
│       ├── lib/                # Prisma client, logger, error classes
│       ├── types/              # Express type augmentation
│       └── _shared/            # Copy of shared types (build artifact)
│
├── frontend/                   # React 18 + Vite SPA
│   └── src/
│       ├── api/                # Axios API clients per domain
│       ├── components/         # Reusable UI components
│       │   ├── ai/             # AI tools components
│       │   ├── auth/           # PrivateRoute
│       │   ├── common/         # Avatar, Skeleton, Badge, etc.
│       │   ├── documents/      # Doc editor, list, share modal
│       │   ├── layout/         # Sidebar, Topbar, Layout, Background
│       │   ├── tasks/          # Task card and modal
│       │   └── team/           # Profile drawer
│       ├── contexts/           # AuthContext, SocketContext, ThemeContext
│       ├── hooks/              # useAuth, useSocket, usePermissions, useNotifications
│       ├── pages/              # Team, Tasks, Chat, AITools, Documents, Login, Register
│       ├── utils/              # Formatters, animations, org tree, workload, permissions
│       └── config/runtime.ts   # Vite env var access
│
├── shared/                     # Shared TypeScript types
│   └── src/types/index.ts      # Enums, interfaces, DTOs used by both frontend and backend
│
├── railway.toml                # Railway build + deploy config
├── vercel.json                 # Vercel build config
├── build-frontend.sh           # Frontend build script for Vercel
├── package.json                # npm workspaces root
└── tsconfig.base.json          # Shared TypeScript base config
```

---

## Database Schema

| Model | Description |
|---|---|
| User | Team members with role, availability, supervisor hierarchy |
| Task | Tasks with status, priority, assignee, due date, attachments |
| Comment | Task comments with author |
| TimeLog | Time tracking entries per task |
| Message | Direct and group messages with reactions, replies, attachments |
| Group | Chat groups with members |
| GroupMember | Many-to-many user-group membership |
| Document | Rich text documents with sharing permissions |
| Project | Project containers for tasks |
| RefreshToken | JWT refresh token store with rotation |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT pair |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/users` | List all users |
| PATCH | `/api/users/:id/status` | Update availability status |
| PATCH | `/api/users/:id/supervisor` | Update org hierarchy |
| GET | `/api/tasks` | List tasks (scoped by role) |
| POST | `/api/tasks` | Create and assign task |
| PATCH | `/api/tasks/:id/status` | Update task status |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |
| POST | `/api/tasks/:id/time-logs` | Log time |
| GET | `/api/messages/direct/:userId` | Get DM history |
| POST | `/api/messages/direct` | Send DM |
| GET | `/api/messages/group/:groupId` | Get group messages |
| POST | `/api/messages/group` | Send group message |
| GET | `/api/groups` | List user's groups |
| POST | `/api/groups` | Create group |
| GET | `/api/documents` | List accessible documents |
| POST | `/api/documents` | Create document |
| PATCH | `/api/documents/:id` | Update document |
| POST | `/api/documents/:id/share` | Share document |
| POST | `/api/ai/summarize` | Summarize uploaded file |
| POST | `/api/ai/create-document` | Generate document (SSE stream) |
| POST | `/api/upload` | Upload file attachment |
| GET | `/health` | Health check |

---

## Local Development

### Prerequisites
- Node.js 20 LTS
- npm 10+
- PostgreSQL 15+ (local or [Neon](https://neon.tech) free tier)

### Setup

```bash
# 1. Clone
git clone https://github.com/deekshanacs/Project_KALAM.git
cd Project_KALAM

# 2. Install all dependencies
npm install

# 3. Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET

# 4. Configure frontend
cp frontend/.env.local.example frontend/.env.local
# Edit frontend/.env.local — set VITE_API_URL=http://localhost:4000

# 5. Run migrations
npm run db:deploy

# 6. Seed database
npm run seed
```

### Run

```bash
# Terminal 1 — Backend (http://localhost:4000)
npm run dev:backend

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev:frontend
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Min 32 chars — access token signing key |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars — refresh token signing key |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | — | Server port (default: `4000`) |
| `CORS_ORIGIN` | ✅ | Frontend URL (comma-separated for multiple) |
| `PUBLIC_URL` | ✅ | Backend public URL for file links |
| `UPLOAD_DIR` | — | Upload path (default: `./uploads`) |
| `GEMINI_API_KEY` | — | Google Gemini key — get free at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `ANTHROPIC_API_KEY` | — | Anthropic Claude key (optional) |

### Frontend (`frontend/.env.production`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend URL |
| `VITE_SOCKET_URL` | ✅ | Socket.io URL (same as API URL) |

---

## Seed Users

All seed users share the password: **`Password123!`**

| Email | Role | Can Do |
|---|---|---|
| `alice@tms.dev` | ADMIN | Everything — full system access |
| `bob@tms.dev` | TEAM_LEADER | Manage own subtree, assign tasks |
| `carol@tms.dev` | TEAM_LEADER | Manage own subtree, assign tasks |
| `dave@tms.dev` | TEAM_MEMBER | Assign to juniors, update own tasks |
| `eve@tms.dev` | TEAM_MEMBER | Assign to juniors, update own tasks |
| `frank@tms.dev` | TEAM_MEMBER | Assign to juniors, update own tasks |
| `grace@tms.dev` | JUNIOR_MEMBER | Update own tasks only |
| `henry@tms.dev` | JUNIOR_MEMBER | Update own tasks only |
| `iris@tms.dev` | JUNIOR_MEMBER | Update own tasks only |
| `jack@tms.dev` | JUNIOR_MEMBER | Update own tasks only |

---

## Deployment

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Add **PostgreSQL** plugin — `DATABASE_URL` is injected automatically
3. Set environment variables (see table above)
4. Railway uses `railway.toml` — build and start are configured automatically

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set environment variables: `VITE_API_URL` and `VITE_SOCKET_URL`
3. Vercel uses `vercel.json` and `build-frontend.sh` — no manual config needed

### After deploying both:
- Update `CORS_ORIGIN` on Railway to your Vercel URL
- Update `PUBLIC_URL` on Railway to your Railway URL

---

## Tests

```bash
# Run all tests
npm run test --workspaces

# Backend tests only
npm run test --workspace=backend

# Frontend tests only
npm run test --workspace=frontend

# Coverage
npm run test:coverage --workspace=backend
```

---

## Security

- JWT access tokens expire in **15 minutes**, refresh tokens in **7 days** with rotation
- Passwords hashed with **bcrypt** (cost factor 12)
- All inputs validated with **Zod** schemas
- HTTP headers secured with **Helmet**
- Rate limiting: 10 req/15min on auth routes, 100 req/min globally
- CORS restricted to configured origins only
- File uploads restricted to allowed MIME types, max 10MB

---

## License

MIT
