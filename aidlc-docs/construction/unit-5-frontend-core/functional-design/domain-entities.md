# Domain Entities — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction  
**Source**: Imports from `/shared/types/index.ts`; frontend-specific extensions defined here

---

## 1. Shared Enums (from /shared/types)

```typescript
enum Role {
  ADMIN = 'ADMIN',
  TEAM_LEADER = 'TEAM_LEADER',
  TEAM_MEMBER = 'TEAM_MEMBER',
  JUNIOR_MEMBER = 'JUNIOR_MEMBER',
}

enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  IN_CALL = 'IN_CALL',
  AWAY = 'AWAY',
  OFFLINE = 'OFFLINE',
}

enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
```

---

## 2. Shared Interfaces (from /shared/types)

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  availabilityStatus: AvailabilityStatus;
  supervisorId: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null; // ISO 8601
  assigneeId: string | null;
  assignee: User | null;
  creatorId: string;
  projectId: string | null;
  attachments: string[]; // array of URLs
  commentCount: number;
  timeLoggedMinutes: number;
  createdAt: string;
  updatedAt: string;
}

interface NotificationDto {
  id: string;
  type: 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'MESSAGE_RECEIVED' | 'DOCUMENT_SHARED';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedId: string | null; // taskId, messageId, documentId
}
```

---

## 3. Auth Domain Entities

### 3.1 AuthState

The internal state shape managed by AuthContext:

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;       // true during initial auth check or token refresh
  isAuthenticated: boolean; // true when user + accessToken are both non-null
}
```

**State transitions**:

| Event | isLoading | isAuthenticated | user | accessToken |
|---|---|---|---|---|
| App start (checking stored token) | true | false | null | null |
| Token check complete (no token) | false | false | null | null |
| Token check complete (valid token) | false | true | User | string |
| Login in progress | true | false | null | null |
| Login success | false | true | User | string |
| Login failure | false | false | null | null |
| Logout | false | false | null | null |
| Token refresh in progress | false | true | User | old token |
| Token refresh success | false | true | User | new token |
| Token refresh failure | false | false | null | null |

### 3.2 AuthContextValue

The full context value exposed via `useAuth()`:

```typescript
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  refreshToken: () => Promise<string>; // returns new accessToken
  updateUser: (updates: Partial<User>) => void; // for status updates
}
```

### 3.3 LoginFormValues

```typescript
interface LoginFormValues {
  email: string;
  password: string;
}

// Zod schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
```

### 3.4 RegisterFormValues

```typescript
interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Zod schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### 3.5 AuthApiResponse

```typescript
interface AuthApiResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface RefreshApiResponse {
  accessToken: string;
  refreshToken: string;
}
```

---

## 4. Socket Domain Entities

### 4.1 SocketContextValue

```typescript
interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  on: <T>(event: string, handler: (data: T) => void) => void;
  off: <T>(event: string, handler: (data: T) => void) => void;
  emit: <T>(event: string, data?: T) => void;
}
```

**Note**: `Socket` is imported from `socket.io-client`.

### 4.2 Socket Event Payloads

```typescript
// Notification event
interface NotificationNewPayload {
  notification: NotificationDto;
}

// User status change event
interface UserStatusChangePayload {
  userId: string;
  status: AvailabilityStatus;
}

// Task assigned event (used in Unit 6, defined here for completeness)
interface TaskAssignedPayload {
  task: Task;
  assigneeId: string;
}

// Task updated event
interface TaskUpdatedPayload {
  task: Task;
}

// Workload update event
interface UserWorkloadUpdatePayload {
  userId: string;
  workloadPercentage: number;
}
```

---

## 5. Dashboard Domain Entities

### 5.1 DashboardData

```typescript
interface DashboardData {
  tasksByStatus: Record<TaskStatus, number>;
  workloadDistribution: WorkloadDto[];
}
```

### 5.2 WorkloadDto

```typescript
interface WorkloadDto {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  role: Role;
  workloadPercentage: number;
  openTaskCount: number;
  maxCapacity: number;
}
```

### 5.3 DashboardChartData (Recharts-ready)

```typescript
// For BarChart (tasks by status)
interface TaskStatusChartItem {
  status: string;       // display label: 'To Do', 'In Progress', 'Review', 'Done'
  count: number;
  fill: string;         // hex color
}

