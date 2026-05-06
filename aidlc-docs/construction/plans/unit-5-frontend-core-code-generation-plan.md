# Code Generation Plan — Unit 5: Frontend Core
## TMS (Project KALAM)

**Unit**: Frontend Core — Vite scaffold, Tailwind, shadcn/ui, auth pages, layout, dashboard  
**Stories**: US-AUTH-01, US-AUTH-02, US-DASH-01  
**Dependencies**: Unit 1 (shared types), Unit 2 (auth API endpoints)

---

## Execution Checklist

### Step 1: Vite Project Scaffold
- [x] Create `frontend/index.html`
- [x] Create `frontend/vite.config.ts` (React plugin, path aliases @/ → src/, proxy /api → VITE_API_URL)
- [x] Create `frontend/tailwind.config.ts` (content paths, dark mode: 'class', custom colors: indigo/violet primary, cyan accent, emerald success, amber warning, rose danger)
- [x] Create `frontend/postcss.config.js`
- [x] Create `frontend/src/main.tsx` (React 18 createRoot, BrowserRouter, App)
- [x] Create `frontend/src/App.tsx` (routes: /login, /register, /, /team, /tasks, /chat, /ai, /documents; lazy-loaded pages; AnimatePresence for page transitions)

### Step 2: Shared Types Re-export
- [x] Create `frontend/src/types/index.ts` (re-export from @tms/shared + frontend-only types: AuthState, SocketContextValue, NotificationDto)

### Step 3: API Client
- [x] Create `frontend/src/api/client.ts` (axios instance: baseURL from VITE_API_URL, request interceptor attaches Bearer token, response interceptor: on 401 → refresh → retry once → on second 401 → logout)
- [x] Create `frontend/src/api/auth.api.ts` (login, register, refresh, logout, getMe)
- [x] Create `frontend/src/api/users.api.ts` (getUsers, getUserById, updateStatus, updateSupervisor, getUserTasks, getWorkload)
- [x] Create `frontend/src/api/tasks.api.ts` (getTasks, createTask, updateTask, updateTaskStatus, deleteTask, getComments, addComment, getTimeLogs, logTime)
- [x] Create `frontend/src/api/chat.api.ts` (getDirectMessages, sendDirectMessage, getGroupMessages, sendGroupMessage, editMessage, deleteMessage, markAsRead, getGroups, createGroup)
- [x] Create `frontend/src/api/ai.api.ts` (summarizeDocument, generateDocx)
- [x] Create `frontend/src/api/documents.api.ts` (getDocuments, getDocument, createDocument, updateDocument, deleteDocument, shareDocument)
- [x] Create `frontend/src/api/upload.api.ts` (uploadFile)

### Step 4: Auth Context & Hook
- [x] Create `frontend/src/contexts/AuthContext.tsx` (AuthContext, AuthProvider: manages accessToken in state, refreshToken in localStorage, login/logout/register/refresh actions)
- [x] Create `frontend/src/hooks/useAuth.ts` (consumes AuthContext)

### Step 5: Socket Context & Hook
- [x] Create `frontend/src/contexts/SocketContext.tsx` (SocketContext, SocketProvider: connect on login with JWT, disconnect on logout, join user room)
- [x] Create `frontend/src/hooks/useSocket.ts` (consumes SocketContext, provides on/off/emit helpers)

### Step 6: Permission & Workload Hooks
- [x] Create `frontend/src/hooks/usePermissions.ts` (canAssignTask, canDragNode, canEditDocument — uses currentUser.role + hierarchy)
- [x] Create `frontend/src/hooks/useWorkload.ts` (getWorkloadColor, getWorkloadForUser)
- [x] Create `frontend/src/hooks/useNotifications.ts` (manages in-memory notifications array, unreadCount, markRead, markAllRead; listens to socket 'notification:new')

### Step 7: Common Components
- [x] Create `frontend/src/components/common/Avatar.tsx` (image with fallback initials, size variants sm/md/lg, status ring colored by AvailabilityStatus; data-testid)
- [x] Create `frontend/src/components/common/StatusBadge.tsx` (colored dot + label; data-testid)
- [x] Create `frontend/src/components/common/RoleBadge.tsx` (colored badge per role; data-testid)
- [x] Create `frontend/src/components/common/WorkloadBar.tsx` (slim progress bar, color by tier; data-testid)
- [x] Create `frontend/src/components/common/SkeletonLoader.tsx` (variants: card, listItem, text, chart; shimmer animation; data-testid)
- [x] Create `frontend/src/components/common/ErrorBoundary.tsx` (class component, ErrorFallback with retry)
- [x] Create `frontend/src/components/common/AnimatedWrapper.tsx` (Framer Motion wrapper respecting useReducedMotion)

### Step 8: Layout Components
- [x] Create `frontend/src/components/layout/Sidebar.tsx` (nav items with icons, collapse toggle, active state highlight, persisted collapse in localStorage; data-testid)
- [x] Create `frontend/src/components/layout/Topbar.tsx` (user Avatar + StatusBadge, notification bell with badge, search input, dark/light toggle; data-testid)
- [x] Create `frontend/src/components/layout/PageWrapper.tsx` (AnimatedWrapper with pageVariants, padding, max-width)
- [x] Create `frontend/src/components/layout/NotificationDropdown.tsx` (list of notifications, mark all read; data-testid)

### Step 9: Auth Pages
- [x] Create `frontend/src/pages/Login.tsx` (form: email + password, animated background with floating shapes, dark/light mode, link to register; data-testid)
- [x] Create `frontend/src/pages/Register.tsx` (form: name + email + password; data-testid)
- [x] Create `frontend/src/components/auth/PrivateRoute.tsx` (redirects to /login if !isAuthenticated)

### Step 10: Dashboard Page
- [x] Create `frontend/src/pages/Dashboard.tsx` (fetch tasks + users, Recharts BarChart for tasks by status, PieChart for workload distribution, skeleton loaders; data-testid)

### Step 11: Animation Utilities
- [x] Create `frontend/src/utils/animations.ts` (pageVariants, drawerVariants, cardHoverVariants, fadeVariants)
- [x] Create `frontend/src/utils/workload.ts` (getWorkloadColor, getWorkloadPercentage, MAX_CAPACITY)
- [x] Create `frontend/src/utils/rolePermissions.ts` (ROLE_WEIGHT, canAssign, canDragNode)
- [x] Create `frontend/src/utils/formatters.ts` (formatDate, formatRelativeTime, formatFileSize)

### Step 12: Unit Tests (Frontend)
- [x] Create `frontend/src/utils/__tests__/workload.test.ts` (example-based + PBT: percentage in [0,100], color tier invariant)
- [x] Create `frontend/src/utils/__tests__/rolePermissions.test.ts` (example-based + PBT: canAssign determinism)
- [x] Create `frontend/src/hooks/__tests__/useNotifications.test.ts` (example-based: add notification, max 50 invariant)

### Step 13: Documentation
- [x] Create `aidlc-docs/construction/unit-5-frontend-core/code/unit-5-summary.md`

