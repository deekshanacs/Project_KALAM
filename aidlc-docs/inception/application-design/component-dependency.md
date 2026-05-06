# Component Dependency Map — TMS (Project KALAM)

---

## Backend Dependency Matrix

| Component | Depends On | Communication Pattern |
|---|---|---|
| BC-01 AuthComponent | BC-09 SocketComponent | Direct call (disconnect on logout) |
| BC-02 UserComponent | BC-09 SocketComponent | Direct call (emit status change) |
| BC-03 TaskComponent | BC-02 UserComponent | Direct call (validate hierarchy) |
| BC-03 TaskComponent | BC-09 SocketComponent | Direct call (emit task events) |
| BC-04 ChatComponent | BC-07 FileComponent | Direct call (file URL in message) |
| BC-04 ChatComponent | BC-09 SocketComponent | Direct call (emit message events) |
| BC-05 AIComponent | BC-07 FileComponent | Direct call (parse uploaded file) |
| BC-06 DocumentComponent | BC-09 SocketComponent | Direct call (emit share notification) |
| BC-08 NotificationComponent | BC-09 SocketComponent | Direct call (emit notification event) |
| All Services | SVC-X1 LoggerService | Direct call (structured logging) |
| All Routes | SVC-X2 ValidationService | Middleware (Zod schema validation) |
| Auth Routes | SVC-X3 RateLimitService | Middleware (rate limiting) |
| All Routes | SVC-X4 ErrorHandlerService | Express error middleware |

---

## Frontend Dependency Map

```
App
├── AuthContext (FC-01)
│   └── useAuth hook
├── SocketContext
│   └── useSocket hook
├── LayoutModule (FC-02)
│   ├── Sidebar
│   ├── Topbar
│   │   └── NotificationBell
│   └── PageWrapper
│       ├── DashboardModule (FC-08)
│       │   └── Recharts components
│       ├── OrgChartModule (FC-03)
│       │   ├── @dnd-kit/core
│       │   ├── ProfileCard → CommonComponents (FC-09)
│       │   └── ProfileDrawer
│       ├── TaskModule (FC-04)
│       │   ├── @dnd-kit/sortable
│       │   ├── TaskCard → CommonComponents (FC-09)
│       │   ├── TaskModal
│       │   └── FilterBar
│       ├── ChatModule (FC-05)
│       │   ├── Socket.io client
│       │   ├── WebRTC (simple-peer or native)
│       │   └── MessageBubble
│       ├── AIToolsModule (FC-06)
│       │   ├── FileUploader
│       │   ├── SummaryCard
│       │   ├── DocCreator
│       │   └── docx (DOCX export)
│       └── DocumentsModule (FC-07)
│           ├── TipTap editor
│           └── ShareModal
```

---

## Data Flow Patterns

### Authentication Flow
```
Client → POST /api/auth/login → AuthService → BC-01 → Prisma → DB
                                           ↓
                              Returns: { accessToken, refreshToken }
Client stores tokens → axios interceptor attaches accessToken to all requests
On 401 → axios interceptor calls POST /api/auth/refresh → rotates tokens
```

### Real-Time Event Flow
```
Action (e.g., task status change)
  → TaskService.updateTaskStatus()
  → BC-03 updates DB via Prisma
  → BC-09.emitToUser(assigneeId, 'task:updated', taskData)
  → Socket.io delivers to assignee's room
  → Frontend useSocket hook fires handler
  → React state updates → UI re-renders
```

### AI Streaming Flow
```
Client → POST /api/ai/create-document (with description + answers)
  → AIService builds Claude API request
  → Anthropic SDK streams response
  → Express res.write() sends each chunk
  → Frontend fetch() reads ReadableStream
  → React state appends each chunk → preview pane updates progressively
```

---

## Shared Types Data Flow

```
/shared/types/index.ts
  ↑ imported by
  ├── /backend/src/types/*.ts (DTOs extend shared interfaces)
  └── /frontend/src/types/*.ts (component props use shared interfaces)
```