// For PieChart (workload distribution)
interface WorkloadChartItem {
  name: string;         // user name
  value: number;        // workload percentage
  fill: string;         // green/amber/red hex
}
```

---

## 6. Notification Domain Entities

### 6.1 NotificationState

```typescript
interface NotificationState {
  notifications: NotificationDto[];
  unreadCount: number;
}
```

### 6.2 NotificationActions

```typescript
interface NotificationActions {
  addNotification: (notification: NotificationDto) => void;
  markAllRead: () => void;
  markRead: (notificationId: string) => void;
  clearAll: () => void;
}
```

---

## 7. Common Component Prop Interfaces

### 7.1 Avatar Props

```typescript
interface AvatarProps {
  src?: string | null;
  name: string;                          // used for initials fallback
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: AvailabilityStatus | null;    // shows colored ring if provided
  className?: string;
  'data-testid'?: string;
}
```

**Size mapping**:
| Size | Dimensions |
|---|---|
| xs | 24px × 24px |
| sm | 32px × 32px |
| md | 40px × 40px (default) |
| lg | 48px × 48px |
| xl | 64px × 64px |

### 7.2 StatusBadge Props

```typescript
interface StatusBadgeProps {
  status: AvailabilityStatus;
  showLabel?: boolean;   // default: true
  size?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}
```

**Status display mapping**:
| Status | Dot Color | Label |
|---|---|---|
| AVAILABLE | green-500 | Available |
| IN_CALL | red-500 | In Call |
| AWAY | amber-500 | Away |
| OFFLINE | gray-400 | Offline |

### 7.3 RoleBadge Props

```typescript
interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
  className?: string;
  'data-testid'?: string;
}
```

**Role display mapping**:
| Role | Label | Color |
|---|---|---|
| ADMIN | Admin | purple |
| TEAM_LEADER | Team Leader | blue |
| TEAM_MEMBER | Team Member | green |
| JUNIOR_MEMBER | Junior Member | gray |

### 7.4 WorkloadBar Props

```typescript
interface WorkloadBarProps {
  percentage: number;    // 0-100
  showLabel?: boolean;   // default: false
  height?: 'sm' | 'md'; // sm=4px, md=8px
  className?: string;
  'data-testid'?: string;
}
```

### 7.5 SkeletonLoader Props

```typescript
type SkeletonVariant = 'card' | 'list' | 'text' | 'avatar' | 'badge';

interface SkeletonLoaderProps {
  variant: SkeletonVariant;
  count?: number;        // number of skeleton items to render (default: 1)
  className?: string;
  'data-testid'?: string;
}
```

### 7.6 Toast (react-hot-toast wrapper)

```typescript
// No custom props — uses react-hot-toast API directly
// Wrapper functions exported from utils/toast.ts:
export const showSuccess = (message: string) => toast.success(message);
export const showError = (message: string) => toast.error(message);
export const showLoading = (message: string) => toast.loading(message);
```

---

## 8. Layout Component Prop Interfaces

### 8.1 Sidebar Props

```typescript
interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  'data-testid'?: string;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles?: Role[];  // if undefined, visible to all roles
}
```

### 8.2 Topbar Props

```typescript
interface TopbarProps {
  onMenuToggle?: () => void;  // mobile hamburger
  'data-testid'?: string;
}
```

### 8.3 PageWrapper Props

```typescript
interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}
```

---

## 9. API Client Types

### 9.1 ApiError

```typescript
interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>; // validation errors
}
```

### 9.2 PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 9.3 ApiResponse

```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
}
```

---

## 10. Hook Return Types

### 10.1 useAuth Return Type

```typescript
// Same as AuthContextValue — useAuth() returns the full context value
type UseAuthReturn = AuthContextValue;
```

### 10.2 useSocket Return Type

```typescript
// Same as SocketContextValue
type UseSocketReturn = SocketContextValue;
```

### 10.3 useNotifications Return Type

```typescript
interface UseNotificationsReturn extends NotificationState, NotificationActions {}
```

### 10.4 useWorkload Return Type

```typescript
interface UseWorkloadReturn {
  getWorkloadColor: (percentage: number) => 'green' | 'amber' | 'red';
  getWorkloadForUser: (userId: string) => WorkloadDto | undefined;
  workloadData: WorkloadDto[];
  isLoading: boolean;
  error: string | null;
}
```

### 10.5 usePermissions Return Type

```typescript
interface UsePermissionsReturn {
  canAssignTask: (assigneeId: string) => boolean;
  canDragNode: (draggedUserId: string) => boolean;
  canEditDocument: (docId: string) => boolean;
  isAdmin: boolean;
  isTeamLeader: boolean;
  isTeamMember: boolean;
  isJuniorMember: boolean;
}
```
