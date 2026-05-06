# Business Logic Model — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction  
**Components**: FC-01 (AuthModule), FC-02 (LayoutModule), FC-08 (DashboardModule), FC-09 (CommonComponents), SC-01 (SharedTypes)  
**Stories**: US-AUTH-01, US-AUTH-02, US-DASH-01

---

## 1. Project Scaffold

### 1.1 Vite + React 18 + TypeScript Setup

The frontend is bootstrapped with Vite 5.x using the React + TypeScript template. The project lives in `/frontend` within the monorepo.

```
/frontend
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, Topbar, PageWrapper
│   │   ├── common/          # Avatar, StatusBadge, RoleBadge, WorkloadBar, SkeletonLoader
│   │   └── dashboard/       # DashboardCharts
│   ├── pages/               # Login, Register, Dashboard, (stubs for Team, Tasks, Chat, AITools, Documents)
│   ├── hooks/               # useAuth, useSocket, useWorkload, usePermissions, useNotifications
│   ├── context/             # AuthContext, SocketContext
│   ├── api/                 # apiClient.ts, auth.api.ts, users.api.ts, tasks.api.ts
│   ├── types/               # Re-exports from /shared/types
│   ├── utils/               # workloadCalc.ts, rolePermissions.ts, formatters.ts
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

### 1.2 Tailwind CSS + shadcn/ui + Framer Motion

- Tailwind CSS configured with `darkMode: 'class'` strategy
- shadcn/ui components installed via CLI (`npx shadcn-ui@latest init`)
- Framer Motion imported for page transitions, drawer animations, card hover effects
- CSS variables defined in `globals.css` for shadcn/ui theming (light + dark)

---

## 2. Authentication Flow

### 2.1 Login Flow

```
User fills LoginPage form (email + password)
  → Client-side Zod validation
  → POST /api/auth/login { email, password }
  → Backend returns { accessToken, refreshToken, user }
  → Store accessToken in AuthContext state (memory only)
  → Store refreshToken in localStorage key 'tms_refresh_token'
  → Store user object in AuthContext state
  → Set isAuthenticated = true
  → Navigate to /dashboard
```

**Error handling**:
- 401 Unauthorized → show "Invalid email or password" toast
- 429 Too Many Requests → show "Too many attempts, please wait" toast
- Network error → show "Connection failed" toast

### 2.2 Register Flow

```
User fills RegisterPage form (name + email + password)
  → Client-side Zod validation (name required, email format, password min 8 chars)
  → POST /api/auth/register { name, email, password }
  → Backend returns { accessToken, refreshToken, user }
  → Same token storage as login
  → Navigate to /dashboard
```

### 2.3 Logout Flow

```
User clicks logout in Topbar
  → POST /api/auth/logout { refreshToken }
  → Clear accessToken from AuthContext state
  → Remove refreshToken from localStorage
  → Disconnect socket (SocketContext.disconnect())
  → Navigate to /login
```

### 2.4 Token Refresh Flow (Axios Interceptor)

The axios response interceptor handles 401 errors transparently:

```
Request made with accessToken in Authorization header
  → If response is 401:
    → Check if this is already a retry (flag: _retry)
    → If not retry:
      → Set _retry = true
      → POST /api/auth/refresh { refreshToken: localStorage.getItem('tms_refresh_token') }
      → If refresh succeeds:
        → Update accessToken in AuthContext state
        → Store new refreshToken in localStorage
        → Retry original request with new accessToken
      → If refresh fails (401 again):
        → Call logout() to clear all state
        → Navigate to /login
    → If already retry:
      → Call logout()
      → Navigate to /login
```

**Retry queue**: Multiple concurrent requests that fail with 401 are queued while the refresh is in progress. Once the new token is obtained, all queued requests are retried.

```typescript
// Conceptual retry queue pattern
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};
```

---

## 3. Socket Connection Flow

### 3.1 Connect on Login

```
Login/Register succeeds → accessToken available in AuthContext
  → SocketContext detects isAuthenticated = true
  → io(VITE_SOCKET_URL, { auth: { token: accessToken } })
  → Socket connects → isConnected = true
  → Join user room: socket.emit('join', userId)
```

### 3.2 Disconnect on Logout

```
Logout called
  → SocketContext detects isAuthenticated = false
  → socket.disconnect()
  → isConnected = false
  → socket = null
