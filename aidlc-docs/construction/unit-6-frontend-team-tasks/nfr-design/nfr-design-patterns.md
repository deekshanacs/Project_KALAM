# NFR Design Patterns — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction

---

## 1. Optimistic Drag-and-Drop Pattern

### Pattern Name: Optimistic Update with Rollback on Drag End

**Problem**: API calls for drag-and-drop (supervisor update, task status update) have latency. Waiting for the server response before updating the UI makes drag-and-drop feel unresponsive.

**Solution**: Update local state immediately on drag end, then revert if the API call fails.

### Implementation (Org Chart)

```typescript
// In useOrgChart hook
const handleDrop = async (draggedUserId: string, targetUserId: string) => {
  // Capture previous state for rollback
  const previousUsers = [...users];

  // Optimistic update: change supervisorId in local state
  setUsers(prev =>
    prev.map(u =>
      u.id === draggedUserId ? { ...u, supervisorId: targetUserId } : u
    )
  );

  try {
    await usersApi.updateSupervisor(draggedUserId, targetUserId);
    // Success — optimistic state is correct
    // Optionally refetch to get fresh data
  } catch (error) {
    // Rollback: restore previous state
    setUsers(previousUsers);
    showError(`Failed to move ${draggedUser.name}. Change reverted.`);
  }
};
```

### Implementation (Kanban)

```typescript
// In useKanban hook
const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
  const previousTasksByStatus = { ...tasksByStatus };

  // Optimistic update: move task to new column
  setTasksByStatus(prev => {
    const task = findTaskById(taskId, prev);
    if (!task) return prev;

    const updated = { ...prev };
    // Remove from old column
    updated[task.status] = updated[task.status].filter(t => t.id !== taskId);
    // Add to new column
    updated[newStatus] = [...updated[newStatus], { ...task, status: newStatus }];
    return updated;
  });

  try {
    await tasksApi.updateTaskStatus(taskId, newStatus);
  } catch (error) {
    // Rollback
    setTasksByStatus(previousTasksByStatus);
    showError('Failed to update task status. Change reverted.');
  }
};
```

### Key Design Decisions
- Always capture previous state BEFORE the optimistic update.
- Rollback is synchronous (no async needed).
- Show a toast on rollback so the user knows what happened.
- Do NOT show a loading spinner during optimistic updates (defeats the purpose).

---

## 2. Virtual List Pattern

### Pattern Name: Windowed List for Large Task Columns

**Problem**: Rendering 200 TaskCard components in a Kanban column creates 200 DOM nodes, causing slow initial render and scroll jank.

**Solution**: Use `react-window` to render only the visible items.

### Implementation

```typescript
import { FixedSizeList } from 'react-window';

// In KanbanColumn (when tasks.length > 50)
const TASK_CARD_HEIGHT = 120; // px — must match actual TaskCard height
const COLUMN_MAX_HEIGHT = 600; // px

const VirtualTaskList: React.FC<{ tasks: Task[]; onTaskClick: (id: string) => void }> = ({
  tasks,
  onTaskClick,
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TaskCard
        task={tasks[index]}
        onClick={onTaskClick}
      />
    </div>
  );

  return (
    <FixedSizeList
      height={Math.min(COLUMN_MAX_HEIGHT, tasks.length * TASK_CARD_HEIGHT)}
      itemCount={tasks.length}
      itemSize={TASK_CARD_HEIGHT}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### Threshold
- Use regular rendering for columns with ≤ 50 tasks.
- Switch to virtual list for columns with > 50 tasks.
- This avoids the complexity of virtual list + @dnd-kit integration for the common case.

### @dnd-kit + Virtual List Caveat
When using virtual lists with @dnd-kit, the dragged item may not be in the DOM if it's scrolled out of view. The `DragOverlay` pattern solves this: the overlay renders a clone of the dragged item at the cursor position, independent of the list.

---

## 3. Subtree Calculation Memoization Pattern

### Pattern Name: Memoized Subtree IDs

**Problem**: `getSubtreeIds` is called for every ProfileCard on every render to determine if a card is in the dragged subtree. With 50 nodes, this is 50 recursive traversals per render.

**Solution**: Compute subtree IDs once on drag start and memoize the result.

### Implementation

```typescript
// In OrgChart component
const [activeDragId, setActiveDragId] = useState<string | null>(null);

