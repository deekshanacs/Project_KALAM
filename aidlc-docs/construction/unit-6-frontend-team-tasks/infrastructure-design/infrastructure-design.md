# Infrastructure Design — Unit 6: Frontend Team & Tasks

## Unit Overview

**Unit**: Unit 6 — Frontend Team & Tasks  
**Phase**: Construction

---

## 1. @dnd-kit Infrastructure

### 1.1 Client-Side Only

@dnd-kit is a purely client-side library. It requires no server-side infrastructure, no additional API endpoints, and no database changes beyond what the backend already provides.

**Drag state lifecycle**:
```
DragStart → DragOver → DragEnd
  (all in browser memory, no network calls during drag)
  → DragEnd triggers API call (PATCH /api/users/:id/supervisor or PATCH /api/tasks/:id/status)
```

### 1.2 No Server-Side Rendering Concerns

The frontend is a pure SPA (no SSR). @dnd-kit works exclusively in the browser environment. No special Vite or build configuration is needed for @dnd-kit.

### 1.3 Touch Support

@dnd-kit's `PointerSensor` handles both mouse and touch events natively. No additional configuration needed for mobile drag-and-drop.

---

## 2. Real-Time Infrastructure

### 2.1 Socket.io Events (Unit 6)

Unit 6 consumes the following Socket.io events emitted by the backend:

| Event | Emitted By | Consumed By | Payload |
|---|---|---|---|
| `task:assigned` | Backend (TaskService) | useKanban | `{ task: Task, assigneeId: string }` |
| `task:updated` | Backend (TaskService) | useKanban | `{ task: Task }` |
| `user:workload-update` | Backend (WorkloadService) | useOrgChart | `{ userId: string, workloadPercentage: number }` |
| `user:status-change` | Backend (UserService) | useOrgChart | `{ userId: string, status: AvailabilityStatus }` |

### 2.2 Socket Room Membership

The backend places each user in their own room (`userId`). Events are emitted to specific rooms:
- `task:assigned` → emitted to the assignee's room
- `task:updated` → emitted to all users in the task's project room (or all users for MVP)
- `user:workload-update` → emitted to all users (org-wide visibility)
- `user:status-change` → emitted to all users (org-wide visibility)

No additional socket configuration is needed on the frontend beyond what was set up in Unit 5.

---

## 3. File Attachment Infrastructure

### 3.1 Upload Flow

```
User selects file in TaskModal
  → Frontend: POST /api/upload (multipart/form-data)
  → Backend: Multer saves file to /uploads directory
  → Backend: Returns { url: '/uploads/filename.ext' }
  → Frontend: Appends URL to task.attachments array
  → On task save: attachments array included in PATCH /api/tasks/:id
```

### 3.2 File Size Validation

Client-side validation before upload:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds 10MB limit`;
  }
  return null;
};
```

### 3.3 Upload Progress

```typescript
const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<{ url: string }>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      const percent = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
      );
      setUploadProgress(percent);
    },
  });

  return data.url;
};
```

---

## 4. API Endpoints Used in Unit 6

### 4.1 Users API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/users` | Fetch all users for org chart |
| GET | `/api/users/:id` | Fetch single user for ProfileDrawer |
| PATCH | `/api/users/:id/supervisor` | Update supervisor (drag-and-drop) |
| PATCH | `/api/users/:id/status` | Update availability status |
| GET | `/api/users/:id/workload` | Fetch workload data |

### 4.2 Tasks API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tasks` | Fetch tasks with filters |
| POST | `/api/tasks` | Create new task |
| PATCH | `/api/tasks/:id` | Update task details |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/status` | Update task status (Kanban drag) |
| GET | `/api/tasks/:id/comments` | Fetch task comments |
| POST | `/api/tasks/:id/comments` | Add comment |
| GET | `/api/tasks/:id/time-logs` | Fetch time logs |
| POST | `/api/tasks/:id/time-logs` | Log time |

### 4.3 Upload API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/upload` | Upload file attachment |

---

## 5. State Management Architecture

Unit 6 uses React hooks for state management (no Redux or Zustand). State is co-located with the components that need it:

```
TeamPage
  └── useOrgChart (users, tree, drag state)
      └── OrgChart (renders tree)
          └── ProfileCard (per-node state via useDraggable/useDroppable)
      └── ProfileDrawer (selected user state)

TasksPage
  └── useTaskFilters (filter state)
  └── useKanban (tasks, drag state, socket subscriptions)
      └── KanbanBoard (renders columns)
          └── KanbanColumn (per-column state via useDroppable)
              └── TaskCard (per-card state via useSortable)
      └── TaskModal (form state, comment/time-log state)
```

---

## 6. Performance Monitoring

### 6.1 React DevTools Profiler

During development, use React DevTools Profiler to measure:
- Commit duration for org chart renders (target: < 100ms for 50 nodes)
- Commit duration for Kanban renders (target: < 200ms for 200 cards)
- Re-render frequency during drag operations

### 6.2 Bundle Size Impact

@dnd-kit packages add approximately:
- `@dnd-kit/core`: ~15KB gzipped
- `@dnd-kit/sortable`: ~8KB gzipped
- `@dnd-kit/utilities`: ~2KB gzipped

Total addition: ~25KB gzipped. This is within the 500KB bundle budget.
