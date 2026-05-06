# Frontend Component Specifications — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction

---

## 1. LoginPage

**File**: `src/pages/Login.tsx`  
**Route**: `/login` (public)  
**Component Type**: Page

### Props Interface
```typescript
// No props — page component
```

### State
```typescript
interface LoginPageState {
  isSubmitting: boolean;
  formError: string | null;
}
// Form state managed by react-hook-form + Zod resolver
```

### Key Behaviors
1. Renders a centered card on a full-screen animated background (Framer Motion floating particles or gradient animation).
2. Form fields: `email` (type="email") and `password` (type="password") with show/hide toggle.
3. On submit: validates with Zod schema, calls `auth.login(email, password)`.
4. Shows inline field errors from Zod validation.
5. Shows toast error on API failure.
6. Shows loading spinner on submit button while `isSubmitting`.
7. Dark/light mode toggle button in top-right corner.
8. Link to `/register` for new users.
9. On success: navigates to `location.state?.from || '/dashboard'`.
10. Animated background: Framer Motion `motion.div` with gradient animation cycling through brand colors.

### data-testid Attributes
```
data-testid="login-page"
data-testid="login-form"
data-testid="login-email-input"
data-testid="login-password-input"
data-testid="login-password-toggle"
data-testid="login-submit-button"
data-testid="login-error-message"
data-testid="login-register-link"
data-testid="login-theme-toggle"
data-testid="login-animated-background"
```

### Animation Spec
```typescript
// Page enter animation
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

// Card entrance
const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, delay: 0.1 } },
};
```

---

## 2. RegisterPage

**File**: `src/pages/Register.tsx`  
**Route**: `/register` (public)  
**Component Type**: Page

### Props Interface
```typescript
// No props — page component
```

### State
```typescript
interface RegisterPageState {
  isSubmitting: boolean;
  formError: string | null;
}
// Form state managed by react-hook-form + Zod resolver
```

### Key Behaviors
1. Same animated background as LoginPage (shared `AnimatedBackground` component).
2. Form fields: `name`, `email`, `password`, `confirmPassword`.
3. Password strength indicator (weak/medium/strong based on length + character variety).
4. On submit: validates with Zod schema, calls `auth.register(name, email, password)`.
5. Shows inline field errors.
6. Shows toast error on API failure.
7. Link to `/login` for existing users.
8. On success: navigates to `/dashboard`.

### data-testid Attributes
```
data-testid="register-page"
data-testid="register-form"
data-testid="register-name-input"
data-testid="register-email-input"
data-testid="register-password-input"
data-testid="register-confirm-password-input"
data-testid="register-password-strength"
data-testid="register-submit-button"
data-testid="register-error-message"
data-testid="register-login-link"
```

---

## 3. Sidebar

**File**: `src/components/layout/Sidebar.tsx`  
**Component Type**: Layout

### Props Interface
```typescript
interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  'data-testid'?: string;
}
```

### State
```typescript
// No local state — controlled by parent (AppLayout)
// Active route determined by useLocation()
```

### Key Behaviors
1. Renders vertical navigation with icon + label for each nav item.
2. When `isCollapsed=true`: width = 64px, labels hidden, icons centered, tooltips shown on hover.
3. When `isCollapsed=false`: width = 240px, labels visible next to icons.
4. Width transition: Framer Motion `animate={{ width: isCollapsed ? 64 : 240 }}` with `transition={{ duration: 0.2 }}`.
5. Active route: compares `useLocation().pathname` with each nav item's `path`; applies `bg-primary/10 text-primary` to active item.
6. Collapse toggle button at bottom of sidebar with `ChevronLeft`/`ChevronRight` icon.
7. TMS logo/brand at top (full name when expanded, icon when collapsed).
8. User role badge at bottom (above collapse toggle).

### Nav Items
```typescript
const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Sparkles, label: 'AI Tools', path: '/ai-tools' },
  { icon: FileText, label: 'Documents', path: '/documents' },
];
```

