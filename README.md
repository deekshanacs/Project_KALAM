# TMS — Team Management System

A professional, full-stack Team Management System with hierarchical teams, task management, real-time chat, AI document tools, and rich collaboration features.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.io |
| Auth | JWT (access 15min + refresh 7d rotation) + bcrypt |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Charts | Recharts |
| Rich Text | TipTap |
| Testing | Vitest (frontend) + Jest (backend) + fast-check (PBT) |

---

## Prerequisites

- **Node.js** 20 LTS — [nodejs.org](https://nodejs.org)
- **npm** 10+ (included with Node 20)
- **PostgreSQL** 16+ — [postgresql.org](https://www.postgresql.org/download/) or via Docker

---

## Installation

```bash
git clone <repository-url>
cd tms
npm install
```

This installs all dependencies for all three workspaces (`backend`, `frontend`, `shared`) via npm workspaces.

---

## Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env — set VITE_API_URL and VITE_SOCKET_URL
```

### Required Environment Variables

**Backend (`backend/.env`)**:
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://postgres:password@localhost:5432/tms_dev` |
| `JWT_SECRET` | Random 32+ char string for access token signing |
| `JWT_REFRESH_SECRET` | Different random 32+ char string for refresh token signing |
| `ANTHROPIC_API_KEY` | Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| `PORT` | Server port (default: 4000) |
| `CORS_ORIGIN` | Frontend URL (default: `http://localhost:5173`) |
| `UPLOAD_DIR` | Local uploads path (default: `./uploads`) |

**Frontend (`frontend/.env`)**:
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (default: `http://localhost:4000`) |
| `VITE_SOCKET_URL` | Socket.io URL (same as API URL) |

---

## Database Setup

```bash
# Option 1: Docker
docker run -d --name tms-postgres \
  -e POSTGRES_DB=tms_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16

# Option 2: Local PostgreSQL
createdb tms_dev

# Run migrations
npm run db:migrate

# Seed development data
npm run seed
```

---

## Development

```bash
# Terminal 1: Backend (port 4000)
npm run dev:backend

# Terminal 2: Frontend (port 5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173)

---

## Seed Users

All seed users share the password: **`Password123!`**

| Email | Name | Role |
|---|---|---|
| alice@tms.dev | Alice Admin | ADMIN |
| bob@tms.dev | Bob Leader | TEAM_LEADER |
| carol@tms.dev | Carol Leader | TEAM_LEADER |
| dave@tms.dev | Dave Member | TEAM_MEMBER |
| eve@tms.dev | Eve Member | TEAM_MEMBER |
| frank@tms.dev | Frank Member | TEAM_MEMBER |
| grace@tms.dev | Grace Junior | JUNIOR_MEMBER |
| henry@tms.dev | Henry Junior | JUNIOR_MEMBER |
| iris@tms.dev | Iris Junior | JUNIOR_MEMBER |
| jack@tms.dev | Jack Junior | JUNIOR_MEMBER |

---

## Build

```bash
npm run build --workspaces
```

Output:
- `backend/dist/` — compiled Node.js server
- `frontend/dist/` — Vite production bundle

---

## Tests

```bash
# All tests
npm run test --workspaces

# Backend only
npm run test --workspace=backend

# Frontend only
npm run test --workspace=frontend

# With coverage
npm run test:coverage --workspace=backend
npm run test:coverage --workspace=frontend
```

Tests include:
- **Unit tests**: Jest (backend) + Vitest (frontend)
- **Property-based tests**: fast-check for business logic invariants
- **Integration tests**: supertest for API endpoint flows

---

## AI Integration

Both AI features use **Google Gemini 2.5 Flash**:
- **Document Summarizer** — upload PDF/DOCX/TXT → Gemini analyzes and returns summary, key points, and analysis
- **Document Creator** — describe what you need → Gemini generates a full structured document, streamed progressively

Set `GEMINI_API_KEY` in your backend environment variables. Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

If no key is set, both features fall back to the built-in local NLP engine.

---

## Deployment

### Frontend → Vercel
1. Connect repository to Vercel
2. Set build command: `npm run build --workspace=frontend`
3. Set output directory: `frontend/dist`
4. Add environment variables: `VITE_API_URL`, `VITE_SOCKET_URL`

### Backend → Railway or Render
1. Connect repository
2. Set start command: `npm run build --workspace=backend && npx prisma migrate deploy && node backend/dist/index.js`
3. Add PostgreSQL add-on
4. Set all backend environment variables

---

## Project Structure

```
tms/
├── backend/          # Node.js + Express + TypeScript API
│   ├── prisma/       # Schema + seed
│   └── src/          # Routes, controllers, services, middleware
├── frontend/         # React 18 + Vite + TypeScript SPA
│   └── src/          # Pages, components, hooks, contexts, API
├── shared/           # Shared TypeScript interfaces and enums
│   └── src/types/    # Single barrel export
├── aidlc-docs/       # AI-DLC documentation (design artifacts)
├── package.json      # npm workspaces root
└── README.md
```
