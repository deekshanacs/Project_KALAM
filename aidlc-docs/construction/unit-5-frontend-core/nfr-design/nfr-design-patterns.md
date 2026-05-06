# NFR Design Patterns — Unit 5: Frontend Core

## Unit Overview

**Unit**: Unit 5 — Frontend Core: Auth, Layout & Dashboard  
**Phase**: Construction

---

## 1. Token Refresh Interceptor Pattern

### Pattern Name: Axios Interceptor with Retry Queue

**Problem**: Multiple concurrent API requests may all receive 401 responses when the access token expires. Naively retrying each would trigger multiple refresh calls.

**Solution**: A single refresh attempt with a queue for concurrent failed requests.

### Implementation

```typescript
// src/api/apiClient.ts

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers!['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('tms_refresh_token');
        const { data } = await axios.post<RefreshApiResponse>(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          { refreshToken }
        );

        // Update token in AuthContext via ref
        tokenRef.current = data.accessToken;
        localStorage.setItem('tms_refresh_token', data.refreshToken);

        processQueue(null, data.accessToken);

        originalRequest.headers!['Authorization'] = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        // Trigger logout
        logoutCallback();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### Key Design Decisions
- `isRefreshing` flag prevents concurrent refresh calls.
- `failedQueue` stores pending requests as promise resolvers.
- `tokenRef` is a React ref updated by AuthContext, accessible in the interceptor closure.
- `logoutCallback` is injected into the interceptor setup function to avoid circular dependencies.

---

## 2. PrivateRoute Pattern

### Pattern Name: Higher-Order Component Route Guard

**Problem**: Protected pages must redirect unauthenticated users to `/login` without flashing the protected content.

**Solution**: A wrapper component that checks auth state before rendering children.

### Implementation

```typescript
// src/components/layout/PrivateRoute.tsx

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div data-testid="private-route-loading" className="flex items-center justify-center h-screen">
        <SkeletonLoader variant="card" />
      </div>
    );
  }

  // Redirect to login, preserving the intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

### Router Configuration

```typescript
// src/main.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/" element={
    <PrivateRoute>
      <AppLayout />
    </PrivateRoute>
  }>
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="team" element={<TeamPage />} />
    <Route path="tasks" element={<TasksPage />} />
    <Route path="chat" element={<ChatPage />} />
    <Route path="ai-tools" element={<AIToolsPage />} />
    <Route path="documents" element={<DocumentsPage />} />
  </Route>
</Routes>
```

---

## 3. Optimistic UI Pattern

### Pattern Name: Optimistic State Update with Rollback

**Problem**: API calls have latency. Waiting for the server response before updating the UI feels sluggish.

**Solution**: Update local state immediately, then revert if the API call fails.

### Implementation (Status Update Example)

```typescript
const updateUserStatus = async (newStatus: AvailabilityStatus) => {
  const previousStatus = user?.availabilityStatus;

  // Optimistic update
  updateUser({ availabilityStatus: newStatus });

  try {
    await usersApi.updateStatus(user!.id, newStatus);
    // Success — optimistic state is correct, no action needed
  } catch (error) {
    // Rollback on failure
    updateUser({ availabilityStatus: previousStatus! });
    showError('Failed to update status. Please try again.');
  }
};
```

### When to Use
- Status updates (availability status)
- Notification mark-as-read
- Sidebar collapse toggle (localStorage write)

### When NOT to Use
- Task creation (need server-assigned ID)
- User registration (need server validation)
- Any operation where the server response contains new data

---

## 4. Skeleton Loader Pattern

### Pattern Name: Content Placeholder with Conditional Rendering

**Problem**: Async data fetching leaves blank spaces in the UI, causing layout shift.

**Solution**: Render skeleton placeholders that match the shape of the expected content.

### Implementation

```typescript
// Pattern: isLoading → skeleton, error → error state, data → content
const DashboardPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useDashboardData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load dashboard data"
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <TasksChart data={data.tasksByStatus} />
      <WorkloadChart data={data.workloadDistribution} />
    </div>
  );
};
```

### Skeleton Sizing Rule
Skeleton dimensions MUST match the approximate dimensions of the content they replace to prevent layout shift (CLS).

---

## 5. Error Boundary Pattern

### Pattern Name: React Class Component Error Boundary

**Problem**: Unhandled render errors crash the entire React tree.

**Solution**: Wrap each page in an ErrorBoundary that catches render errors and shows a fallback UI.

### Implementation

```typescript
// src/components/common/ErrorBoundary.tsx

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
    // In production: send to error tracking service (future enhancement)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-4">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Usage in Router

```typescript
// Each page wrapped individually
<Route path="dashboard" element={
  <ErrorBoundary>
    <DashboardPage />
  </ErrorBoundary>
} />
```

---

## 6. Dark Mode Pattern

### Pattern Name: Tailwind Dark Class with localStorage Persistence

**Problem**: Dark mode preference must persist across sessions and apply immediately on load (no flash of wrong theme).

**Solution**: Apply dark class to `<html>` element before React renders, using a script in `index.html`.

### Implementation

**Step 1: Inline script in `index.html`** (runs before React, prevents flash):
```html
<script>
  (function() {
    const theme = localStorage.getItem('tms-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

**Step 2: React hook for theme management**:
```typescript
// src/hooks/useTheme.ts
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('tms-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('tms-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
};
```

### Tailwind Dark Mode Usage
```tsx
// All components use dark: variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  ...
</div>
```

---

## 7. Context + Hook Pattern

### Pattern Name: Context Provider with Custom Hook

**Problem**: Prop drilling auth state through many component levels is unwieldy.

**Solution**: React Context provides state; custom hook provides typed access with error checking.

### Implementation

```typescript
// src/context/AuthContext.tsx
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // ... implementation

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, refreshToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// src/hooks/useAuth.ts
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Provider Nesting Order

```typescript
// src/main.tsx
<BrowserRouter>
  <AuthProvider>
    <SocketProvider>
      <App />
    </SocketProvider>
  </AuthProvider>
</BrowserRouter>
```

**Note**: `SocketProvider` is nested inside `AuthProvider` because it depends on `useAuth()` to get the access token.