### data-testid Attributes
```
data-testid="sidebar"
data-testid="sidebar-logo"
data-testid="sidebar-nav"
data-testid="sidebar-nav-item-dashboard"
data-testid="sidebar-nav-item-team"
data-testid="sidebar-nav-item-tasks"
data-testid="sidebar-nav-item-chat"
data-testid="sidebar-nav-item-ai-tools"
data-testid="sidebar-nav-item-documents"
data-testid="sidebar-collapse-toggle"
data-testid="sidebar-user-role-badge"
```

---

## 4. Topbar

**File**: `src/components/layout/Topbar.tsx`  
**Component Type**: Layout

### Props Interface
```typescript
interface TopbarProps {
  onMenuToggle?: () => void;
  'data-testid'?: string;
}
```

### State
```typescript
interface TopbarState {
  isNotificationOpen: boolean;
  isStatusMenuOpen: boolean;
  searchQuery: string;
}
```

### Key Behaviors
1. Fixed header at top of content area (not full width — sidebar is separate).
2. Left side: hamburger menu button (mobile only, `md:hidden`).
3. Center: search input with `<Search>` icon; `placeholder="Search..."`.
4. Right side (left to right): theme toggle, notification bell, user avatar + status.
5. **Notification bell**: `<Bell>` icon from lucide-react; badge shows `unreadCount` from `useNotifications()`. Badge hidden when `unreadCount === 0`. Badge shows "99+" when count > 99. Clicking opens `NotificationDropdown`.
6. **User avatar**: `<Avatar>` component with current user's data. Clicking opens user menu dropdown (logout, profile link).
7. **Status badge**: `<StatusBadge>` next to avatar. Clicking opens status selector dropdown with all `AvailabilityStatus` options.
8. Status change: calls `PATCH /api/users/:id/status` and updates AuthContext user.

### data-testid Attributes
```
data-testid="topbar"
data-testid="topbar-menu-toggle"
data-testid="topbar-search-input"
data-testid="topbar-theme-toggle"
data-testid="topbar-notification-bell"
data-testid="topbar-notification-badge"
data-testid="topbar-notification-dropdown"
data-testid="topbar-user-avatar"
data-testid="topbar-status-badge"
data-testid="topbar-status-menu"
data-testid="topbar-logout-button"
```

---

## 5. DashboardPage

**File**: `src/pages/Dashboard.tsx`  
**Route**: `/dashboard` (protected)  
**Component Type**: Page

### Props Interface
```typescript
// No props — page component
```

### State
```typescript
interface DashboardPageState {
  dashboardData: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}
```

### Key Behaviors
1. On mount: parallel fetch of tasks-by-status and workload distribution data.
2. While loading: renders `<SkeletonLoader variant="card" count={2} />` in place of charts.
3. On error: renders error state with retry button.
4. **Tasks by Status Bar Chart**:
   - Recharts `<BarChart>` with responsive container.
   - X-axis: status labels (To Do, In Progress, Review, Done).
   - Y-axis: task count.
   - Each bar has a distinct color.
   - Tooltip shows exact count on hover.
5. **Workload Distribution Pie Chart**:
   - Recharts `<PieChart>` with responsive container.
   - Each slice = one user, sized by workload percentage.
   - Slice color = workload tier color (green/amber/red).
   - Legend shows user names.
   - Tooltip shows user name + percentage.
6. Summary stats row above charts: total tasks, tasks in progress, overdue tasks, team members.
7. Page title: "Dashboard" with current date.
8. Framer Motion page enter animation.

### data-testid Attributes
```
data-testid="dashboard-page"
data-testid="dashboard-stats-row"
data-testid="dashboard-stat-total-tasks"
data-testid="dashboard-stat-in-progress"
data-testid="dashboard-stat-overdue"
data-testid="dashboard-stat-team-members"
data-testid="dashboard-tasks-chart"
data-testid="dashboard-workload-chart"
data-testid="dashboard-loading-skeleton"
data-testid="dashboard-error-state"
data-testid="dashboard-retry-button"
```

---

## 6. Avatar

**File**: `src/components/common/Avatar.tsx`  
**Component Type**: Common/Primitive

### Props Interface
```typescript
interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: AvailabilityStatus | null;
  className?: string;
  'data-testid'?: string;
}
```

### State
```typescript
interface AvatarState {
  imgError: boolean; // true if image failed to load
}
```

