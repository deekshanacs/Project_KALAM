# Logical Components — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction

---

## 1. useOrgChart Hook

**File**: `src/hooks/useOrgChart.ts`  
**Type**: Custom React Hook

### Responsibilities
- Fetches all users from `GET /api/users`.
- Builds the org tree structure using `buildOrgTree`.
- Manages drag-and-drop state (activeDragId, draggedSubtreeIds).
- Handles drop events: validates permission, calls API, optimistic update.
- Subscribes to `user:status-change` and `user:workload-update` socket events.

### Interface

```typescript
interface UseOrgChartReturn {
  orgTree: OrgTreeNode[];
  allUsers: User[];
  workloadData: WorkloadDto[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;

  // Drag state
  activeDragId: string | null;
  draggedSubtreeIds: Set<string>;

  // Drag handlers
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;

  // Drop validation
  canDrop: (draggedId: string, targetId: string) => boolean;
}
```

### Implementation Sketch

```typescript
export const useOrgChart = (): UseOrgChartReturn => {
  const { user: currentUser } = useAuth();
  const { on, off } = useSocket();
  const { canDragNode } = usePermissions();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Memoized tree
  const orgTree = useMemo(() => buildOrgTree(allUsers), [allUsers]);

  // Memoized subtree IDs for active drag
  const draggedSubtreeIds = useMemo(() => {
    if (!activeDragId) return new Set<string>();
    return new Set(getSubtreeIds(activeDragId, allUsers));
  }, [activeDragId, allUsers]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, workloadRes] = await Promise.all([
        usersApi.getUsers(),
        usersApi.getWorkloadData(),
      ]);
      setAllUsers(usersRes.data);
      setWorkloadData(workloadRes.data);
    } catch (err) {
      setError('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Socket subscriptions
  useEffect(() => {
    const handleStatusChange = (payload: UserStatusChangePayload) => {
      setAllUsers(prev =>
        prev.map(u => u.id === payload.userId
          ? { ...u, availabilityStatus: payload.status }
          : u
        )
      );
    };

    const handleWorkloadUpdate = (payload: UserWorkloadUpdatePayload) => {
      setWorkloadData(prev =>
        prev.map(w => w.userId === payload.userId
          ? { ...w, workloadPercentage: payload.workloadPercentage }
          : w
        )
      );
    };

    on('user:status-change', handleStatusChange);
    on('user:workload-update', handleWorkloadUpdate);
    return () => {
      off('user:status-change', handleStatusChange);
      off('user:workload-update', handleWorkloadUpdate);
    };
  }, [on, off]);

  const canDrop = useCallback((draggedId: string, targetId: string): boolean => {
    if (draggedId === targetId) return false;
    if (draggedSubtreeIds.has(targetId)) return false;
    return canDragNode(draggedId);
  }, [draggedSubtreeIds, canDragNode]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || !canDrop(active.id as string, over.id as string)) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;
    const previousUsers = [...allUsers];

    // Optimistic update
    setAllUsers(prev =>
      prev.map(u => u.id === draggedId ? { ...u, supervisorId: targetId } : u)
    );

    try {
      await usersApi.updateSupervisor(draggedId, targetId);
    } catch {
      setAllUsers(previousUsers);
      showError('Failed to move team member. Change reverted.');
    }
  }, [allUsers, canDrop]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  return {
    orgTree, allUsers, workloadData, isLoading, error, refetch: fetchUsers,
    activeDragId, draggedSubtreeIds,
    handleDragStart, handleDragEnd, handleDragCancel, canDrop,
  };
};
```

---

## 2. useKanban Hook

**File**: `src/hooks/useKanban.ts`  
**Type**: Custom React Hook

### Responsibilities
- Fetches tasks from `GET /api/tasks` with current filters.
- Groups tasks by status into `tasksByStatus`.
- Handles drag-and-drop between columns (status update).
- Handles drag within column (reorder — local only).
- Subscribes to `task:assigned` and `task:updated` socket events.

### Interface

```typescript
interface UseKanbanReturn {
  tasksByStatus: Record<TaskStatus, Task[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;

  // Drag handlers
  activeDragId: string | null;
  activeTask: Task | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}
```

### Implementation Sketch

```typescript
export const useKanban = (filters: TaskFilters): UseKanbanReturn => {
  const { user: currentUser } = useAuth();
  const { on, off } = useSocket();

  const [tasksByStatus, setTasksByStatus] = useState<Record<TaskStatus, Task[]>>({
    TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Fetch tasks when filters change
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const { data } = await tasksApi.getTasks(filters);
        const grouped = groupTasksByStatus(data);
        setTasksByStatus(grouped);
      } catch {
        setError('Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, [filters]);

  // Socket: task assigned to current user
  useEffect(() => {
    const handleTaskAssigned = (payload: TaskAssignedPayload) => {
      if (payload.assigneeId === currentUser?.id) {
        setTasksByStatus(prev => ({
          ...prev,
          TODO: [payload.task, ...prev.TODO],
        }));
      }
    };

    const handleTaskUpdated = (payload: TaskUpdatedPayload) => {
      setTasksByStatus(prev => mergeTaskUpdate(prev, payload.task));
    };

    on('task:assigned', handleTaskAssigned);
    on('task:updated', handleTaskUpdated);
    return () => {
      off('task:assigned', handleTaskAssigned);
      off('task:updated', handleTaskUpdated);
    };
  }, [on, off, currentUser?.id]);

  // ... drag handlers (see nfr-design-patterns.md)

  return {
    tasksByStatus, isLoading, error, refetch: () => {},
    activeDragId, activeTask,
    handleDragStart, handleDragOver, handleDragEnd, handleDragCancel,
  };
};
```

