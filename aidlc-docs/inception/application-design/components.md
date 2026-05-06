# Components — TMS (Project KALAM)

---

## Backend Components

### BC-01: AuthComponent
**Purpose**: Handle user registration, login, token issuance, refresh, and logout.  
**Responsibilities**:
- Validate registration input and create user records
- Verify credentials and issue JWT access + refresh token pairs
- Rotate refresh tokens on use; revoke on logout
- Enforce brute-force protection on login

---

### BC-02: UserComponent
**Purpose**: Manage user profiles, hierarchy, availability status, and workload.  
**Responsibilities**:
- CRUD operations on User records
- Manage `supervisorId` self-relation for org hierarchy
- Calculate and return workload percentage per user
- Update availability status and broadcast via Socket.io

---

### BC-03: TaskComponent
**Purpose**: Manage task lifecycle with role-based assignment enforcement.  
**Responsibilities**:
- CRUD operations on Task records
- Enforce role-based assignment rules (Admin > TL > TM > JTM)
- Manage task status transitions
- Handle task attachments (file URLs)
- Manage task comments and time log entries

---

### BC-04: ChatComponent
**Purpose**: Handle direct messages, group messages, and group management.  
**Responsibilities**:
- Store and retrieve direct messages between users
- Store and retrieve group messages
- Manage Group records (create, add/remove members)
- Track read receipts per message
- Support message editing and deletion

---

### BC-05: AIComponent
**Purpose**: Integrate with Anthropic Claude API for document summarization and creation.  
**Responsibilities**:
- Accept file uploads and send to Claude for summarization/analysis
- Accept document creation requests and stream Claude responses
- Parse multi-format files (PDF, DOCX, TXT, images, CSV, XLSX, PPTX)
- Generate DOCX output using the `docx` npm package

---

### BC-06: DocumentComponent
**Purpose**: Manage rich-text documents with sharing and permissions.  
**Responsibilities**:
- CRUD operations on Document records
- Manage sharing (by user, by group, by link)
- Enforce view-only vs edit permissions
- Store TipTap rich-text JSON content

---

### BC-07: FileComponent
**Purpose**: Handle file uploads and serve static files.  
**Responsibilities**:
- Accept multipart file uploads via Multer
- Store files in local `/uploads` directory
- Return public URL for stored files
- Validate file types and sizes

---

### BC-08: NotificationComponent
**Purpose**: Generate and deliver in-app notifications in real-time.  
**Responsibilities**:
- Create notification payloads for key events (task assigned, message received, etc.)
- Deliver notifications via Socket.io to specific user rooms
- In-memory only (no DB persistence)

---

### BC-09: SocketComponent
**Purpose**: Manage Socket.io server, rooms, and event broadcasting.  
**Responsibilities**:
- Initialize Socket.io server and attach to Express
- Manage user rooms (one room per user ID)
- Manage group rooms (one room per group ID)
- Broadcast events: `user:status-change`, `task:assigned`, `task:updated`, `message:new`, `notification:new`

---

## Frontend Components

### FC-01: AuthModule
**Purpose**: Login and registration pages with AuthContext.  
**Responsibilities**:
- Render login and registration forms
- Manage JWT tokens in memory/localStorage
- Provide `useAuth` hook and `AuthContext`
- Handle token refresh automatically via axios interceptor

---

### FC-02: LayoutModule
**Purpose**: Application shell — sidebar, topbar, page wrapper.  
**Responsibilities**:
- Render collapsible sidebar with navigation icons
- Render topbar with user avatar, status badge, notification bell, search
- Wrap page content with consistent padding and transitions

---

### FC-03: OrgChartModule
**Purpose**: Interactive drag-and-drop org chart with profile drawer.  
**Responsibilities**:
- Render org tree using @dnd-kit
- Handle subtree drag-and-drop with role-based permission checks
- Render ProfileCard nodes with avatar, status ring, workload bar
- Render ProfileDrawer slide-in panel with full user details

---

### FC-04: TaskModule
**Purpose**: Kanban board with drag-and-drop and task modals.  
**Responsibilities**:
- Render four-column Kanban board using @dnd-kit/sortable
- Render TaskCard components with priority badges
- Render TaskModal for create/edit with file upload and role-gated assignment
- Render FilterBar for assignee/priority/project/date filtering

---

### FC-05: ChatModule
**Purpose**: Real-time chat with DMs, groups, and media.  
**Responsibilities**:
- Render DM list and group list with unread badges
- Render message thread with MessageBubble components
- Render message composer with rich text, emoji picker, file attach
- Handle WebRTC signaling for video/audio calls
- Connect to Socket.io for real-time message delivery

---

### FC-06: AIToolsModule
**Purpose**: AI document summarizer and AI document creator.  
**Responsibilities**:
- Render FileUploader with drag-and-drop for summarizer mode
- Render SummaryCard with Claude's analysis response
- Render DocCreator with setup question flow (10 questions)
- Stream Claude's document creation response progressively
- Render document preview pane and trigger DOCX download

---

### FC-07: DocumentsModule
**Purpose**: Document list, TipTap editor, and sharing.  
**Responsibilities**:
- Render document list filtered to owned/shared documents
- Render TipTap rich-text editor for create/edit
- Render ShareModal with user search, group selection, link copy
- Enforce view-only vs edit permissions in the editor

---

### FC-08: DashboardModule
**Purpose**: Analytics dashboard with Recharts charts.  
**Responsibilities**:
- Render tasks-by-status chart (bar/pie)
- Render workload distribution chart
- Scope data to user's role (Admin=org-wide, TL=team, TM/JTM=personal)

---

### FC-09: CommonComponents
**Purpose**: Shared UI primitives used across all modules.  
**Responsibilities**:
- Avatar (with status ring)
- StatusBadge, RoleBadge
- WorkloadBar (slim progress bar with color coding)
- SkeletonLoader variants
- Toast notifications
- Modal wrapper (Radix Dialog via shadcn/ui)

---

## Shared Components

### SC-01: SharedTypes
**Purpose**: TypeScript interfaces shared between frontend and backend.  
**Responsibilities**:
- Define interfaces for User, Task, Message, Group, Document, Project
- Define enums for Role, TaskStatus, Priority, AvailabilityStatus, MessageType
- Export from `/shared/types/index.ts`
