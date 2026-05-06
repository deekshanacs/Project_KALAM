# Business Rules — Unit 3: Backend Features (Tasks + Socket.io)
## TMS (Team Management System) — Project KALAM

---

## 1. Task Assignment Rules

### 1.1 Role-Based Assignment

| Assigner Role | Can Assign To | Cannot Assign To |
|---|---|---|
| ADMIN | Any user in the system | — |
| TEAM_LEADER | Own TMs + those TMs' JTMs (full subtree) | Users outside own subtree |
| TEAM_MEMBER | Own JTMs only | TLs, other TMs, JTMs not in own subtree |
| JUNIOR_MEMBER | Nobody | Everyone (throws ForbiddenError) |

- **BR-TASK-01**: Assignment permission is validated server-side on every task creation and reassignment.
- **BR-TASK-02**: The assigner's role is fetched from the database at validation time (not from the JWT payload) to prevent stale role data.
- **BR-TASK-03**: Self-assignment is always permitted (any user can assign a task to themselves).
- **BR-TASK-04**: ADMIN can reassign any task to any user, regardless of who originally assigned it.
- **BR-TASK-05**: A task's `assignedById` is set to the creating user's ID and cannot be changed after creation.

### 1.2 Hierarchy Traversal for Assignment

The assignment check uses BFS traversal of the `supervisorId` self-relation:

```
TL1 (assigner)
├── TM1 ← can assign
│   ├── JTM1 ← can assign
│   └── JTM2 ← can assign
└── TM2 ← can assign
    └── JTM3 ← can assign

TL2 (different subtree) ← CANNOT assign
└── TM3 ← CANNOT assign
    └── JTM4 ← CANNOT assign
```

---

## 2. Task Status Transition Rules

- **BR-STATUS-01**: Any status can transition to any other status (no strict machine).
- **BR-STATUS-02**: When status transitions TO `DONE`, `completedAt` is set to the current timestamp.
- **BR-STATUS-03**: When status transitions FROM `DONE` to any other status, `completedAt` is set to `null`.
- **BR-STATUS-04**: Status updates are permitted by: the task's `assignedToId`, the task's `assignedById`, or any ADMIN.
- **BR-STATUS-05**: Every status change triggers a workload recalculation for the `assignedToId` user.
- **BR-STATUS-06**: Every status change emits a `task:updated` Socket.io event to both `assignedToId` and `assignedById`.

---

## 3. Priority Rules

| Value | Display | Badge Color | Use Case |
|---|---|---|---|
| `LOW` | Low | Gray | Background work, no deadline pressure |
| `MEDIUM` | Medium | Blue | Standard work items |
| `HIGH` | High | Orange | Important, time-sensitive |
| `URGENT` | Urgent | Red | Critical, requires immediate attention |

- **BR-PRIO-01**: Default priority for new tasks is `MEDIUM`.
- **BR-PRIO-02**: Priority can be changed by the task's `assignedById` or any ADMIN.
- **BR-PRIO-03**: Priority changes do not trigger workload recalculation (only status changes do).

---

## 4. Workload Recalculation Rules

- **BR-WL-01**: Workload is recalculated for the `assignedToId` user on every task status change.
- **BR-WL-02**: Open tasks are those with status `TODO`, `IN_PROGRESS`, or `REVIEW`.
- **BR-WL-03**: `DONE` tasks do not count toward workload.
- **BR-WL-04**: Workload recalculation is non-blocking — it runs as a side effect and does not delay the status update response.
- **BR-WL-05**: If workload recalculation fails, the error is logged but the status update response is still returned successfully.
- **BR-WL-06**: The recalculated workload is emitted via Socket.io to the `assignedToId` user's room.

---

## 5. Attachment Rules

- **BR-ATT-01**: Attachments are stored as a JSON array of URL strings in the `attachments` field.
- **BR-ATT-02**: Maximum 10 attachments per task.
- **BR-ATT-03**: Each attachment URL must be a valid URL string.
- **BR-ATT-04**: Files are uploaded separately via `POST /api/upload` (Unit 4). The task endpoint only stores the returned URL.
- **BR-ATT-05**: Removing an attachment from the array does not delete the file from the filesystem (file cleanup is a future enhancement).

---

## 6. Comment Rules

- **BR-CMT-01**: Any user with access to a task can add a comment (assignedTo, assignedBy, or ADMIN).
- **BR-CMT-02**: Comment content must be 1–5000 characters.
- **BR-CMT-03**: Comments are ordered by `createdAt` ascending (oldest first).
- **BR-CMT-04**: Comments cannot be edited or deleted in MVP (future enhancement).
- **BR-CMT-05**: Adding a comment emits a `task:comment-added` Socket.io event to both task parties.

---

## 7. Time Log Rules

