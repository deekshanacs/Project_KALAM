# Frontend Component Specifications — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction

---

## 1. TeamPage

**File**: `src/pages/Team.tsx`  
**Route**: `/team` (protected)  
**Component Type**: Page

### Props Interface
```typescript
// No props — page component
```

### State
```typescript
interface TeamPageState {
  selectedUserId: string | null;  // for ProfileDrawer
  isDrawerOpen: boolean;
}
// Org chart data managed by useOrgChart hook
```

### Key Behaviors
1. Renders page title "Team" with member count.
2. Renders `<OrgChart>` as the main content.
3. Manages `selectedUserId` state — passed to `<ProfileDrawer>`.
4. `<ProfileDrawer>` is rendered at page level (not inside OrgChart) to avoid z-index issues.
5. Framer Motion page enter animation.
6. Skeleton loader while users are loading.
7. Error state with retry button on fetch failure.

### data-testid Attributes
```
data-testid="team-page"
data-testid="team-page-title"
data-testid="team-member-count"
data-testid="team-loading-skeleton"
data-testid="team-error-state"
```

---

## 2. OrgChart

**File**: `src/components/team/OrgChart.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface OrgChartProps {
  nodes: OrgTreeNode[];
  onNodeClick: (userId: string) => void;
  'data-testid'?: string;
}
```

### State
```typescript
interface OrgChartState {
  activeDragId: string | null;
  activeNode: OrgTreeNode | null;
}
```

### Key Behaviors
1. Wraps entire tree in `<DndContext>` from @dnd-kit/core.
2. Configures `PointerSensor` with activation constraint (8px movement threshold to distinguish click from drag).
3. Renders tree recursively using `OrgTreeLevel` sub-component.
4. On `dragStart`: sets `activeDragId`, computes subtree IDs.
5. On `dragEnd`: calls `useOrgChart().handleDrop(draggedId, targetId)`.
6. Renders `<DragOverlay>` with a ghost `<ProfileCard>` while dragging.
7. Passes `activeDragId` and `subtreeIds` down to all `ProfileCard` nodes via context.
8. Connecting lines between parent and children rendered as SVG or CSS borders.

### data-testid Attributes
```
data-testid="org-chart"
data-testid="org-chart-dnd-context"
data-testid="org-chart-drag-overlay"
```

---

## 3. ProfileCard

**File**: `src/components/team/ProfileCard.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface ProfileCardProps {
  user: User;
  workload: WorkloadDto | undefined;
  isBeingDragged?: boolean;
  isInDraggedSubtree?: boolean;
  onClick: (userId: string) => void;
  'data-testid'?: string;
}
```

### State
```typescript
// No local state — controlled by parent
// useDraggable hook provides drag state
```

### Key Behaviors
1. Uses `useDraggable({ id: user.id })` from @dnd-kit/core.
2. Uses `useDroppable({ id: user.id })` from @dnd-kit/core.
3. **Drag handle**: small `<GripVertical>` icon in top-right corner. Only the handle initiates drag (not the whole card).
4. **Keyboard alternative**: `<MoveVertical>` button with `aria-label="Move {user.name}"` that opens a "Move to" dropdown — satisfies accessibility requirement for drag-and-drop.
5. Card content:
   - `<Avatar>` with status ring (lg size)
   - User name (bold)
   - `<RoleBadge>`
   - Current project name (if any)
   - `<WorkloadBar>` with percentage
6. When `isBeingDragged=true`: opacity 0.4, dashed border.
7. When `isInDraggedSubtree=true`: opacity 0.6.
8. When `isOver` (drop target): green border highlight.
9. Clicking card body (not drag handle): calls `onClick(user.id)`.
10. Hover: subtle shadow increase (Framer Motion `whileHover`).

### data-testid Attributes
```
data-testid={`profile-card-${user.id}`}
data-testid="profile-card-drag-handle"
data-testid="profile-card-move-button"
data-testid="profile-card-avatar"
data-testid="profile-card-name"
data-testid="profile-card-role-badge"
data-testid="profile-card-workload-bar"
```

---

## 4. ProfileDrawer

**File**: `src/components/team/ProfileDrawer.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface ProfileDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  'data-testid'?: string;
}
```

