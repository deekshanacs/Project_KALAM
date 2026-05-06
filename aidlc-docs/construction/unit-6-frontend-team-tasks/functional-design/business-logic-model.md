# Business Logic Model — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction  
**Components**: FC-03 (OrgChartModule), FC-04 (TaskModule)  
**Stories**: US-ORG-01 through US-ORG-04, US-TASK-01 through US-TASK-06

---

## 1. Org Chart Architecture

### 1.1 Data Model

The org chart is built from a flat array of `User` objects, each with a `supervisorId` field. The `buildOrgTree` function converts this flat array into a nested tree structure.

```typescript
interface OrgTreeNode {
  user: User;
  children: OrgTreeNode[];
  depth: number;
  subtreeIds: string[]; // all descendant IDs (memoized)
}
```

### 1.2 Tree Building Algorithm

```typescript
// src/utils/orgTree.ts

export const buildOrgTree = (users: User[]): OrgTreeNode[] => {
  // Find root nodes (no supervisor or supervisor not in list)
  const userIds = new Set(users.map(u => u.id));
  const roots = users.filter(u => !u.supervisorId || !userIds.has(u.supervisorId));

  const buildNode = (user: User, depth: number): OrgTreeNode => {
    const children = users
      .filter(u => u.supervisorId === user.id)
      .map(child => buildNode(child, depth + 1));

    const subtreeIds = children.flatMap(c => [c.user.id, ...c.subtreeIds]);

    return { user, children, depth, subtreeIds };
  };

  return roots.map(root => buildNode(root, 0));
};

export const getSubtreeIds = (userId: string, users: User[]): string[] => {
  const directReports = users.filter(u => u.supervisorId === userId);
  return directReports.flatMap(u => [u.id, ...getSubtreeIds(u.id, users)]);
};
```

### 1.3 Tree Rendering

The `OrgChart` component renders the tree recursively:

```
OrgChart
  └── OrgTreeLevel (root nodes)
        └── ProfileCard (node)
              └── OrgTreeLevel (children, indented)
                    └── ProfileCard (child node)
                          └── ...
```

Layout: Horizontal tree (parent above, children below, connected by SVG lines) or vertical list with indentation. For MVP, use indented vertical list for simplicity.

---

## 2. Drag-and-Drop: Org Chart

### 2.1 @dnd-kit Setup

```typescript
// OrgChart uses DndContext from @dnd-kit/core
// Each ProfileCard is both draggable (useDraggable) and a drop target (useDroppable)

import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
```

### 2.2 Drag Start

```
User grabs ProfileCard drag handle
  → DragStartEvent fires with { active: { id: userId } }
  → Set activeDragId = userId
  → Compute subtreeIds for the dragged node (all descendants)
  → Visually highlight valid drop targets
  → Apply opacity reduction to dragged node + subtree
```

### 2.3 Drag Over

```
Dragged node hovers over another ProfileCard
  → DragOverEvent fires with { active, over }
  → Check if drop is valid:
    → Cannot drop onto self
    → Cannot drop onto own descendant (would create cycle)
    → Must pass canDragNode(activeDragId) permission check
  → Highlight valid drop target in green, invalid in red
```

### 2.4 Drag End

```
User releases drag
  → DragEndEvent fires with { active, over }
  → If over is null: cancel drag, restore original position
  → If over is valid drop target:
    → Optimistic update: set draggedUser.supervisorId = over.id in local state
    → Call PATCH /api/users/{draggedUserId}/supervisor { supervisorId: over.id }
    → On success: refetch users to get fresh tree
    → On failure: revert optimistic update, show error toast
  → Clear activeDragId
```

### 2.5 Subtree Visual Movement

When dragging a node, all its descendants move with it visually:

```typescript
// In ProfileCard render:
const isDragging = activeDragId === user.id;
const isInDraggedSubtree = activeDragId
  ? getSubtreeIds(activeDragId, allUsers).includes(user.id)
  : false;

const opacity = isDragging || isInDraggedSubtree ? 0.5 : 1;
```

The actual DOM movement is handled by @dnd-kit's drag overlay. The subtree nodes show reduced opacity to indicate they are "moving" with the dragged node.

### 2.6 Permission Enforcement

