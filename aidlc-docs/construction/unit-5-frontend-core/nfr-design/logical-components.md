# Logical Components — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction

---

## 1. apiClient

**File**: `src/api/apiClient.ts`  
**Type**: Singleton axios instance

### Responsibilities
- Provides a configured axios instance with `baseURL` set to `VITE_API_URL`.
- Attaches `Authorization: Bearer {token}` header to every request via request interceptor.
- Handles 401 responses via response interceptor: refresh token → retry → logout on failure.
- Manages the retry queue for concurrent 401 failures.

### Interface

```typescript
// Exported singleton
export const apiClient: AxiosInstance;

// Setup function called once during app initialization
export const setupApiClient = (
  getToken: () => string | null,
  setToken: (token: string) => void,
  onLogout: () => void
) => void;
```

### Internal State
```typescript
let isRefreshing: boolean = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];
```

### Dependencies
- `axios` (npm)
- `import.meta.env.VITE_API_URL`
- `localStorage` (for refresh token read/write)

---

## 2. AuthContext

**File**: `src/context/AuthContext.tsx`  
**Type**: React Context + Provider

### Responsibilities
- Manages authentication state: `user`, `accessToken`, `isLoading`, `isAuthenticated`.
- Provides `login`, `logout`, `register`, `refreshToken`, `updateUser` actions.
- On mount: attempts to restore session by calling `GET /api/auth/me` with stored refresh token.
- Calls `setupApiClient` to inject token getter/setter into the axios interceptor.

### State Shape

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

### Actions

```typescript
const login = async (email: string, password: string): Promise<void> => {
  setState(prev => ({ ...prev, isLoading: true }));
  const { data } = await authApi.login(email, password);
  localStorage.setItem('tms_refresh_token', data.refreshToken);
  setState({
    user: data.user,
    accessToken: data.accessToken,
    isLoading: false,
    isAuthenticated: true,
  });
};

const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('tms_refresh_token');
  try {
    await authApi.logout(refreshToken);
  } catch {
    // Ignore logout API errors — clear state regardless
  }
  localStorage.removeItem('tms_refresh_token');
  setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
};

const register = async (name: string, email: string, password: string): Promise<void> => {
  setState(prev => ({ ...prev, isLoading: true }));
  const { data } = await authApi.register(name, email, password);
  localStorage.setItem('tms_refresh_token', data.refreshToken);
  setState({
    user: data.user,
    accessToken: data.accessToken,
    isLoading: false,
    isAuthenticated: true,
  });
};

const refreshToken = async (): Promise<string> => {
  const storedRefresh = localStorage.getItem('tms_refresh_token');
  const { data } = await authApi.refresh(storedRefresh!);
  localStorage.setItem('tms_refresh_token', data.refreshToken);
  setState(prev => ({ ...prev, accessToken: data.accessToken }));
  return data.accessToken;
};

const updateUser = (updates: Partial<User>): void => {
  setState(prev => ({
    ...prev,
    user: prev.user ? { ...prev.user, ...updates } : null,
  }));
};
```

### Session Restoration (on mount)

```typescript
useEffect(() => {
  const restoreSession = async () => {
    const storedRefresh = localStorage.getItem('tms_refresh_token');
    if (!storedRefresh) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    try {
      const { data } = await authApi.refresh(storedRefresh);
      localStorage.setItem('tms_refresh_token', data.refreshToken);
      // Fetch current user
      const { data: userData } = await authApi.getMe(data.accessToken);
      setState({
        user: userData,
        accessToken: data.accessToken,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem('tms_refresh_token');
      setState({ user: null, accessToken: null, isLoading: false, isAuthenticated: false });
    }
  };
  restoreSession();
}, []);
```

---

## 3. SocketContext

**File**: `src/context/SocketContext.tsx`  
**Type**: React Context + Provider

### Responsibilities
- Manages the Socket.io client instance.
- Connects when `isAuthenticated` becomes true; disconnects when it becomes false.
- Provides `on`, `off`, `emit` helpers for type-safe event handling.
- Tracks `isConnected` state.

