# Code Generation Plan — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Project KALAM)

**Unit**: Backend Features — Socket.io, task CRUD, role-based assignment, comments, time tracking  
**Stories**: US-TASK-01 through US-TASK-06  
**Dependencies**: Unit 1 (schema), Unit 2 (auth middleware, user service)

---

## Execution Checklist

### Step 1: Socket.io Service
- [x] Create `backend/src/services/socket.service.ts` (initializeSocket, getIO, emitToUser, emitToGroup, emitToAll; JWT auth middleware on connection; user room join on connect; group room join/leave handlers; WebRTC signal relay handlers)
- [x] Update `backend/src/index.ts` to call `initializeSocket(httpServer)` after server creation

### Step 2: Task Schemas
- [x] Create `backend/src/schemas/task.schemas.ts` (CreateTaskSchema, UpdateTaskSchema, UpdateStatusSchema, TaskListQuerySchema, CreateCommentSchema, CreateTimeLogSchema)

### Step 3: Task Service
- [x] Create `backend/src/services/task.service.ts` (getTasks with role-scoped filters, createTask with validateAssignmentPermission, updateTask, updateTaskStatus with workload recalculation + socket emit, deleteTask, addComment, getComments, logTime, getTimeLogs)

### Step 4: Task Routes & Controller
- [x] Create `backend/src/routes/task.routes.ts` (GET /, POST /, PATCH /:id, DELETE /:id, PATCH /:id/status, POST /:id/comments, GET /:id/comments, POST /:id/time-logs, GET /:id/time-logs)
- [x] Create `backend/src/controllers/task.controller.ts` (all task handlers)

### Step 5: Assignment Guard Middleware
- [x] Create `backend/src/middleware/assignmentGuard.ts` (validates role-based assignment permission from req.body.assignedToId)

### Step 6: Register Routes in App
- [x] Update `backend/src/app.ts` to add `app.use('/api/tasks', authMiddleware, taskRouter)`

### Step 7: Unit Tests
- [x] Create `backend/src/services/__tests__/task.service.test.ts` (example-based: create task as Admin/TL/TM/JTM; PBT: workload invariant, assignment determinism, status idempotency, task serialization round-trip)
- [x] Create `backend/src/services/__tests__/socket.service.test.ts` (example-based: room join, emit to user)

### Step 8: Documentation
- [x] Create `aidlc-docs/construction/unit-3-backend-features/code/unit-3-summary.md`

---

## Story Coverage
- US-TASK-01: GET /tasks (scoped by role)
- US-TASK-02: POST /tasks (role-gated assignment)
- US-TASK-03: PATCH /tasks/:id/status (+ socket emit + workload recalc)
- US-TASK-04: GET /tasks with query filters
- US-TASK-05: POST /tasks/:id/comments
- US-TASK-06: POST /tasks/:id/time-logs