```

### 3.3 Socket Event Subscriptions (Unit 5 scope)

In Unit 5, the SocketContext is initialized and the following events are wired:

| Event | Handler |
|---|---|
| `notification:new` | Add to notifications array in useNotifications |
| `user:status-change` | Update user status in local state |
| `connect_error` | Log error, set isConnected = false |
| `disconnect` | Set isConnected = false |

---

## 4. Dashboard Data Flow

### 4.1 Data Fetching

```
DashboardPage mounts
  → useEffect triggers parallel fetches:
    → GET /api/tasks?groupBy=status  → tasksByStatus: Record<TaskStatus, number>
    → GET /api/users?includeWorkload=true → users with workload percentages
  → isLoading = true during fetch
  → On success: set dashboardData, isLoading = false
  → On error: set error state, show error toast
```

### 4.2 Chart Rendering

**Tasks by Status (Bar Chart)**:
- X-axis: TaskStatus values (TODO, IN_PROGRESS, REVIEW, DONE)
- Y-axis: Count of tasks
- Color per bar: TODO=gray, IN_PROGRESS=blue, REVIEW=amber, DONE=green
- Recharts `<BarChart>` with `<Bar>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<Legend>`

**Workload Distribution (Pie Chart)**:
- Each slice = one user
- Slice size = workload percentage
- Color: green (0-40%), amber (41-70%), red (71-100%)
- Recharts `<PieChart>` with `<Pie>`, `<Cell>`, `<Tooltip>`, `<Legend>`

### 4.3 Role-Scoped Data

| Role | Dashboard Scope |
|---|---|
| ADMIN | All users, all tasks org-wide |
| TEAM_LEADER | Own team (direct reports + their reports) |
| TEAM_MEMBER | Own tasks + direct junior members |
| JUNIOR_MEMBER | Own tasks only |

The backend enforces this scoping; the frontend simply renders what the API returns.

---

## 5. Layout Architecture

### 5.1 Sidebar Navigation

The Sidebar renders navigation items as icon + label pairs. On collapse, only icons are shown.

**Navigation items**:
| Icon | Label | Route | Roles |
|---|---|---|---|
| LayoutDashboard | Dashboard | /dashboard | All |
| Users | Team | /team | All |
| CheckSquare | Tasks | /tasks | All |
| MessageSquare | Chat | /chat | All |
| Sparkles | AI Tools | /ai-tools | All |
| FileText | Documents | /documents | All |

**Collapse behavior**:
- Toggle button at bottom of sidebar
- Collapsed state persisted in `localStorage` key `'tms-sidebar-collapsed'`
- On collapse: sidebar width transitions from 240px to 64px (Framer Motion `animate`)
- Labels fade out with opacity transition

**Active state**:
- Current route highlighted with `bg-primary/10 text-primary` classes
- Determined by `useLocation()` from react-router-dom

### 5.2 Topbar

The Topbar is a fixed header containing:

1. **Hamburger/collapse toggle** (mobile): toggles sidebar on small screens
2. **Search input**: `<input>` with magnifying glass icon; placeholder "Search..."
3. **Notification bell**: `<Bell>` icon with badge showing `unreadCount`; clicking opens `NotificationDropdown`
4. **User avatar**: `<Avatar>` component with user's name initials or profile image
5. **Status badge**: `<StatusBadge>` showing current `availabilityStatus`; clicking opens status dropdown

### 5.3 Dark/Light Mode

```
Initial load:
  → Read localStorage key 'tms-theme'
  → If 'dark': add class 'dark' to <html>
  → If 'light': remove class 'dark' from <html>
  → If not set: use system preference (prefers-color-scheme)

Toggle:
  → Flip current theme
  → Update localStorage 'tms-theme'
  → Add/remove 'dark' class on document.documentElement
```

Tailwind `dark:` variants handle all color changes. shadcn/ui components use CSS variables that automatically switch between light/dark values.

---

## 6. Axios Client Architecture

### 6.1 Instance Configuration

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 6.2 Request Interceptor

```
Every outgoing request:
  → Read accessToken from AuthContext (via closure or ref)
  → If accessToken exists: set Authorization: 'Bearer {accessToken}'
  → Return modified config