### State Shape

```typescript
interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  on: <T>(event: string, handler: (data: T) => void) => void;
  off: <T>(event: string, handler: (data: T) => void) => void;
  emit: <T>(event: string, data?: T) => void;
}
```

### Connection Logic

```typescript
useEffect(() => {
  if (!isAuthenticated || !accessToken) {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
    return;
  }

  const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token: accessToken },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  newSocket.on('connect', () => setIsConnected(true));
  newSocket.on('disconnect', () => setIsConnected(false));
  newSocket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    setIsConnected(false);
  });

  socketRef.current = newSocket;

  return () => {
    newSocket.disconnect();
  };
}, [isAuthenticated, accessToken]);
```

---

## 4. useAuth Hook

**File**: `src/hooks/useAuth.ts`  
**Type**: Custom React Hook

### Responsibilities
- Consumes `AuthContext` and returns the full `AuthContextValue`.
- Throws a descriptive error if used outside `AuthProvider`.

### Implementation

```typescript
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your component tree with <AuthProvider>.'
    );
  }
  return context;
};
```

---

## 5. useSocket Hook

**File**: `src/hooks/useSocket.ts`  
**Type**: Custom React Hook

### Responsibilities
- Consumes `SocketContext` and returns the full `SocketContextValue`.
- Throws a descriptive error if used outside `SocketProvider`.

### Implementation

```typescript
export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error(
      'useSocket must be used within a SocketProvider. ' +
      'Wrap your component tree with <SocketProvider>.'
    );
  }
  return context;
};
```

---

## 6. usePermissions Hook

**File**: `src/hooks/usePermissions.ts`  
**Type**: Custom React Hook

### Responsibilities
- Returns permission-checking functions based on the current user's role and hierarchy.
- Reads current user from `useAuth()`.
- Reads all users from a cached users list (fetched once on mount).

### Interface

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

### Logic

```typescript
const canAssignTask = (assigneeId: string): boolean => {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.JUNIOR_MEMBER) return false;

  // TL can assign to direct TMs and their JTMs
  // TM can assign to direct JTMs
  return isInAssignableSubtree(user.id, assigneeId, allUsers);
};

const canDragNode = (draggedUserId: string): boolean => {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.TEAM_LEADER) {
    return isInOwnSubtree(user.id, draggedUserId, allUsers);
  }
  return false; // TM and JTM cannot drag
};

const canEditDocument = (docId: string): boolean => {
  // Check if user is owner or has edit permission
  // Implemented in Unit 7 — returns true for now
  return true;
};
```

---

## 7. useWorkload Hook

**File**: `src/hooks/useWorkload.ts`  
**Type**: Custom React Hook

### Responsibilities
- Provides workload color calculation utility.
- Optionally fetches workload data for all users.

### Interface

```typescript
interface UseWorkloadReturn {
  getWorkloadColor: (percentage: number) => 'green' | 'amber' | 'red';
  getWorkloadForUser: (userId: string) => WorkloadDto | undefined;
  workloadData: WorkloadDto[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
```

### getWorkloadColor Implementation

```typescript
// src/utils/workloadCalc.ts (pure function, exported separately for PBT)
export const getWorkloadColor = (percentage: number): 'green' | 'amber' | 'red' => {
  const clamped = Math.min(100, Math.max(0, percentage));
  if (clamped <= 40) return 'green';
  if (clamped <= 70) return 'amber';
  return 'red';
};
```

**Note**: `getWorkloadColor` is exported as a pure function from `utils/workloadCalc.ts` for direct PBT testing, and re-exported from the hook.

---

## 8. useNotifications Hook

**File**: `src/hooks/useNotifications.ts`  
**Type**: Custom React Hook

### Responsibilities
- Manages the in-memory notifications array.
- Subscribes to `notification:new` socket events.
- Enforces the 50-item limit.
- Provides `addNotification`, `markAllRead`, `markRead`, `clearAll` actions.

