# Deployment Architecture — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction  
**Deployment Target**: Vercel (static SPA) — same as Unit 5

---

## 1. Deployment Overview

Unit 6 introduces no new infrastructure requirements. The deployment architecture is identical to Unit 5:

- **Frontend**: Vercel static SPA deployment
- **Build command**: `npm run build` (same as Unit 5)
- **Output directory**: `dist/` (same as Unit 5)
- **SPA routing**: `vercel.json` rewrites rule (same as Unit 5)
- **Environment variables**: `VITE_API_URL`, `VITE_SOCKET_URL` (same as Unit 5)

See Unit 5 `deployment-architecture.md` for full deployment configuration details.

---

## 2. No Additional Infrastructure

### 2.1 @dnd-kit
- Client-side only library.
- No server-side components.
- No additional environment variables.
- No CDN or external service dependencies.

### 2.2 Real-Time (Socket.io)
- Socket.io client already configured in Unit 5.
- Unit 6 only adds new event subscriptions — no new socket infrastructure.

### 2.3 File Uploads
- Upload endpoint (`POST /api/upload`) is part of the backend (Unit 4).
- Files stored on the backend server's filesystem.
- No frontend infrastructure changes needed.

---

## 3. Build Size Impact

Unit 6 adds the following to the frontend bundle:

| Addition | Estimated Size (gzipped) |
|---|---|
| @dnd-kit/core | ~15KB |
| @dnd-kit/sortable | ~8KB |
| @dnd-kit/utilities | ~2KB |
| @dnd-kit/accessibility | ~3KB |
| react-window | ~5KB |
| date-fns (tree-shaken) | ~8KB |
| Unit 6 component code | ~20KB |
| **Total addition** | **~61KB** |

Cumulative bundle size (Unit 5 + Unit 6): approximately 350KB gzipped — within the 500KB budget.

---

## 4. Vercel Configuration (No Changes)

The `vercel.json` from Unit 5 handles all routing for Unit 6 routes (`/team`, `/tasks`) via the existing SPA rewrites rule:

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

The `/team` and `/tasks` routes are handled by React Router client-side — no Vercel-specific configuration needed.

---

## 5. Backend Dependencies

Unit 6 frontend depends on the following backend units being deployed:

| Backend Unit | Required For |
|---|---|
| Unit 2 (Auth & Users) | User data for org chart, supervisor updates |
| Unit 3 (Tasks & Socket.io) | Task data, Kanban drag-and-drop, real-time events |
| Unit 4 (File Upload) | Task file attachments |

Ensure the backend is deployed and `VITE_API_URL` points to the correct backend URL before deploying Unit 6 frontend.

---

## 6. Rollback

Same rollback strategy as Unit 5: use Vercel deployment history to promote a previous deployment to production instantly.
