# Deployment Guide — Railway (Backend) + Vercel (Frontend)

## Overview

| Service | Platform | URL pattern |
|---|---|---|
| Backend (Express + Socket.io) | Railway | `https://your-app.up.railway.app` |
| PostgreSQL | Railway (plugin) | Auto-injected as `DATABASE_URL` |
| Frontend (React + Vite) | Vercel | `https://your-app.vercel.app` |

---

## Step 1 — Push code to GitHub

Make sure your code is on GitHub (Railway and Vercel both deploy from GitHub).

```bash
git add .
git commit -m "chore: configure Railway + Vercel deployment"
git push origin main
```

---

## Step 2 — Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select your repo
3. Railway auto-detects the `railway.toml` at the root

### Add PostgreSQL

4. In your Railway project → click **+ New** → **Database** → **Add PostgreSQL**
5. Railway automatically injects `DATABASE_URL` into your service — no manual setup needed

### Set Environment Variables

6. Click your backend service → **Variables** tab → add these:

```
NODE_ENV=production
JWT_SECRET=<generate: node -e "require('crypto').randomBytes(32).toString('hex')">
JWT_REFRESH_SECRET=<generate: node -e "require('crypto').randomBytes(32).toString('hex')">
CORS_ORIGIN=https://your-app.vercel.app        ← fill in after Vercel deploy
PUBLIC_URL=https://your-app.up.railway.app     ← your Railway URL
UPLOAD_DIR=./uploads
GEMINI_API_KEY=<your Gemini API key, optional>
ANTHROPIC_API_KEY=<your Anthropic key, optional>
```

> **Note**: `DATABASE_URL` is injected automatically by the PostgreSQL plugin — do NOT set it manually.

7. Click **Deploy** — Railway runs:
   - `npm install`
   - `prisma generate`
   - `npm run build --workspace=shared`
   - `npm run build --workspace=backend`
   - On start: `prisma migrate deploy && node dist/index.js`

8. Once deployed, copy your Railway URL (e.g. `https://tms-backend.up.railway.app`)

### Verify backend is live

```
GET https://your-app.up.railway.app/health
→ { "status": "ok", "timestamp": "..." }
```

---

## Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Vercel auto-detects the `vercel.json` at the root

### Set Environment Variables

3. In Vercel project settings → **Environment Variables** → add:

```
VITE_API_URL=https://your-app.up.railway.app
VITE_SOCKET_URL=https://your-app.up.railway.app
```

4. Click **Deploy**

5. Once deployed, copy your Vercel URL (e.g. `https://tms.vercel.app`)

---

## Step 4 — Update CORS on Railway

Go back to Railway → your backend service → **Variables** → update:

```
CORS_ORIGIN=https://tms.vercel.app
```

Railway will auto-redeploy with the new value.

---

## Step 5 — Verify the full stack

1. Open your Vercel URL in the browser
2. Register a new account
3. Log in — you should see the dashboard
4. Check real-time features (chat, status updates) work via Socket.io

---

## Local Development

```bash
# Terminal 1 — backend
npm run dev:backend

# Terminal 2 — frontend
npm run dev:frontend
```

Backend runs on `http://localhost:4000`  
Frontend runs on `http://localhost:5173`

The `frontend/.env` is already set to `http://localhost:4000` for local dev.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| CORS errors in browser | Update `CORS_ORIGIN` on Railway to match your exact Vercel URL |
| Socket.io not connecting | Make sure `VITE_SOCKET_URL` matches your Railway URL exactly (no trailing slash) |
| Database migration fails | Check `DATABASE_URL` is set (Railway injects it automatically) |
| Build fails on Railway | Check Railway build logs — usually a missing env var |
| `prisma generate` fails | Ensure `prisma` is in `dependencies` (not just `devDependencies`) in `backend/package.json` |
