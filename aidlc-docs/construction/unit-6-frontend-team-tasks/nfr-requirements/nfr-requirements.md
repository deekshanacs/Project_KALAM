# NFR Requirements — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction  
**Security Baseline**: ENABLED  
**PBT Extension**: ENABLED

---

## 1. Performance Requirements

### NFR-U6-PERF-01: Org Chart Rendering
- **Requirement**: The org chart MUST render up to 50 nodes without perceptible lag (< 100ms render time after data is available).
- **Measurement**: React DevTools Profiler — commit duration < 100ms for 50 nodes.
- **Implementation strategies**:
  - `React.memo` on `ProfileCard` to prevent unnecessary re-renders.
  - `useMemo` for `buildOrgTree` and `getSubtreeIds` computations.
  - Avoid re-computing subtree IDs on every render — compute once on drag start.

### NFR-U6-PERF-02: Kanban Board Rendering
- **Requirement**: The Kanban board MUST render up to 200 task cards without perceptible lag.
- **Measurement**: React DevTools Profiler — initial render < 200ms for 200 cards.
- **Implementation strategies**:
  - `React.memo` on `TaskCard` with custom comparison (only re-render if task data changes).
  - `useMemo` for `tasksByStatus` grouping.
  - Virtual list for columns with > 50 tasks (react-window `FixedSizeList`).

### NFR-U6-PERF-03: Drag-and-Drop Smoothness
- **Requirement**: Drag-and-drop operations MUST run at 60fps with no jank.
- **Implementation**:
  - @dnd-kit uses CSS transforms (GPU-accelerated) for drag movement.
  - Avoid expensive computations in drag event handlers.
  - Debounce `dragOver` handler if needed.

### NFR-U6-PERF-04: Filter Response Time
- **Requirement**: Filter changes MUST update the Kanban board within 500ms (including API call).
- **Implementation**: 300ms debounce + fast API response (< 200ms backend).

### NFR-U6-PERF-05: ProfileDrawer Open Time
- **Requirement**: ProfileDrawer MUST open (animation start) within 50ms of click.
- **Implementation**: Animation starts immediately; data fetch happens in parallel.

---

## 2. Accessibility Requirements

### NFR-U6-A11Y-01: Drag-and-Drop Keyboard Alternative
- **Requirement**: ALL drag-and-drop operations MUST have a keyboard-accessible alternative.
- **Org chart**: Each `ProfileCard` has a "Move" button (`aria-label="Move {name}"`) that opens a dropdown to select a new supervisor.
- **Kanban board**: Each `TaskCard` has a "Move to" button that opens a dropdown to select a new status column.
- **Rationale**: WCAG 2.1 Success Criterion 2.1.1 — all functionality available via keyboard.

### NFR-U6-A11Y-02: ARIA Live Regions for Status Updates
- **Requirement**: When a task is moved to a new column (via drag or keyboard), an ARIA live region MUST announce the change.
- **Implementation**: `<div aria-live="polite" aria-atomic="true">` that announces "Task '{title}' moved to {column}".
- **Placement**: Hidden visually but present in DOM (`sr-only` class).

### NFR-U6-A11Y-03: Drag-and-Drop ARIA Attributes
- **Requirement**: Draggable elements MUST have `aria-grabbed` and `role="button"` on the drag handle.
- **Drop targets**: `aria-dropeffect="move"` on valid drop targets.
- **Note**: @dnd-kit handles most ARIA attributes automatically via its accessibility plugin.

### NFR-U6-A11Y-04: ProfileDrawer Focus Management
- **Requirement**: When ProfileDrawer opens, focus MUST move to the drawer. When it closes, focus MUST return to the element that triggered it.
- **Implementation**: `useRef` on trigger element; `focus()` on close.

### NFR-U6-A11Y-05: TaskModal Focus Management
- **Requirement**: When TaskModal opens, focus MUST move to the first form field. When it closes, focus returns to the trigger.
- **Implementation**: Radix UI Dialog handles focus management automatically.

---

## 3. Security Requirements

### NFR-U6-SEC-08: Role-Based UI Guards (SECURITY-08)
- **Requirement**: Drag-and-drop operations and task assignment MUST be gated by role-based permission checks.
- **Drag handle visibility**: Hidden for TEAM_MEMBER and JUNIOR_MEMBER roles.
- **Assignee dropdown**: Filtered to only show assignable users.
- **Delete task button**: Only shown for ADMIN and TEAM_LEADER roles.
- **Defense in depth**: Backend enforces the same rules; frontend guards are for UX only.

### NFR-U6-SEC-UPLOAD: File Upload Validation
- **Requirement**: File uploads in TaskModal MUST validate file type and size client-side before uploading.
- **Max file size**: 10MB per file.
- **Allowed types**: All common document and image types.
- **Implementation**: Check `file.size` and `file.type` before calling `POST /api/upload`.

---

## 4. Usability Requirements

### NFR-U6-UX-01: Skeleton Loaders
- **Requirement**: Skeleton loaders MUST be shown for:
  - Org chart while users are loading.
  - Kanban board while tasks are loading.
  - ProfileDrawer while user details are loading.
  - CommentThread while comments are loading.
  - TimeLogSection while time logs are loading.

### NFR-U6-UX-02: Error States
- **Requirement**: All async operations MUST have error states with user-friendly messages and retry buttons.
- **Org chart error**: "Failed to load team. [Retry]"
- **Kanban error**: "Failed to load tasks. [Retry]"
- **Drag-and-drop error**: Toast notification "Failed to move {name}. Change reverted."
- **Task save error**: Toast notification "Failed to save task. Please try again."

### NFR-U6-UX-03: Optimistic Updates
- **Requirement**: Drag-and-drop operations MUST update the UI immediately (optimistic), with revert on failure.
- **Rationale**: Waiting for API response before updating UI feels sluggish for drag operations.

### NFR-U6-UX-04: Empty States
- **Requirement**: All list components MUST have meaningful empty states.
- **Kanban column empty**: "No tasks" with a subtle illustration.
- **Org chart empty**: "No team members" message.
- **Comment thread empty**: "No comments yet. Be the first to comment."
- **Time log empty**: "No time logged yet."

### NFR-U6-UX-05: Responsive Layout
- **Requirement**: The Kanban board MUST be horizontally scrollable on screens narrower than 1024px.
- **Org chart**: Collapses to a list view on mobile (< 768px).

---

## 5. Maintainability Requirements

### NFR-U6-MAINT-01: Memoization
- **Requirement**: All expensive computations (tree building, subtree ID calculation, task grouping) MUST be wrapped in `useMemo`.
- **Rationale**: Prevents recalculation on every render.

### NFR-U6-MAINT-02: Pure Functions
- **Requirement**: `buildOrgTree`, `getSubtreeIds`, `applyTaskFilters`, `canDragNodePure` MUST be pure functions (no side effects, deterministic output).
- **Rationale**: Enables unit testing and PBT without mocking.

### NFR-U6-MAINT-03: data-testid Attributes
- **Requirement**: All interactive elements and major UI sections MUST have `data-testid` attributes.
- **Convention**: Include entity ID in testid where applicable (e.g., `task-card-{taskId}`).