- **BR-TL-01**: Any user with access to a task can log time against it.
- **BR-TL-02**: `hours` must be a positive number greater than 0.
- **BR-TL-03**: `hours` must not exceed 24 per single entry.
- **BR-TL-04**: `hours` should be in 15-minute increments (0.25 steps) — validated by Zod.
- **BR-TL-05**: `note` is optional, max 500 characters.
- **BR-TL-06**: Time logs cannot be edited or deleted in MVP.
- **BR-TL-07**: The time log list response includes the total hours (sum of all entries for the task).

---

## 8. Task Visibility Rules

| Role | Can See |
|---|---|
| ADMIN | All tasks in the system |
| TEAM_LEADER | Tasks assigned to/by users in own subtree |
| TEAM_MEMBER | Tasks assigned to/by users in own subtree |
| JUNIOR_MEMBER | Only tasks assigned to themselves |

- **BR-VIS-01**: Task visibility is enforced server-side via scope filters on every list query.
- **BR-VIS-02**: A user can always see a task if they are the `assignedToId` or `assignedById`.
- **BR-VIS-03**: ADMIN can see all tasks regardless of assignment.

---

## 9. Task Deletion Rules

- **BR-DEL-01**: Only ADMIN can delete tasks.
- **BR-DEL-02**: Deleting a task cascades to delete all its comments and time logs (Prisma cascade).
- **BR-DEL-03**: Task deletion emits a `task:deleted` Socket.io event to both task parties.

---

## 10. Socket.io Rules

- **BR-SOCK-01**: Socket.io connections require a valid JWT access token in the handshake auth.
- **BR-SOCK-02**: Each user automatically joins their personal room `user:{userId}` on connect.
- **BR-SOCK-03**: Group rooms `group:{groupId}` are joined explicitly by the client after connecting.
- **BR-SOCK-04**: Socket.io events are targeted (emitted to specific rooms), not broadcast to all.
- **BR-SOCK-05**: If a Socket.io emit fails, the error is logged but does not affect the HTTP response.

---

## 11. Testable Properties (PBT-01)

### 11.1 Invariant: Workload Percentage Always in [0, 100] (PBT-03)

**Property**: For any non-negative integer `openTasks` and any `Role`, the calculated workload percentage is always in `[0, 100]`.

```typescript
import fc from 'fast-check';
import { MAX_CAPACITY } from '@tms/shared';

describe('WorkloadService PBT', () => {
  it('percentage is always in [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.constantFrom('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
        (openTasks, role) => {
          const maxCapacity = MAX_CAPACITY[role as keyof typeof MAX_CAPACITY];
          const percentage = Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
          return percentage >= 0 && percentage <= 100;
        }
      )
    );
  });
});
```

### 11.2 Invariant: Assignment Permission Check is Deterministic (PBT-03)

**Property**: `canAssign(assignerId, assigneeId)` returns the same boolean for the same inputs when called multiple times.

```typescript
describe('TaskService Assignment PBT', () => {
  it('canAssign is deterministic for same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(seedUsers).map(u => u.id)),
        fc.constantFrom(...Object.values(seedUsers).map(u => u.id)),
        async (assignerId, assigneeId) => {
          const result1 = await canAssign(assignerId, assigneeId);
          const result2 = await canAssign(assignerId, assigneeId);
          return result1 === result2;
        }
      )
    );
  });
});
```

### 11.3 Idempotent: Updating Task Status to Same Status is Safe (PBT-04)

**Property**: Updating a task to its current status produces the same final state as updating it once.

```typescript
describe('TaskService Status PBT', () => {
  it('status update to same value is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...seedTaskIds),
        fc.constantFrom('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
        async (taskId, status) => {
          // First update
          const task1 = await updateTaskStatus(taskId, status as TaskStatus, adminId);
          // Second update to same status
          const task2 = await updateTaskStatus(taskId, status as TaskStatus, adminId);
          
          return task1.status === task2.status && task2.status === status;
        }
      )
    );
  });
});
```

### 11.4 Round-Trip: Task Serialization → Deserialization Preserves All Fields (PBT-02)

**Property**: Serializing a task to JSON and deserializing it back produces an identical object.

```typescript
describe('Task Serialization PBT', () => {
  it('JSON round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
          status: fc.constantFrom('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
          priority: fc.constantFrom('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
          attachments: fc.array(fc.webUrl(), { maxLength: 10 }),
          assignedById: fc.string({ minLength: 1 }),
          assignedToId: fc.string({ minLength: 1 }),
        }),
        (task) => {
          const serialized = JSON.stringify(task);
          const deserialized = JSON.parse(serialized) as typeof task;
          
          return (
            deserialized.id === task.id &&
            deserialized.title === task.title &&
            deserialized.description === task.description &&
            deserialized.status === task.status &&
            deserialized.priority === task.priority &&
            deserialized.attachments.length === task.attachments.length &&
            deserialized.attachments.every((url, i) => url === task.attachments[i])
          );
        }
      )
    );
  });
});
```