### State
```typescript
interface ProfileDrawerState {
  user: User | null;
  workload: WorkloadDto | null;
  recentTasks: Task[];
  isLoading: boolean;
  isAssignTaskModalOpen: boolean;
}
```

### Key Behaviors
1. Framer Motion slide-in from right: `initial={{ x: 400, opacity: 0 }}`, `animate={{ x: 0, opacity: 1 }}`, `exit={{ x: 400, opacity: 0 }}`, `transition={{ duration: 0.25, ease: 'easeOut' }}`.
2. Wrapped in `<AnimatePresence>` for exit animation.
3. Fixed position, right side of screen, full height, width 400px.
4. Backdrop overlay (semi-transparent) behind drawer; clicking backdrop calls `onClose`.
5. Fetches user data when `userId` changes and `isOpen=true`.
6. **Availability status dropdown**: editable if viewer is Admin OR viewer is the user themselves.
7. **[Assign Task] button**: shown only if `canAssignTask(userId)` returns true.
8. **[Chat] button**: always shown; navigates to `/chat?userId={userId}`.
9. **Recent tasks**: last 5 tasks assigned to this user, shown as mini cards with status badge.
10. **Work progress**: "X / Y tasks completed" with a progress bar.
11. Focus trap: keyboard focus stays within drawer when open.
12. Escape key closes drawer.

### data-testid Attributes
```
data-testid="profile-drawer"
data-testid="profile-drawer-backdrop"
data-testid="profile-drawer-close"
data-testid="profile-drawer-avatar"
data-testid="profile-drawer-name"
data-testid="profile-drawer-role-badge"
data-testid="profile-drawer-status-dropdown"
data-testid="profile-drawer-workload-bar"
data-testid="profile-drawer-work-progress"
data-testid="profile-drawer-recent-tasks"
data-testid="profile-drawer-assign-task-button"
data-testid="profile-drawer-chat-button"
```

---

## 5. WorkloadBar (Reused from Unit 5)

**File**: `src/components/common/WorkloadBar.tsx`  
**Note**: Defined in Unit 5. Reused without modification in Unit 6.

See Unit 5 frontend-components.md for full specification.

---

## 6. TasksPage

**File**: `src/pages/Tasks.tsx`  
**Route**: `/tasks` (protected)  
**Component Type**: Page

### Props Interface
```typescript
// No props — page component
```

### State
```typescript
interface TasksPageState {
  selectedTaskId: string | null;  // for TaskModal in edit mode
  isCreateModalOpen: boolean;
}
// Task data managed by useKanban hook
// Filter state managed by useTaskFilters hook
```

### Key Behaviors
1. Renders page title "Tasks" with total task count.
2. Renders `<FilterBar>` above the Kanban board.
3. Renders `<KanbanBoard>` as main content.
4. [+ New Task] button in top-right opens TaskModal in create mode.
5. Clicking a TaskCard opens TaskModal in edit mode.
6. Framer Motion page enter animation.
7. Skeleton loader while tasks are loading.

### data-testid Attributes
```
data-testid="tasks-page"
data-testid="tasks-page-title"
data-testid="tasks-new-task-button"
data-testid="tasks-loading-skeleton"
data-testid="tasks-error-state"
```

---

## 7. KanbanBoard

**File**: `src/components/tasks/KanbanBoard.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface KanbanBoardProps {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onTaskClick: (taskId: string) => void;
  onDragEnd: (taskId: string, newStatus: TaskStatus) => void;
  'data-testid'?: string;
}
```

### State
```typescript
interface KanbanBoardState {
  activeDragId: string | null;
  activeTask: Task | null;
}
```

### Key Behaviors
1. Wraps all columns in `<DndContext>` with `PointerSensor` and `KeyboardSensor`.
2. Renders 4 `<KanbanColumn>` components side by side (horizontal scroll on mobile).
3. On `dragStart`: sets `activeDragId` and `activeTask`.
4. On `dragEnd`: determines new column from `over.id`, calls `onDragEnd(taskId, newStatus)`.
5. Renders `<DragOverlay>` with ghost `<TaskCard>` while dragging.
6. Columns have equal width, flex layout.