### Key Behaviors
1. If `src` is provided and image loads: renders `<img>` with `onError` handler.
2. If `src` is null/undefined or image fails to load (`imgError=true`): renders initials.
3. **Initials generation**: Take first character of first word + first character of last word from `name`. Uppercase. Example: "John Doe" → "JD", "Alice" → "A".
4. **Status ring**: If `status` prop provided, renders a colored ring (border) around the avatar.
   - AVAILABLE: `ring-green-500`
   - IN_CALL: `ring-red-500`
   - AWAY: `ring-amber-500`
   - OFFLINE: `ring-gray-400`
5. **Size variants**: xs=24px, sm=32px, md=40px (default), lg=48px, xl=64px.
6. Background color for initials: deterministic color based on name hash (consistent per user).
7. Rounded full (circle shape).

### data-testid Attributes
```
data-testid={props['data-testid'] || 'avatar'}
data-testid="avatar-image"       // on the <img> element
data-testid="avatar-initials"    // on the initials <div>
data-testid="avatar-status-ring" // on the ring element
```

---

## 7. StatusBadge

**File**: `src/components/common/StatusBadge.tsx`  
**Component Type**: Common/Primitive

### Props Interface
```typescript
interface StatusBadgeProps {
  status: AvailabilityStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}
```

### State
```typescript
// No state — pure display component
```

### Key Behaviors
1. Renders a colored dot + optional text label.
2. Dot is a small circle (`rounded-full`) with status-specific background color.
3. Label text: "Available", "In Call", "Away", "Offline".
4. `showLabel` defaults to `true`.
5. `size='sm'`: dot 8px, text `text-xs`. `size='md'`: dot 10px, text `text-sm`.
6. Accessible: `role="status"` and `aria-label={label}` on the container.

### data-testid Attributes
```
data-testid={props['data-testid'] || 'status-badge'}
data-testid="status-badge-dot"
data-testid="status-badge-label"
```

---

## 8. RoleBadge

**File**: `src/components/common/RoleBadge.tsx`  
**Component Type**: Common/Primitive

### Props Interface
```typescript
interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}
```

### State
```typescript
// No state — pure display component
```

### Key Behaviors
1. Renders a pill-shaped badge with role-specific color and label.
2. **Role → Color mapping**:
   - ADMIN: `bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
   - TEAM_LEADER: `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
   - TEAM_MEMBER: `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
   - JUNIOR_MEMBER: `bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`
3. **Role → Label mapping**:
   - ADMIN: "Admin"
   - TEAM_LEADER: "Team Leader"
   - TEAM_MEMBER: "Team Member"
   - JUNIOR_MEMBER: "Junior Member"
4. `size='sm'`: `text-xs px-2 py-0.5`. `size='md'`: `text-sm px-2.5 py-1`.
5. `rounded-full` shape.

### data-testid Attributes
```
data-testid={props['data-testid'] || 'role-badge'}
```

---

## 9. WorkloadBar

**File**: `src/components/common/WorkloadBar.tsx`  
**Component Type**: Common/Primitive

### Props Interface
```typescript
interface WorkloadBarProps {
  percentage: number;
  showLabel?: boolean;
  height?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}
```

### State
```typescript
// No state — pure display component
```

### Key Behaviors
1. Renders a slim horizontal progress bar.
2. **Track**: full-width gray background (`bg-gray-200 dark:bg-gray-700`).
3. **Fill**: colored div with `width: ${clampedPercentage}%`.
4. **Fill color**:
   - 0-40%: `bg-green-500`
   - 41-70%: `bg-amber-500`
   - 71-100%: `bg-red-500`
5. `height='sm'`: 4px. `height='md'`: 8px.
6. `percentage` clamped to [0, 100] before rendering.
7. If `showLabel=true`: renders percentage text next to bar (e.g., "65%").
8. Accessible: `role="progressbar"`, `aria-valuenow={percentage}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Workload"`.
9. Smooth fill transition: `transition-all duration-300`.

### data-testid Attributes
```
data-testid={props['data-testid'] || 'workload-bar'}
data-testid="workload-bar-track"
data-testid="workload-bar-fill"
data-testid="workload-bar-label"
```