```typescript
const canDrop = (draggedUserId: string, targetUserId: string): boolean => {
  const { canDragNode } = usePermissions();

  // Cannot drop onto self
  if (draggedUserId === targetUserId) return false;

  // Cannot create cycle (drop onto own descendant)
  const subtreeIds = getSubtreeIds(draggedUserId, allUsers);
  if (subtreeIds.includes(targetUserId)) return false;

  // Role-based permission
  return canDragNode(draggedUserId);
};
```

---

## 3. ProfileDrawer

### 3.1 Open/Close Flow

```
User clicks ProfileCard (not drag handle)
  → Set selectedUserId = user.id
  → ProfileDrawer renders with isOpen=true
  → Framer Motion: x: 400 → 0, opacity: 0 → 1, duration: 250ms
  → Fetch full user profile + recent tasks if not cached

User clicks X or outside drawer
  → Set selectedUserId = null
  → Framer Motion: x: 0 → 400, opacity: 1 → 0
  → AnimatePresence handles unmount after exit animation
```

### 3.2 Drawer Content

```
ProfileDrawer
├── Header: Avatar (lg) + Name + Role badge + Status badge
├── Section: Availability status dropdown (editable by self or Admin)
├── Section: Current project
├── Section: Workload meter (WorkloadBar + percentage label)
├── Section: Work progress (tasks done / total tasks)
├── Section: Recent tasks (last 5 tasks, mini task cards)
├── Actions:
│   ├── [Assign Task] button — shown if canAssignTask(selectedUserId)
│   └── [Chat] button — navigates to /chat?userId={selectedUserId}
└── Close button (X)
```

### 3.3 Assign Task from Drawer

```
User clicks [Assign Task] in ProfileDrawer
  → Open TaskModal in "create" mode with assigneeId pre-filled
  → TaskModal renders with assignee dropdown locked to selectedUser
  → On task creation: close TaskModal, show success toast
```

---

## 4. Kanban Board Architecture

### 4.1 Column Structure

```typescript
const KANBAN_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'TODO', label: 'To Do', color: 'gray' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'blue' },
  { id: 'REVIEW', label: 'Review', color: 'amber' },
  { id: 'DONE', label: 'Done', color: 'green' },
];
```

### 4.2 @dnd-kit/sortable Setup

```typescript
// KanbanBoard uses DndContext + SortableContext per column
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
```

### 4.3 Task Grouping

```typescript
// useKanban hook groups tasks by status
const tasksByStatus = useMemo(() => {
  const grouped: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };
  filteredTasks.forEach(task => {
    grouped[task.status].push(task);
  });
  return grouped;
}, [filteredTasks]);
```

### 4.4 Drag Between Columns

```
User drags TaskCard from one column to another
  → DragOverEvent: detect column change
  → Optimistic update: move task to new column in local state
  → DragEndEvent: call PATCH /api/tasks/{taskId}/status { status: newStatus }
  → On success: emit task:updated socket event (backend handles this)
  → On failure: revert optimistic update, show error toast
```

### 4.5 Drag Within Column (Reorder)

```
User drags TaskCard within same column
  → SortableContext handles reorder
  → No API call needed (order is not persisted in MVP)
  → Local state reorder only
```

---

## 5. TaskModal

### 5.1 Create Mode

```
User clicks [+ New Task] button
  → TaskModal opens in "create" mode
  → Form fields: title, description, priority, dueDate, assigneeId, attachments
  → Assignee dropdown: filtered by canAssignTask(userId) for each user
  → On submit: POST /api/tasks { title, description, priority, dueDate, assigneeId }
  → On success: add task to TODO column, close modal, show success toast
  → On failure: show error toast, keep modal open
```

### 5.2 Edit Mode

```
User clicks TaskCard to open details
  → TaskModal opens in "edit" mode with task data pre-filled
  → All fields editable (role-gated)
  → On submit: PATCH /api/tasks/{taskId} { ...updatedFields }
  → On success: update task in Kanban board, close modal
  → On failure: show error toast, keep modal open
```

### 5.3 File Attachments

```
User clicks file attach button in TaskModal
  → File picker opens (accept: all file types)
  → On file select: POST /api/upload (multipart/form-data)
  → On upload success: append URL to attachments array in form state
  → Attachments displayed as chips with remove button
  → On task save: attachments array included in task payload
```

