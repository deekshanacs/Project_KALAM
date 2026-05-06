# Services — TMS (Project KALAM)

Services orchestrate multiple components and handle cross-cutting concerns.

---

## SVC-01: AuthService
**Orchestrates**: BC-01 (AuthComponent), BC-09 (SocketComponent)  
**Responsibilities**:
- Coordinate registration flow (validate → hash → create → return)
- Coordinate login flow (validate → check brute-force → verify → issue tokens)
- Manage refresh token store (in-memory map or DB table)
- Coordinate logout (revoke token → disconnect socket session)

---

## SVC-02: UserService
**Orchestrates**: BC-02 (UserComponent), BC-08 (NotificationComponent), BC-09 (SocketComponent)  
**Responsibilities**:
- Coordinate status update (update DB → emit socket event)
- Coordinate hierarchy restructure (update supervisorId → emit org chart update)
- Aggregate workload data for dashboard

---

## SVC-03: TaskService
**Orchestrates**: BC-03 (TaskComponent), BC-02 (UserComponent), BC-08 (NotificationComponent), BC-09 (SocketComponent)  
**Responsibilities**:
- Validate role-based assignment permission before task creation
- Trigger workload recalculation after status change
- Emit task events (assigned, updated) via Socket.io
- Send notifications to assignee on task assignment/completion

---

## SVC-04: ChatService
**Orchestrates**: BC-04 (ChatComponent), BC-07 (FileComponent), BC-08 (NotificationComponent), BC-09 (SocketComponent)  
**Responsibilities**:
- Coordinate message send (create → emit socket → send notification)
- Coordinate file message (upload file → create message with URL → emit)
- Manage WebRTC signaling relay via Socket.io (offer/answer/ICE candidates)
- Coordinate read receipt updates

---

## SVC-05: AIService
**Orchestrates**: BC-05 (AIComponent), BC-07 (FileComponent)  
**Responsibilities**:
- Parse uploaded files to extractable text (PDF→text, DOCX→text, image→base64)
- Build Claude API request with appropriate system prompt
- Stream Claude response to HTTP response stream
- Generate DOCX from Claude output using `docx` package

---

## SVC-06: DocumentService
**Orchestrates**: BC-06 (DocumentComponent), BC-08 (NotificationComponent)  
**Responsibilities**:
- Coordinate document sharing (update sharedWith → send notification to recipients)
- Enforce permission checks on read/write operations
- Generate shareable link tokens

---

## SVC-07: WorkloadService
**Orchestrates**: BC-02 (UserComponent), BC-03 (TaskComponent)  
**Responsibilities**:
- Calculate workload for a user: count open tasks / max capacity by role
- Determine color tier (green/amber/red)
- Called on every task status change event
- Provides workload data for dashboard charts

---

## Cross-Cutting Services

### SVC-X1: LoggerService
**Purpose**: Structured logging across all backend services  
**Responsibilities**:
- Provide structured JSON logger (Winston or Pino)
- Include: timestamp, requestId, level, message
- Exclude PII and tokens from log output
- Route to stdout (Vercel-compatible)

### SVC-X2: ValidationService
**Purpose**: Input validation using Zod schemas  
**Responsibilities**:
- Define Zod schemas for all request DTOs
- Provide Express middleware that validates request body/params/query
- Return 400 with structured error on validation failure

### SVC-X3: RateLimitService
**Purpose**: Rate limiting on public-facing endpoints  
**Responsibilities**:
- Apply rate limiting to auth routes (login, register)
- Apply general rate limiting to all API routes
- Use `express-rate-limit` package

### SVC-X4: ErrorHandlerService
**Purpose**: Global error handling  
**Responsibilities**:
- Catch all unhandled errors in Express middleware chain
- Log error details server-side (via LoggerService)
- Return generic error response to client (no stack traces)
- Handle Prisma errors, Zod validation errors, JWT errors distinctly