### Interface

```typescript
interface UseNotificationsReturn {
  notifications: NotificationDto[];
  unreadCount: number;
  addNotification: (notification: NotificationDto) => void;
  markAllRead: () => void;
  markRead: (notificationId: string) => void;
  clearAll: () => void;
}
```

### Implementation

```typescript
const MAX_NOTIFICATIONS = 50;

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const { on, off } = useSocket();

  const addNotification = useCallback((notification: NotificationDto) => {
    setNotifications(prev => {
      const updated = [notification, ...prev];
      return updated.length > MAX_NOTIFICATIONS
        ? updated.slice(0, MAX_NOTIFICATIONS)
        : updated;
    });
  }, []);

  useEffect(() => {
    const handler = (payload: NotificationNewPayload) => {
      addNotification(payload.notification);
    };
    on<NotificationNewPayload>('notification:new', handler);
    return () => off<NotificationNewPayload>('notification:new', handler);
  }, [on, off, addNotification]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const markRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, unreadCount, addNotification, markAllRead, markRead, clearAll };
};
```

---

## 9. Utility Functions

### 9.1 workloadCalc.ts

```typescript
// src/utils/workloadCalc.ts

export const WORKLOAD_THRESHOLDS = {
  GREEN_MAX: 40,
  AMBER_MAX: 70,
} as const;

export const MAX_CAPACITY: Record<Role, number> = {
  [Role.ADMIN]: 20,
  [Role.TEAM_LEADER]: 15,
  [Role.TEAM_MEMBER]: 10,
  [Role.JUNIOR_MEMBER]: 7,
};

export const getWorkloadColor = (percentage: number): 'green' | 'amber' | 'red' => {
  const clamped = Math.min(100, Math.max(0, percentage));
  if (clamped <= WORKLOAD_THRESHOLDS.GREEN_MAX) return 'green';
  if (clamped <= WORKLOAD_THRESHOLDS.AMBER_MAX) return 'amber';
  return 'red';
};

export const calculateWorkloadPercentage = (openTaskCount: number, role: Role): number => {
  const max = MAX_CAPACITY[role];
  return Math.min(100, Math.round((openTaskCount / max) * 100));
};
```

### 9.2 rolePermissions.ts

```typescript
// src/utils/rolePermissions.ts

export const getSubtreeIds = (userId: string, users: User[]): string[] => {
  const directReports = users.filter(u => u.supervisorId === userId);
  return directReports.flatMap(u => [u.id, ...getSubtreeIds(u.id, users)]);
};

export const isInOwnSubtree = (
  supervisorId: string,
  targetUserId: string,
  users: User[]
): boolean => {
  const subtreeIds = getSubtreeIds(supervisorId, users);
  return subtreeIds.includes(targetUserId);
};

export const isInAssignableSubtree = (
  assignerId: string,
  assigneeId: string,
  users: User[]
): boolean => {
  const assigner = users.find(u => u.id === assignerId);
  if (!assigner) return false;
  return isInOwnSubtree(assignerId, assigneeId, users);
};
```

### 9.3 formatters.ts

```typescript
// src/utils/formatters.ts

export const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const buildInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatNotificationBadge = (count: number): string => {
  if (count <= 0) return '';
  if (count > 99) return '99+';
  return count.toString();
};
```

### 9.4 constants.ts

```typescript
// src/utils/constants.ts

export const MAX_NOTIFICATIONS = 50;
export const NOTIFICATION_BADGE_MAX = 99;
export const SIDEBAR_COLLAPSED_KEY = 'tms-sidebar-collapsed';
export const THEME_KEY = 'tms-theme';
export const REFRESH_TOKEN_KEY = 'tms_refresh_token';
export const DEBOUNCE_DELAY_MS = 300;
export const AUTO_SAVE_DELAY_MS = 2000;
export const API_TIMEOUT_MS = 10000;
```