### 5.4 Zod Validation

```typescript
const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(Priority),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  attachments: z.array(z.string().url()).default([]),
});
```

---

## 6. FilterBar

### 6.1 Filter State

```typescript
interface TaskFilters {
  assigneeId: string | null;
  priority: Priority | null;
  projectId: string | null;
  dueDateFrom: string | null;
  dueDateTo: string | null;
  search: string;
}
```

### 6.2 Filter Application

```
User changes a filter
  → Update filter state immediately (controlled inputs)
  → Debounce 300ms
  → After debounce: call GET /api/tasks with filter params
  → Update tasks in Kanban board
```

### 6.3 Filter Reset

```
User clicks [Clear Filters]
  → Reset all filter state to null/empty
  → Immediately fetch all tasks (no debounce)
```

---

## 7. Comment Thread

### 7.1 Load Comments

```
TaskModal opens in edit mode
  → Fetch GET /api/tasks/{taskId}/comments
  → Render CommentThread with comments
```

### 7.2 Add Comment

```
User types comment and clicks [Send]
  → POST /api/tasks/{taskId}/comments { content: text }
  → Optimistic: prepend comment to list with pending state
  → On success: replace pending comment with server response
  → On failure: remove pending comment, show error toast
```

---

## 8. Time Log Section

### 8.1 Load Time Logs

```
TaskModal opens in edit mode
  → Fetch GET /api/tasks/{taskId}/time-logs
  → Render TimeLogSection with logs
```

### 8.2 Log Time

```
User fills hours + description and clicks [Log Time]
  → POST /api/tasks/{taskId}/time-logs { minutes: hours * 60, description }
  → On success: append to time log list, update total time display
  → On failure: show error toast
```

---

## 9. Real-Time Updates

### 9.1 Socket Event Handlers (Unit 6)

```typescript
// In useKanban hook
useEffect(() => {
  const handleTaskAssigned = (payload: TaskAssignedPayload) => {
    // Add task to TODO column if assigned to current user
    if (payload.assigneeId === currentUser.id) {
      addTaskToColumn('TODO', payload.task);
    }
  };

  const handleTaskUpdated = (payload: TaskUpdatedPayload) => {
    // Update task in place (may change column if status changed)
    updateTaskInBoard(payload.task);
  };

  const handleWorkloadUpdate = (payload: UserWorkloadUpdatePayload) => {
    // Update workload bar for affected user in org chart
    updateUserWorkload(payload.userId, payload.workloadPercentage);
  };

  const handleStatusChange = (payload: UserStatusChangePayload) => {
    // Update status ring on ProfileCard
    updateUserStatus(payload.userId, payload.status);
  };

  on('task:assigned', handleTaskAssigned);
  on('task:updated', handleTaskUpdated);
  on('user:workload-update', handleWorkloadUpdate);
  on('user:status-change', handleStatusChange);

  return () => {
    off('task:assigned', handleTaskAssigned);
    off('task:updated', handleTaskUpdated);
    off('user:workload-update', handleWorkloadUpdate);
    off('user:status-change', handleStatusChange);
  };
}, [on, off, currentUser.id]);
```

---

## 10. Sequence Diagrams

### 10.1 Org Chart Drag-and-Drop Sequence

```
User          OrgChart         useOrgChart       apiClient        Backend
  |               |                 |                 |               |
  |--drag node--->|                 |                 |               |
  |               |--dragStart----->|                 |               |
  |               |                |--optimistic update              |
  |--drop on X--->|                |                 |               |
  |               |--dragEnd------->|                |               |
  |               |                |--PATCH /users/:id/supervisor--->|
  |               |                |                 |<--200 OK------|
  |               |                |--refetch users->|               |
  |               |<--updated tree-|                 |               |
```

### 10.2 Kanban Drag-and-Drop Sequence

```
User          KanbanBoard       useKanban         apiClient        Backend
  |               |                 |                 |               |
  |--drag card--->|                 |                 |               |
  |               |--dragStart----->|                 |               |
  |--drop column->|                 |                 |               |
  |               |--dragEnd------->|                 |               |
  |               |                |--optimistic move to new column  |
  |               |                |--PATCH /tasks/:id/status------->|
  |               |                |                 |<--200 OK------|
  |               |<--confirmed-----|                |               |
```
