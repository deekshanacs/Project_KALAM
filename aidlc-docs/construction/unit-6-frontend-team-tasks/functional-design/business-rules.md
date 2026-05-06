# Business Rules — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction  
**Security Baseline**: ENABLED  
**PBT Extension**: ENABLED

---

## 1. Drag-and-Drop Permission Rules

### BR-U6-01: Admin Drag Permission
- **Rule**: A user with role `ADMIN` can drag ANY node to ANY position in the org chart.
- **Rationale**: Admin has full org restructuring authority (FR-ROLE-07).
- **Implementation**: `canDragNode(draggedUserId)` returns `true` for Admin regardless of `draggedUserId`.

### BR-U6-02: Team Leader Drag Permission
- **Rule**: A user with role `TEAM_LEADER` can only drag nodes that are within their own subtree (direct reports and their descendants).
- **Rationale**: TL can restructure their own team but not other teams (FR-ROLE-08).
- **Implementation**: `canDragNode(draggedUserId)` returns `isInOwnSubtree(currentUser.id, draggedUserId, allUsers)`.

### BR-U6-03: Team Member and Junior Member Drag Permission
- **Rule**: Users with role `TEAM_MEMBER` or `JUNIOR_MEMBER` CANNOT drag any node.
- **Implementation**: `canDragNode(draggedUserId)` returns `false` for these roles.
- **UI enforcement**: Drag handle is hidden (CSS `display: none`) for TM/JTM users.

### BR-U6-04: No Cycle Creation
- **Rule**: A node CANNOT be dropped onto one of its own descendants (would create a cycle in the hierarchy).
- **Implementation**: Before allowing drop, check `getSubtreeIds(draggedUserId, allUsers).includes(targetUserId)`. If true, reject drop.
- **UI feedback**: Show red border on invalid drop targets.

### BR-U6-05: No Self-Drop
- **Rule**: A node CANNOT be dropped onto itself.
- **Implementation**: `draggedUserId === targetUserId` → reject drop.

---

## 2. Subtree Drag Rules

### BR-U6-06: Subtree Visual Movement
- **Rule**: When a node is being dragged, ALL its descendants MUST visually indicate they are part of the drag operation (reduced opacity).
- **Implementation**: Compute `subtreeIds = getSubtreeIds(activeDragId, allUsers)` on drag start. Apply `opacity: 0.6` to all nodes whose `user.id` is in `subtreeIds`.

### BR-U6-07: Subtree API Update
- **Rule**: When a node is dropped, ONLY the dragged node's `supervisorId` is updated via API. The descendants' `supervisorId` values do NOT change — they remain pointing to their direct parent, which has moved.
- **Rationale**: The tree structure is maintained by the `supervisorId` chain. Moving the root of a subtree automatically moves the whole subtree.
- **API call**: `PATCH /api/users/{draggedUserId}/supervisor { supervisorId: targetUserId }`.

---

## 3. Task Assignment Rules

### BR-U6-08: Assignee Dropdown Filtering
- **Rule**: The assignee dropdown in TaskModal MUST only show users that the current user has permission to assign to.
- **Implementation**: Filter `allUsers` array using `canAssignTask(userId)` for each user.
- **Role matrix**:
  | Assigner Role | Can Assign To |
  |---|---|
  | ADMIN | Any user |
  | TEAM_LEADER | Own direct TMs + their JTMs |
  | TEAM_MEMBER | Own direct JTMs |
  | JUNIOR_MEMBER | Nobody |

### BR-U6-09: Assignment Permission Enforcement
- **Rule**: The frontend MUST enforce assignment permissions in the UI. The backend also enforces them server-side (defense in depth).
- **Security Rule**: SECURITY-08 (role-based UI guards).

---

## 4. Task Card Priority Color Rules

### BR-U6-10: Priority Color Mapping
- **Rule**: Task card priority badges MUST use the following color scheme:
  | Priority | Background | Text |
  |---|---|---|
  | LOW | `bg-gray-100` | `text-gray-600` |
  | MEDIUM | `bg-blue-100` | `text-blue-700` |
  | HIGH | `bg-orange-100` | `text-orange-700` |
  | URGENT | `bg-red-100` | `text-red-700` |
- **Dark mode**: Use `dark:bg-*-900 dark:text-*-300` variants.

### BR-U6-11: Overdue Task Indicator
- **Rule**: Tasks with `dueDate` in the past and status NOT `DONE` MUST show a red due date text and warning icon.
- **Implementation**: `new Date(task.dueDate) < new Date() && task.status !== 'DONE'`.

---

## 5. Filter Rules

### BR-U6-12: Filter Debounce
- **Rule**: Filter input changes MUST be debounced by 300ms before triggering an API call.
- **Exception**: Dropdown filter changes (assignee, priority) are NOT debounced — they trigger immediately.
- **Implementation**: `useDebounce(searchQuery, 300)` for text search only.

### BR-U6-13: Filter Produces Subset
- **Rule**: Applying any filter MUST produce a subset of the unfiltered task list. Filters cannot add tasks that weren't in the original list.
- **Testable**: PBT-03 invariant — see Section 8.