---

## 3. useTaskFilters Hook

**File**: `src/hooks/useTaskFilters.ts`  
**Type**: Custom React Hook

### Responsibilities
- Manages filter state.
- Debounces text search (300ms).
- Provides filter reset function.
- Returns current filters for use by `useKanban`.

### Interface

```typescript
interface UseTaskFiltersReturn {
  filters: TaskFilters;
  debouncedFilters: TaskFilters; // use this for API calls
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}
```

### Implementation

```typescript
const DEFAULT_FILTERS: TaskFilters = {
  assigneeId: null,
  priority: null,
  projectId: null,
  dueDateFrom: null,
  dueDateTo: null,
  search: '',
};

export const useTaskFilters = (): UseTaskFiltersReturn => {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search only
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, DEBOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const debouncedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch,
  }), [filters, debouncedSearch]);

  const setFilter = useCallback(<K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'search') return value !== '';
      return value !== null;
    });
  }, [filters]);

  return { filters, debouncedFilters, setFilter, resetFilters, hasActiveFilters };
};
```

---

## 4. buildOrgTree Pure Function

**File**: `src/utils/orgTree.ts`  
**Type**: Pure Function

### Signature

```typescript
export const buildOrgTree = (users: User[]): OrgTreeNode[];
```

### Algorithm

```typescript
export const buildOrgTree = (users: User[]): OrgTreeNode[] => {
  if (users.length === 0) return [];

  const userMap = new Map(users.map(u => [u.id, u]));
  const userIds = new Set(users.map(u => u.id));

  // Find roots: users with no supervisor OR supervisor not in the list
  const roots = users.filter(u =>
    !u.supervisorId || !userIds.has(u.supervisorId)
  );

  const buildNode = (user: User, depth: number): OrgTreeNode => {
    const children = users
      .filter(u => u.supervisorId === user.id)
      .sort((a, b) => a.name.localeCompare(b.name)) // stable sort
      .map(child => buildNode(child, depth + 1));

    const subtreeIds = children.flatMap(c => [c.user.id, ...c.subtreeIds]);

    return { user, children, depth, subtreeIds };
  };

  return roots
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(root => buildNode(root, 0));
};
```

### Properties
- **Pure**: No side effects. Same input always produces same output.
- **Handles cycles**: If a cycle exists in the data (supervisorId chain loops), the algorithm will not infinite-loop because it only traverses each user once (users are filtered by `supervisorId === parentId`, not recursively followed).
- **Handles orphans**: Users whose supervisor is not in the list are treated as roots.

---

## 5. getSubtreeIds Pure Function

**File**: `src/utils/orgTree.ts`  
**Type**: Pure Function

### Signature

```typescript
export const getSubtreeIds = (userId: string, users: User[]): string[];
```

### Algorithm

```typescript
export const getSubtreeIds = (userId: string, users: User[]): string[] => {
  const directReports = users.filter(u => u.supervisorId === userId);
  return directReports.flatMap(u => [u.id, ...getSubtreeIds(u.id, users)]);
};
```

### Properties
- **Pure**: No side effects.
- **Does NOT include userId itself**: Returns only descendants, not the node itself.
- **Handles empty**: Returns `[]` if user has no reports.
- **Testable**: PBT-U6-04 verifies userId is never in the result.

---

## 6. applyTaskFilters Pure Function

**File**: `src/utils/taskFilters.ts`  
**Type**: Pure Function

### Signature

```typescript
export const applyTaskFilters = (tasks: Task[], filters: TaskFilters): Task[];
```

### Algorithm

```typescript
export const applyTaskFilters = (tasks: Task[], filters: TaskFilters): Task[] => {
  return tasks.filter(task => {
    if (filters.assigneeId && task.assigneeId !== filters.assigneeId) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.projectId && task.projectId !== filters.projectId) return false;
    if (filters.dueDateFrom && task.dueDate && task.dueDate < filters.dueDateFrom) return false;
    if (filters.dueDateTo && task.dueDate && task.dueDate > filters.dueDateTo) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!task.title.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  });
};
```

### Properties
- **Pure**: No side effects.
- **Subset invariant**: Result is always a subset of input (PBT-U6-02).
- **AND logic**: All active filters must match.

---

## 7. groupTasksByStatus Pure Function

**File**: `src/utils/taskFilters.ts`  
**Type**: Pure Function

### Signature

```typescript
export const groupTasksByStatus = (tasks: Task[]): Record<TaskStatus, Task[]>;
```

### Algorithm

```typescript
export const groupTasksByStatus = (tasks: Task[]): Record<TaskStatus, Task[]> => {
  const grouped: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };
  tasks.forEach(task => {
    grouped[task.status].push(task);
  });
  return grouped;
};
```

---

## 8. mergeTaskUpdate Pure Function

**File**: `src/utils/taskFilters.ts`  
**Type**: Pure Function

### Signature

```typescript
export const mergeTaskUpdate = (
  tasksByStatus: Record<TaskStatus, Task[]>,
  updatedTask: Task
): Record<TaskStatus, Task[]>;
```

### Algorithm

```typescript
export const mergeTaskUpdate = (
  tasksByStatus: Record<TaskStatus, Task[]>,
  updatedTask: Task
): Record<TaskStatus, Task[]> => {
  const newState = { ...tasksByStatus };

  // Remove task from all columns
  for (const status of Object.keys(newState) as TaskStatus[]) {
    newState[status] = newState[status].filter(t => t.id !== updatedTask.id);
  }

  // Add to correct column
  newState[updatedTask.status] = [...newState[updatedTask.status], updatedTask];

  return newState;
};
```