---

## 10. SkeletonLoader

**File**: `src/components/common/SkeletonLoader.tsx`  
**Component Type**: Common/Primitive

### Props Interface
```typescript
type SkeletonVariant = 'card' | 'list' | 'text' | 'avatar' | 'badge';

interface SkeletonLoaderProps {
  variant: SkeletonVariant;
  count?: number;
  className?: string;
  'data-testid'?: string;
}
```

### State
```typescript
// No state — pure display component
```

### Key Behaviors
1. Renders animated pulse placeholder(s) matching the shape of the content being loaded.
2. Animation: Tailwind `animate-pulse` class on all skeleton elements.
3. Color: `bg-gray-200 dark:bg-gray-700` for skeleton blocks.
4. `count` prop renders multiple instances (default: 1).

### Variant Specifications

**`card`** (200px height):
```
+----------------------------------+
|  [gray block 200px height]       |
|  rounded-lg, full width          |
+----------------------------------+
```

**`list`** (60px height per item):
```
+----------------------------------+
| [circle 40px] [line 60%]         |
|               [line 40%]         |
+----------------------------------+
```
Circle = avatar placeholder. Two lines = name + subtitle.

**`text`** (multiple lines):
```
[line 100%]
[line 90%]
[line 75%]
[line 85%]
[line 60%]
```
Lines of varying width to simulate paragraph text.

**`avatar`** (circle):
```
[circle 40px]
```

**`badge`** (pill shape):
```
[rounded-full 60px × 20px]
```

### data-testid Attributes
```
data-testid={props['data-testid'] || 'skeleton-loader'}
data-testid="skeleton-item-{index}"  // for each item when count > 1
```

---

## 11. AppLayout (Container)

**File**: `src/components/layout/AppLayout.tsx`  
**Component Type**: Layout Container

### Props Interface
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}
```

### State
```typescript
interface AppLayoutState {
  isSidebarCollapsed: boolean;
}
```

### Key Behaviors
1. Reads initial `isSidebarCollapsed` from `localStorage` key `'tms-sidebar-collapsed'`.
2. On mobile (< 768px): forces `isSidebarCollapsed = true`.
3. Renders `<Sidebar>` + `<Topbar>` + `<main>` content area.
4. Layout: CSS Grid or Flexbox — sidebar on left, content on right.
5. Content area has `overflow-y-auto` for scrolling.
6. Framer Motion `AnimatePresence` wraps page content for route transitions.

### data-testid Attributes
```
data-testid="app-layout"
data-testid="app-layout-content"
```

---

## 12. PrivateRoute

**File**: `src/components/layout/PrivateRoute.tsx`  
**Component Type**: Route Guard

### Props Interface
```typescript
interface PrivateRouteProps {
  children: React.ReactNode;
}
```

### Key Behaviors
1. Reads `isAuthenticated` and `isLoading` from `useAuth()`.
2. If `isLoading`: renders full-page loading spinner/skeleton.
3. If `!isAuthenticated`: renders `<Navigate to="/login" state={{ from: location }} replace />`.
4. If `isAuthenticated`: renders `children`.

### data-testid Attributes
```
data-testid="private-route-loading"
data-testid="private-route-content"
```

---

## 13. NotificationDropdown

**File**: `src/components/common/NotificationDropdown.tsx`  
**Component Type**: Common

### Props Interface
```typescript
interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  'data-testid'?: string;
}
```

### State
```typescript
// Reads from useNotifications() hook
```

### Key Behaviors
1. Dropdown panel anchored to notification bell in Topbar.
2. Shows list of recent notifications (max 10 visible, scrollable).
3. Each notification item: icon (based on type) + title + body + relative time.
4. Unread notifications have highlighted background.
5. "Mark all read" button at top.
6. "No notifications" empty state when list is empty.
7. Clicking a notification: marks it as read + navigates to related resource.
8. Closes on outside click (click-away handler).

### data-testid Attributes
```
data-testid="notification-dropdown"
data-testid="notification-list"
data-testid="notification-item-{id}"
data-testid="notification-mark-all-read"
data-testid="notification-empty-state"
```
