# Component Methods — TMS (Project KALAM)

Detailed business logic is defined per-unit in the Functional Design stage (CONSTRUCTION phase).
This document captures method signatures and high-level purpose.

---

## BC-01: AuthComponent

```typescript
register(dto: RegisterDto): Promise<UserDto>
// Creates user, hashes password, returns user profile (no token — must login)

login(dto: LoginDto): Promise<AuthTokensDto>
// Validates credentials, checks brute-force state, issues access + refresh tokens

refreshToken(refreshToken: string): Promise<AuthTokensDto>
// Validates refresh token, rotates it, issues new access + refresh tokens

logout(userId: string, refreshToken: string): Promise<void>
// Revokes the refresh token server-side

getMe(userId: string): Promise<UserDto>
// Returns current user profile from JWT claim
```

---

## BC-02: UserComponent

```typescript
getAllUsers(requesterId: string): Promise<UserWithHierarchyDto[]>
// Returns all users with hierarchy data; scoped by requester role

getUserById(id: string): Promise<UserDto>
// Returns single user profile

updateStatus(userId: string, status: AvailabilityStatus): Promise<void>
// Updates availability status and emits socket event

updateSupervisor(userId: string, supervisorId: string, requesterId: string): Promise<void>
// Updates supervisorId (org chart restructure); validates requester permissions

getUserTasks(userId: string, requesterId: string): Promise<TaskDto[]>
// Returns tasks assigned to user; scoped by requester role

getWorkload(userId: string): Promise<WorkloadDto>
// Calculates (openTaskCount / maxCapacity) * 100 with color tier
```

---

## BC-03: TaskComponent

```typescript
getTasks(requesterId: string, filters: TaskFiltersDto): Promise<TaskDto[]>
// Returns tasks scoped by requester role + applied filters

createTask(dto: CreateTaskDto, assignerId: string): Promise<TaskDto>
// Validates role-based assignment permission, creates task, emits notification

updateTask(taskId: string, dto: UpdateTaskDto, requesterId: string): Promise<TaskDto>
// Updates task fields; validates ownership/permission

updateTaskStatus(taskId: string, status: TaskStatus, requesterId: string): Promise<TaskDto>
// Updates status, triggers workload recalculation, emits socket event

deleteTask(taskId: string, requesterId: string): Promise<void>
// Deletes task; validates requester is assigner or Admin

addComment(taskId: string, dto: AddCommentDto, authorId: string): Promise<CommentDto>
// Adds comment to task thread

logTime(taskId: string, dto: LogTimeDto, userId: string): Promise<TimeLogDto>
// Logs hours against task for the user
```

---

## BC-04: ChatComponent

```typescript
getDirectMessages(userId: string, otherUserId: string): Promise<MessageDto[]>
// Returns DM thread between two users, ordered by createdAt

sendDirectMessage(dto: SendMessageDto, senderId: string): Promise<MessageDto>
// Creates message, emits socket event to receiver room

getGroupMessages(groupId: string, requesterId: string): Promise<MessageDto[]>
// Returns group message thread; validates requester is group member

sendGroupMessage(dto: SendGroupMessageDto, senderId: string): Promise<MessageDto>
// Creates group message, emits socket event to group room

createGroup(dto: CreateGroupDto, creatorId: string): Promise<GroupDto>
// Creates group with name and initial members

getGroups(userId: string): Promise<GroupDto[]>
// Returns all groups the user is a member of

editMessage(messageId: string, content: string, requesterId: string): Promise<MessageDto>
// Edits message content; validates sender ownership

deleteMessage(messageId: string, requesterId: string): Promise<void>
// Soft-deletes message; validates sender ownership

markRead(messageId: string, userId: string): Promise<void>
// Adds userId to message readBy array; emits read receipt event
```

---

## BC-05: AIComponent

```typescript
summarizeDocument(file: Express.Multer.File): Promise<AISummaryDto>
// Parses file content, sends to Claude API, returns summary + key points + analysis

createDocument(dto: CreateDocumentRequestDto): AsyncGenerator<string>
// Streams Claude response for document creation; yields token chunks

generateDocx(content: string, options: DocxOptionsDto): Promise<Buffer>
// Uses `docx` npm package to generate DOCX buffer from Claude content + options
```

---

## BC-06: DocumentComponent

```typescript
getDocuments(userId: string): Promise<DocumentDto[]>
// Returns documents owned by or shared with the user

getDocumentById(docId: string, requesterId: string): Promise<DocumentDto>
// Returns document; validates requester has view or edit permission

createDocument(dto: CreateDocumentDto, ownerId: string): Promise<DocumentDto>
// Creates new document with TipTap JSON content

updateDocument(docId: string, dto: UpdateDocumentDto, requesterId: string): Promise<DocumentDto>
// Updates document; validates requester has edit permission

shareDocument(docId: string, dto: ShareDocumentDto, requesterId: string): Promise<void>
// Adds users/groups to sharedWith; sets permission level; emits notification
```

---

## BC-07: FileComponent

```typescript
uploadFile(file: Express.Multer.File): Promise<FileUploadResultDto>
// Saves file to /uploads, returns { url: string }
```

---

## BC-08: NotificationComponent

```typescript
sendNotification(userId: string, notification: NotificationDto): void
// Emits notification:new event to user's Socket.io room
```

---

## BC-09: SocketComponent

```typescript
initialize(server: http.Server): void
// Attaches Socket.io to HTTP server, sets up connection handlers

joinUserRoom(socket: Socket, userId: string): void
// Joins socket to user-specific room for private notifications

joinGroupRoom(socket: Socket, groupId: string): void
// Joins socket to group room for group messages

emitToUser(userId: string, event: string, data: unknown): void
// Emits event to a specific user's room

emitToGroup(groupId: string, event: string, data: unknown): void
// Emits event to a group room

emitToAll(event: string, data: unknown): void
// Broadcasts event to all connected clients
```

---

## Frontend Hook Methods

```typescript
// useAuth
login(email: string, password: string): Promise<void>
logout(): Promise<void>
register(name: string, email: string, password: string): Promise<void>
refreshToken(): Promise<void>

// useSocket
on(event: string, handler: Function): void
off(event: string, handler: Function): void
emit(event: string, data: unknown): void

// useWorkload
getWorkloadColor(percentage: number): 'green' | 'amber' | 'red'
getWorkloadForUser(userId: string): WorkloadDto

// usePermissions
canAssignTask(assignerId: string, assigneeId: string): boolean
canDragNode(draggedUserId: string, requesterId: string): boolean
canEditDocument(docId: string, requesterId: string): boolean
```