### data-testid Attributes
```
data-testid="kanban-board"
data-testid="kanban-board-dnd-context"
data-testid="kanban-drag-overlay"
```

---

## 8. KanbanColumn

**File**: `src/components/tasks/KanbanColumn.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  'data-testid'?: string;
}
```

### State
```typescript
// No local state — controlled by parent
// useDroppable provides isOver state
```

### Key Behaviors
1. Uses `useDroppable({ id: status })` to make column a drop target.
2. Wraps task list in `<SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>`.
3. Column header: colored dot + label + task count badge.
4. Task list: scrollable, renders `<TaskCard>` for each task.
5. When `isOver=true`: column background highlights (light blue tint).
6. Empty state: "No tasks" placeholder when column is empty.
7. Column max-height with overflow-y-auto for scrolling.

### data-testid Attributes
```
data-testid={`kanban-column-${status.toLowerCase()}`}
data-testid={`kanban-column-${status.toLowerCase()}-header`}
data-testid={`kanban-column-${status.toLowerCase()}-count`}
data-testid={`kanban-column-${status.toLowerCase()}-task-list`}
data-testid={`kanban-column-${status.toLowerCase()}-empty`}
```

---

## 9. TaskCard

**File**: `src/components/tasks/TaskCard.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface TaskCardProps {
  task: Task;
  onClick: (taskId: string) => void;
  'data-testid'?: string;
}
```

### State
```typescript
// No local state
// useSortable provides drag state
```

### Key Behaviors
1. Uses `useSortable({ id: task.id })` from @dnd-kit/sortable.
2. Card content:
   - Priority badge (color-coded pill)
   - Task title (truncated to 2 lines)
   - Due date (formatted, red if overdue)
   - Assignee avatar (sm size, with name tooltip)
   - Attachment count icon (if > 0)
   - Comment count icon (if > 0)
3. **Priority colors**:
   - LOW: `bg-gray-100 text-gray-600`
   - MEDIUM: `bg-blue-100 text-blue-700`
   - HIGH: `bg-orange-100 text-orange-700`
   - URGENT: `bg-red-100 text-red-700`
4. Hover: shadow increase, slight scale (Framer Motion `whileHover={{ scale: 1.01 }}`).
5. Clicking card (not drag): calls `onClick(task.id)`.
6. When dragging: opacity 0.5, dashed border.
7. Overdue indicator: red due date text + warning icon.

### data-testid Attributes
```
data-testid={`task-card-${task.id}`}
data-testid="task-card-priority-badge"
data-testid="task-card-title"
data-testid="task-card-due-date"
data-testid="task-card-assignee-avatar"
data-testid="task-card-attachment-count"
data-testid="task-card-comment-count"
```

---

## 10. TaskModal

**File**: `src/components/tasks/TaskModal.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface TaskModalProps {
  mode: 'create' | 'edit';
  task?: Task;                    // required in edit mode
  defaultAssigneeId?: string;     // pre-fill assignee (from ProfileDrawer)
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  'data-testid'?: string;
}
```

### State
```typescript
interface TaskModalState {
  isSubmitting: boolean;
  activeTab: 'details' | 'comments' | 'time-logs';
  uploadingFiles: boolean;
}
// Form state managed by react-hook-form + Zod
```

### Key Behaviors
1. Renders as a Radix UI Dialog (shadcn/ui `<Dialog>`).
2. Tabs: "Details" | "Comments" | "Time Logs" (tabs only shown in edit mode).
3. **Details tab**:
   - Title input (required)
   - Description textarea
   - Priority select (LOW/MEDIUM/HIGH/URGENT)
   - Due date input (date picker)
   - Assignee dropdown (filtered by `canAssignTask`)
   - File attachments (upload + list)
4. **Assignee dropdown**: shows only users the current user can assign to. Filtered by `usePermissions().canAssignTask(userId)`.
5. **File upload**: click or drag to upload; calls `POST /api/upload`; shows upload progress.
6. **Comments tab**: renders `<CommentThread taskId={task.id} />`.
7. **Time Logs tab**: renders `<TimeLogSection taskId={task.id} />`.
8. Submit button: "Create Task" (create mode) or "Save Changes" (edit mode).
9. Delete button (edit mode only): shown for Admin/TL; calls `DELETE /api/tasks/{taskId}`.
10. Zod validation on submit.

