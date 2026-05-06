# Deployment Architecture — Unit 8: Polish, Testing & Finalization
## TMS (Project KALAM)

---

## Production Deployment Flow
1. Developer pushes to `main` branch
2. GitHub Actions CI runs: lint → type-check → tests → build
3. On success: Vercel auto-deploys frontend from `frontend/dist`
4. On success: Railway/Render auto-deploys backend, runs `npx prisma migrate deploy` on startup

## Vercel (Frontend)
- Build command: `npm run build --workspace=frontend`
- Output directory: `frontend/dist`
- `vercel.json` rewrites: all routes → `/index.html` (SPA routing)
- Environment variables: `VITE_API_URL`, `VITE_SOCKET_URL` set in Vercel dashboard

## Railway/Render (Backend)
- Start command: `npm run build --workspace=backend && npx prisma migrate deploy && node backend/dist/index.js`
- Environment variables set in Railway/Render dashboard (never in source code)
- PostgreSQL: managed add-on (Railway PostgreSQL or Render PostgreSQL)
- Persistent volume for `/uploads` (Railway volume or Render disk)

## Environment Variables Summary

### Backend (Railway/Render)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (different from JWT_SECRET) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `PORT` | Server port (Railway/Render sets automatically) |
| `UPLOAD_DIR` | Path to uploads directory |
| `CORS_ORIGIN` | Frontend URL (e.g., https://tms.vercel.app) |
| `NODE_ENV` | `production` |

### Frontend (Vercel)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (e.g., https://tms-api.railway.app) |
| `VITE_SOCKET_URL` | Socket.io URL (same as VITE_API_URL) |