### BR-U6-14: Filter Combination
- **Rule**: Multiple active filters are combined with AND logic (all conditions must match).
- **Implementation**: Each filter is applied sequentially to the task array.

---

## 6. ProfileDrawer Rules

### BR-U6-15: Assign Task Button Visibility
- **Rule**: The [Assign Task] button in ProfileDrawer MUST only be shown if `canAssignTask(selectedUserId)` returns `true` for the current viewer.
- **Implementation**: `{canAssignTask(selectedUserId) && <AssignTaskButton />}`.

### BR-U6-16: Status Dropdown Editability
- **Rule**: The availability status dropdown in ProfileDrawer is editable ONLY if:
  - The viewer is the user themselves (viewing own profile), OR
  - The viewer is an Admin.
- **Implementation**: `isEditable = currentUser.id === selectedUserId || currentUser.role === Role.ADMIN`.

---

## 7. Real-Time Update Rules

### BR-U6-17: Task Assigned Event
- **Rule**: On receiving `task:assigned` socket event, if `payload.assigneeId === currentUser.id`, the task MUST be added to the TODO column immediately (without refetch).
- **Implementation**: Prepend task to `tasksByStatus.TODO` array.

### BR-U6-18: Task Updated Event
- **Rule**: On receiving `task:updated` socket event, the task MUST be updated in place in the Kanban board. If the status changed, the task MUST move to the new column.
- **Implementation**: Find task by ID across all columns, remove from old column, add to new column.

### BR-U6-19: Workload Update Event
- **Rule**: On receiving `user:workload-update` socket event, the WorkloadBar for the affected user MUST update immediately in the org chart.
- **Implementation**: Update `workloadData` in `useOrgChart` state.

---

## 8. Testable Properties (PBT)

### PBT-U6-01: canDragNode Never Throws (PBT-03)

**Property**: `canDragNode(draggedUserId)` MUST always return a boolean and NEVER throw for any valid userId pair.

```typescript
// fast-check property
fc.property(
  fc.record({
    currentUserId: fc.uuid(),
    draggedUserId: fc.uuid(),
    role: fc.constantFrom('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    users: fc.array(fc.record({
      id: fc.uuid(),
      supervisorId: fc.option(fc.uuid()),
      role: fc.constantFrom('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    }), { minLength: 0, maxLength: 20 }),
  }),
  ({ currentUserId, draggedUserId, role, users }) => {
    const result = canDragNodePure(currentUserId, draggedUserId, role, users);
    return typeof result === 'boolean';
  }
)
```

### PBT-U6-02: Task Filter Produces Subset (PBT-03)

**Property**: Applying any combination of filters to a task list MUST produce a result that is a subset of the original list.

```typescript
// fast-check property
fc.property(
  fc.array(taskArb, { minLength: 0, maxLength: 100 }),
  fc.record({
    assigneeId: fc.option(fc.uuid()),
    priority: fc.option(fc.constantFrom('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    search: fc.string({ maxLength: 50 }),
  }),
  (tasks, filters) => {
    const filtered = applyTaskFilters(tasks, filters);
    // Every filtered task must exist in the original list
    return filtered.every(ft => tasks.some(t => t.id === ft.id));
  }
)
```

### PBT-U6-03: Task Form Round-Trip (PBT-02)

**Property**: Task form values serialized to API payload and then displayed on a TaskCard preserve the title and priority.

```typescript
// fast-check property
fc.property(
  fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }),
    priority: fc.constantFrom('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    description: fc.option(fc.string({ maxLength: 2000 })),
  }),
  (formValues) => {
    const apiPayload = formValuesToApiPayload(formValues);
    const displayValues = apiPayloadToDisplayValues(apiPayload);
    return (
      displayValues.title === formValues.title &&
      displayValues.priority === formValues.priority
    );
  }
)
```

### PBT-U6-04: getSubtreeIds Consistency (PBT-03)

**Property**: `getSubtreeIds(userId, users)` MUST never include `userId` itself in the result.

```typescript
// fast-check property
fc.property(
  fc.uuid(),
  fc.array(fc.record({
    id: fc.uuid(),
    supervisorId: fc.option(fc.uuid()),
  }), { minLength: 0, maxLength: 30 }),
  (userId, users) => {
    const subtreeIds = getSubtreeIds(userId, users);
    return !subtreeIds.includes(userId);
  }
)
```

---

## 9. Security Rules

### BR-U6-SEC-08: Role-Based UI Guards
- **Rule**: All drag-and-drop operations and task assignment actions MUST be gated by role-based permission checks in the UI.
- **Implementation**: `canDragNode` and `canAssignTask` from `usePermissions()` hook.
- **Defense in depth**: Backend enforces the same rules server-side.

### BR-U6-SEC-VALIDATE: Client-Side Validation
- **Rule**: All task form inputs MUST be validated client-side with Zod before submission.
- **Note**: Server-side validation is authoritative; client-side validation provides immediate feedback only.