// Memoize subtree IDs — only recompute when activeDragId changes
const draggedSubtreeIds = useMemo(() => {
  if (!activeDragId) return new Set<string>();
  return new Set(getSubtreeIds(activeDragId, allUsers));
}, [activeDragId, allUsers]);

// Pass to ProfileCard via context (avoid prop drilling)
const OrgChartContext = createContext<{
  activeDragId: string | null;
  draggedSubtreeIds: Set<string>;
}>({ activeDragId: null, draggedSubtreeIds: new Set() });
```

### Why Set instead of Array?
`Set.has()` is O(1) vs `Array.includes()` which is O(n). With 50 nodes, this is a minor optimization, but it's a good practice.

---

## 4. Real-Time Merge Pattern

### Pattern Name: In-Place State Merge on Socket Event

**Problem**: On `task:updated` socket event, refetching all tasks is wasteful. We only need to update the one changed task.

**Solution**: Merge the updated task into existing state without a full refetch.

### Implementation

```typescript
// In useKanban hook
const mergeUpdatedTask = useCallback((updatedTask: Task) => {
  setTasksByStatus(prev => {
    const newState = { ...prev };

    // Find and remove task from its current column
    let oldStatus: TaskStatus | null = null;
    for (const status of Object.keys(newState) as TaskStatus[]) {
      const idx = newState[status].findIndex(t => t.id === updatedTask.id);
      if (idx !== -1) {
        oldStatus = status;
        newState[status] = [...newState[status]];
        newState[status].splice(idx, 1);
        break;
      }
    }

    // Add to new column (may be same column if only non-status fields changed)
    newState[updatedTask.status] = [
      ...newState[updatedTask.status],
      updatedTask,
    ];

    return newState;
  });
}, []);

// Socket event handler
useEffect(() => {
  const handler = (payload: TaskUpdatedPayload) => {
    mergeUpdatedTask(payload.task);
  };
  on('task:updated', handler);
  return () => off('task:updated', handler);
}, [on, off, mergeUpdatedTask]);
```

### Conflict Resolution
If the user is currently editing a task in TaskModal when a `task:updated` event arrives for the same task:
- Do NOT overwrite the form state (user's edits take priority).
- Update the Kanban board state (background update).
- Show a subtle "This task was updated by someone else" banner in the modal.

---

## 5. Memoized ProfileCard Pattern

### Pattern Name: React.memo with Custom Comparison

**Problem**: When any user's workload changes (socket event), all 50 ProfileCards re-render even though only one changed.

**Solution**: Wrap ProfileCard in `React.memo` with a custom comparison function.

### Implementation

```typescript
const ProfileCard = React.memo<ProfileCardProps>(
  ({ user, workload, isBeingDragged, isInDraggedSubtree, onClick }) => {
    // ... component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if these specific props changed
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.availabilityStatus === nextProps.user.availabilityStatus &&
      prevProps.user.supervisorId === nextProps.user.supervisorId &&
      prevProps.workload?.workloadPercentage === nextProps.workload?.workloadPercentage &&
      prevProps.isBeingDragged === nextProps.isBeingDragged &&
      prevProps.isInDraggedSubtree === nextProps.isInDraggedSubtree
    );
  }
);
```

---

## 6. Debounced Filter Pattern

### Pattern Name: Controlled Input with Debounced API Call

**Problem**: Typing in the search filter triggers an API call on every keystroke, causing excessive requests.

**Solution**: Update controlled input state immediately (for responsive UI), but debounce the API call.

### Implementation

```typescript
// In useTaskFilters hook
const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

// Debounce only the search field
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(filters.search);
  }, DEBOUNCE_DELAY_MS); // 300ms

  return () => clearTimeout(timer);
}, [filters.search]);

// API call uses debouncedSearch, not filters.search
const { data: tasks } = useQuery({
  queryKey: ['tasks', { ...filters, search: debouncedSearch }],
  queryFn: () => tasksApi.getTasks({ ...filters, search: debouncedSearch }),
});
```

### Why not debounce all filters?
Dropdown filters (assignee, priority) should respond immediately — the user has already made a deliberate selection. Only text input benefits from debouncing.