```

### 6.3 Response Interceptor

```
Every response:
  → If success (2xx): pass through
  → If 401:
    → If _retry flag set: logout + navigate to /login
    → Else: set _retry = true, attempt token refresh
      → On refresh success: update token, retry original request
      → On refresh failure: logout + navigate to /login
  → If other error: reject with error
```

### 6.4 API Module Structure

```
/api
├── apiClient.ts        # axios instance + interceptors
├── auth.api.ts         # login, register, logout, refresh, getMe
├── users.api.ts        # getUsers, getUserById, updateStatus, updateSupervisor, getUserWorkload
└── tasks.api.ts        # getTasks (with filters), createTask, updateTask, deleteTask, updateTaskStatus
```

---

## 7. Route Structure

```
/                     → redirect to /dashboard (if authenticated) or /login
/login                → LoginPage (public)
/register             → RegisterPage (public)
/dashboard            → DashboardPage (protected)
/team                 → TeamPage stub (protected) — implemented in Unit 6
/tasks                → TasksPage stub (protected) — implemented in Unit 6
/chat                 → ChatPage stub (protected) — implemented in Unit 7
/ai-tools             → AIToolsPage stub (protected) — implemented in Unit 7
/documents            → DocumentsPage stub (protected) — implemented in Unit 7
```

**PrivateRoute**: Wraps all protected routes. Checks `isAuthenticated` from `useAuth()`. If false, redirects to `/login` with `state={{ from: location }}` for post-login redirect.

---

## 8. Common Components Logic

### 8.1 Avatar

- Renders `<img>` if `src` prop provided and image loads successfully
- Falls back to initials (first letter of first name + first letter of last name) on image error or no src
- Status ring: colored border based on `availabilityStatus` prop
  - AVAILABLE: green ring
  - IN_CALL: red ring
  - AWAY: amber ring
  - OFFLINE: gray ring

### 8.2 WorkloadBar

```
getWorkloadColor(percentage: number): 'green' | 'amber' | 'red'
  → 0-40: 'green'
  → 41-70: 'amber'
  → 71-100: 'red'
```

Renders as a slim `<div>` with colored fill. Width = `${percentage}%`.

### 8.3 Toast Notifications

Uses `react-hot-toast`. Wrapper functions:
- `toast.success(message)` — green checkmark
- `toast.error(message)` — red X
- `toast.loading(message)` — spinner
- `toast.dismiss(id)` — dismiss specific toast

### 8.4 SkeletonLoader

Renders animated pulse placeholders. Variants:
- `card`: 200px height rectangle
- `list`: 60px height row with circle + lines
- `text`: multiple lines of varying width

---

## 9. Notification System (Unit 5 scope)

### 9.1 In-Memory State

```typescript
interface NotificationState {
  notifications: NotificationDto[];
  unreadCount: number;
}
```

### 9.2 Add Notification

```
socket event 'notification:new' received
  → Prepend to notifications array
  → If array length > 50: remove last item (oldest)
  → Increment unreadCount
```

### 9.3 Mark All Read

```
User clicks "Mark all read" in NotificationDropdown
  → Set all notifications.isRead = true
  → Set unreadCount = 0
```

---

## 10. Sequence Diagrams

### 10.1 Login Sequence

```
Browser          LoginPage        AuthContext       apiClient        Backend
  |                  |                |                 |               |
  |--submit form---->|                |                 |               |
  |                  |--login(creds)->|                 |               |
  |                  |               |--POST /auth/login--------------->|
  |                  |               |                 |<--{tokens,user}|
  |                  |               |--setTokens()    |               |
  |                  |               |--setUser()      |               |
  |                  |               |--isAuthenticated=true           |
  |                  |<--success-----|                 |               |
  |<--navigate /dashboard------------|                 |               |
```

### 10.2 Token Refresh Sequence

```
Component        apiClient        AuthContext        Backend
  |                  |                |                 |
  |--API request---->|                |                 |
  |                  |--request + token--------------->|
  |                  |<--401 Unauthorized--------------|
  |                  |--POST /auth/refresh------------>|
  |                  |<--{newAccessToken, newRefresh}--|
  |                  |--updateToken()-->|              |
  |                  |--retry original request-------->|
  |                  |<--200 OK + data-----------------|
  |<--data-----------|                |                |
```
