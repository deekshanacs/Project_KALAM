# Code Generation Plan — Unit 6: Frontend Team & Tasks
## TMS (Project KALAM)

**Unit**: Frontend Team & Tasks — Org chart DnD, profile drawer, Kanban board DnD  
**Stories**: US-ORG-01–04, US-TASK-01–06  
**Dependencies**: Unit 5 (layout, auth context, hooks), Unit 3 (task API + socket events)

---

## Execution Checklist

### Step 1: Org Chart Hooks & Utilities
- [x] Create `frontend/src/hooks/useOrgChart.ts` (fetch users, build tree with buildOrgTree, handle drag-and-drop: call PATCH /users/:id/supervisor on drop, optimistic update + revert on error)
- [x] Create `frontend/src/utils/orgTree.ts` (buildOrgTree(users): flat array → tree; getSubtreeIds(userId, users): all descendant IDs — pure functions, memoizable)

### Step 2: Org Chart Components
- [x] Create `frontend/src/components/team/OrgChart.tsx` (DndContext from @dnd-kit/core, renders recursive tree of ProfileCard nodes, handles onDragEnd with permission check; data-testid: org-chart)
- [x] Create `frontend/src/components/team/ProfileCard.tsx` (draggable node: Avatar with status ring, name, RoleBadge, current project text, WorkloadBar, drag handle icon; click opens ProfileDrawer; data-testid: profile-card-{userId})
- [x] Create `frontend/src/components/team/ProfileDrawer.tsx` (Framer Motion slide-in from right: full name, role, email, Avatar, availability status dropdown, current project, WorkloadBar, work progress bar, recent tasks list, [Assign Task] button role-gated, [Chat] button; data-testid: profile-drawer)
- [x] Create `frontend/src/pages/Team.tsx` (OrgChart + ProfileDrawer, fetch users on mount, real-time status updates via useSocket; data-testid: team-page)

### Step 3: Kanban Hooks
- [x] Create `frontend/src/hooks/useKanban.ts` (fetch tasks, group by status into 4 columns, handle drag-and-drop between columns: call PATCH /tasks/:id/status, optimistic update + revert on error, listen to socket task:assigned + task:updated events)
- [x] Create `frontend/src/hooks/useTaskFilters.ts` (filter state: assigneeId, priority, projectId, dateFrom, dateTo; debounced 300ms API call on filter change)

### Step 4: Kanban Components
- [x] Create `frontend/src/components/tasks/KanbanBoard.tsx` (DndContext, 4 KanbanColumn components, handles cross-column drag; data-testid: kanban-board)
- [x] Create `frontend/src/components/tasks/KanbanColumn.tsx` (SortableContext, column header with task count badge, TaskCard list, drop zone highlight; data-testid: kanban-column-{status})
- [x] Create `frontend/src/components/tasks/TaskCard.tsx` (useSortable from @dnd-kit/sortable, priority badge with color, due date, assignee Avatar, attachment count, comment count; click opens TaskModal; data-testid: task-card-{taskId})
- [x] Create `frontend/src/components/tasks/FilterBar.tsx` (assignee dropdown, priority multi-select, project dropdown, date range picker, clear all button; data-testid: filter-bar)
- [x] Create `frontend/src/components/tasks/TaskModal.tsx` (create/edit form: title, description, priority select, due date picker, file upload, assignee dropdown filtered by canAssignTask; Radix Dialog via shadcn; data-testid: task-modal, task-title-input, task-submit-btn)
- [x] Create `frontend/src/components/tasks/CommentThread.tsx` (comment list with author Avatar + timestamp, add comment textarea + submit; data-testid: comment-thread, comment-input, comment-submit-btn)
- [x] Create `frontend/src/components/tasks/TimeLogSection.tsx` (time log list with user + hours + note, log time form: hours input + note textarea; data-testid: time-log-section, time-log-hours-input, time-log-submit-btn)
- [x] Create `frontend/src/pages/Tasks.tsx` (KanbanBoard + FilterBar + TaskModal, fetch tasks on mount; data-testid: tasks-page)

### Step 5: Unit Tests
- [x] Create `frontend/src/utils/__tests__/orgTree.test.ts` (example-based: buildOrgTree with 10 seed users; PBT: getSubtreeIds returns subset of all users, canDragNode never throws)
- [x] Create `frontend/src/hooks/__tests__/useKanban.test.ts` (example-based: group tasks by status; PBT: filter produces subset of original list)

### Step 6: Documentation
- [x] Create `aidlc-docs/construction/unit-6-frontend-team-tasks/code/unit-6-summary.md`

---

## Story Coverage
- US-ORG-01: OrgChart renders all users as nodes
- US-ORG-02: Admin drag-and-drop → PATCH /users/:id/supervisor
- US-ORG-03: TL drag-and-drop within own subtree (canDragNode check)
- US-ORG-04: ProfileDrawer with full profile + assign task + chat buttons
- US-TASK-01: KanbanBoard with 4 columns
- US-TASK-02: TaskModal with role-gated assignee dropdown
- US-TASK-03: Cross-column drag → PATCH /tasks/:id/status
- US-TASK-04: FilterBar with debounced API calls
- US-TASK-05: CommentThread in TaskModal
- US-TASK-06: TimeLogSection in TaskModal