### data-testid Attributes
```
data-testid="task-modal"
data-testid="task-modal-title-input"
data-testid="task-modal-description-input"
data-testid="task-modal-priority-select"
data-testid="task-modal-due-date-input"
data-testid="task-modal-assignee-dropdown"
data-testid="task-modal-file-upload"
data-testid="task-modal-attachments-list"
data-testid="task-modal-tab-details"
data-testid="task-modal-tab-comments"
data-testid="task-modal-tab-time-logs"
data-testid="task-modal-submit-button"
data-testid="task-modal-delete-button"
data-testid="task-modal-cancel-button"
```

---

## 11. FilterBar

**File**: `src/components/tasks/FilterBar.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface FilterBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  users: User[];
  'data-testid'?: string;
}
```

### State
```typescript
// No local state — fully controlled
// Debounce handled in useTaskFilters hook
```

### Key Behaviors
1. Renders filter controls in a horizontal row.
2. **Search input**: text search on task title; debounced 300ms.
3. **Assignee filter**: dropdown of all users with avatars.
4. **Priority filter**: dropdown of Priority values.
5. **Date range**: from/to date inputs.
6. **[Clear Filters] button**: shown when any filter is active; resets all filters.
7. Active filter count badge on a "Filters" button (mobile: collapses to this button).
8. All filter changes call `onFiltersChange` immediately (debounce is in the hook).

### data-testid Attributes
```
data-testid="filter-bar"
data-testid="filter-bar-search"
data-testid="filter-bar-assignee"
data-testid="filter-bar-priority"
data-testid="filter-bar-date-from"
data-testid="filter-bar-date-to"
data-testid="filter-bar-clear"
data-testid="filter-bar-active-count"
```

---

## 12. CommentThread

**File**: `src/components/tasks/CommentThread.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface CommentThreadProps {
  taskId: string;
  'data-testid'?: string;
}
```

### State
```typescript
interface CommentThreadState {
  comments: TaskComment[];
  isLoading: boolean;
  newCommentText: string;
  isSubmitting: boolean;
}
```

### Key Behaviors
1. Fetches comments on mount: `GET /api/tasks/{taskId}/comments`.
2. Renders list of comments (oldest first).
3. Each comment: avatar + name + relative time + content.
4. Comment input at bottom: textarea + [Send] button.
5. On send: `POST /api/tasks/{taskId}/comments { content }`.
6. Optimistic add: prepend comment with pending state.
7. Empty state: "No comments yet. Be the first to comment."
8. Skeleton loader while loading.

### data-testid Attributes
```
data-testid="comment-thread"
data-testid="comment-list"
data-testid="comment-item-{id}"
data-testid="comment-input"
data-testid="comment-send-button"
data-testid="comment-empty-state"
data-testid="comment-loading"
```

---

## 13. TimeLogSection

**File**: `src/components/tasks/TimeLogSection.tsx`  
**Component Type**: Feature

### Props Interface
```typescript
interface TimeLogSectionProps {
  taskId: string;
  'data-testid'?: string;
}
```

### State
```typescript
interface TimeLogSectionState {
  timeLogs: TimeLog[];
  isLoading: boolean;
  hoursInput: string;
  descriptionInput: string;
  isSubmitting: boolean;
}
```

### Key Behaviors
1. Fetches time logs on mount: `GET /api/tasks/{taskId}/time-logs`.
2. Renders list of time logs (newest first).
3. Each log: user avatar + name + hours + description + date.
4. Total time logged displayed at top: "Total: X hours Y minutes".
5. Log time form: hours input (number, min 0.25, step 0.25) + description textarea + [Log Time] button.
6. On submit: `POST /api/tasks/{taskId}/time-logs { minutes: hours * 60, description }`.
7. Validation: hours must be > 0.
8. Empty state: "No time logged yet."

### data-testid Attributes
```
data-testid="time-log-section"
data-testid="time-log-total"
data-testid="time-log-list"
data-testid="time-log-item-{id}"
data-testid="time-log-hours-input"
data-testid="time-log-description-input"
data-testid="time-log-submit-button"
data-testid="time-log-empty-state"
```
