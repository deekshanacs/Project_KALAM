# Performance Test Instructions — TMS (Project KALAM)

## Performance Requirements
| Metric | Target |
|---|---|
| API response time (CRUD) | < 300ms p95 |
| Socket.io event delivery | < 100ms |
| AI streaming first token | < 2s |
| Kanban board (200 tasks) | < 500ms render |
| Dashboard charts | < 500ms render |

## Manual Performance Verification

Since no dedicated load testing tool is configured for MVP, use the following manual checks:

### Backend API Response Times
```bash
# Install httpie or use curl
# Test task list endpoint
curl -w "\nTime: %{time_total}s\n" -H "Authorization: Bearer <token>" http://localhost:4000/api/tasks

# Expected: < 300ms
```

### Socket.io Latency
Open browser DevTools → Network tab → WS connection → observe message timestamps.
Expected: < 100ms between emit and receive on localhost.

### AI Streaming First Token
Open browser DevTools → Network tab → filter by `/api/ai/create-document` → observe Time to First Byte (TTFB).
Expected: < 2s.

## Future Load Testing (Post-MVP)
For production load testing, use [k6](https://k6.io/) or [Artillery](https://www.artillery.io/):
```bash
# Example k6 script (not included in MVP)
k6 run --vus 50 --duration 30s load-test.js
```

## Lighthouse Performance Audit (Frontend)
```bash
# Build frontend first
npm run build --workspace=frontend

# Serve and audit
npx serve frontend/dist &
npx lighthouse http://localhost:3000 --output=json --output-path=lighthouse-report.json

# Expected: Performance score > 80
```
