# Deployment Architecture — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction  
**Deployment Target**: Vercel (static SPA)

---

## 1. Vercel Deployment

### 1.1 Overview

The frontend is deployed as a static Single Page Application (SPA) to Vercel. Vercel serves the compiled `dist/` directory from its global CDN.

```
Git Push to main
  → Vercel detects change
  → Runs build command: npm run build
  → Uploads dist/ to Vercel CDN
  → Deploys to production URL
  → Previous deployment remains available for rollback
```

### 1.2 Vercel Project Configuration

**Method 1: vercel.json** (committed to repository):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Method 2: Vercel Dashboard Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Root Directory: `frontend` (if deploying from monorepo root)

### 1.3 SPA Routing (Rewrites Rule)

React Router handles client-side routing. All routes (e.g., `/dashboard`, `/team`, `/tasks`) are handled by the React app, not the server.

**Problem**: When a user navigates directly to `https://app.example.com/dashboard`, Vercel looks for a file at `dist/dashboard/index.html` — which doesn't exist.

**Solution**: The `vercel.json` rewrites rule redirects all non-file requests to `/index.html`, letting React Router handle the route.

```json
{
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

This regex matches all paths EXCEPT those starting with `/api/` (which would be proxied to the backend in a full-stack Vercel setup, but in our architecture the backend is on Railway/Render).

### 1.4 Auto-Deploy from Git

1. Connect Vercel project to GitHub repository.
2. Set root directory to `frontend/` (monorepo).
3. Vercel auto-deploys on every push to `main` branch.
4. Pull request previews: Vercel creates a preview deployment for every PR.

---

## 2. Environment Variables in Vercel

### 2.1 Setting Variables

In the Vercel dashboard: Project → Settings → Environment Variables.

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.railway.app` | Production |
| `VITE_SOCKET_URL` | `https://your-backend.railway.app` | Production |
| `VITE_API_URL` | `https://your-backend-staging.railway.app` | Preview |
| `VITE_SOCKET_URL` | `https://your-backend-staging.railway.app` | Preview |

### 2.2 Build-Time Embedding

`VITE_` prefixed variables are embedded into the JavaScript bundle at build time by Vite. They are NOT runtime environment variables — they are baked into the static files.

**Implication**: Changing `VITE_API_URL` in Vercel requires a new deployment (rebuild) to take effect.

### 2.3 Security Reminder

Only public URLs should be in `VITE_` variables. Never put API keys, JWT secrets, or database credentials in frontend environment variables.

---

## 3. CORS Configuration

### 3.1 Backend CORS Setup

The backend must allow requests from the Vercel frontend domain.

```typescript
// backend/src/server.ts
app.use(cors({
  origin: process.env.CORS_ORIGIN, // e.g., 'https://tms-app.vercel.app'
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

```bash
# backend/.env (production)
CORS_ORIGIN=https://tms-app.vercel.app
```

### 3.2 Socket.io CORS

```typescript
// backend/src/server.ts
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

### 3.3 Multiple Origins (Development + Production)

```typescript
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') ?? [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

```bash
# backend/.env (supports multiple origins)
CORS_ORIGIN=https://tms-app.vercel.app,https://tms-app-preview.vercel.app
```

---

## 4. CDN and Caching Strategy

### 4.1 Static Asset Caching

Vite generates content-hashed filenames for all assets (e.g., `index-a1b2c3d4.js`). These can be cached indefinitely.

```json
{
  "source": "/assets/(.*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }
  ]
}
```

### 4.2 HTML Caching

`index.html` should NOT be cached (or cached briefly) so users always get the latest version.

```json
{
  "source": "/index.html",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=0, must-revalidate"
    }
  ]
}
```

---

## 5. Deployment Checklist

Before deploying to production:

- [ ] `VITE_API_URL` set to production backend URL in Vercel dashboard
- [ ] `VITE_SOCKET_URL` set to production backend URL in Vercel dashboard
- [ ] Backend `CORS_ORIGIN` includes Vercel production domain
- [ ] `vercel.json` rewrites rule present for SPA routing
- [ ] Build succeeds locally: `npm run build`
- [ ] TypeScript type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm run test`
- [ ] No `VITE_` variables contain secrets

---

## 6. Rollback Strategy

Vercel maintains deployment history. To rollback:
1. Go to Vercel dashboard → Deployments.
2. Find the last known-good deployment.
3. Click "Promote to Production".

This is instant — no rebuild required.

---

## 7. Preview Deployments

Every pull request gets a unique preview URL from Vercel (e.g., `https://tms-app-git-feature-branch.vercel.app`). This allows testing frontend changes against the staging backend before merging.

**Preview environment variables**: Set `VITE_API_URL` to the staging backend URL for Preview environment in Vercel dashboard.
