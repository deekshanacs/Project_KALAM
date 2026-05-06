# User Stories — TMS (Project KALAM)

Stories follow the INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable).
Organized by feature domain. Each story maps to one or more personas.

---

## Epic 1: Authentication & User Management

### US-AUTH-01: User Self-Registration
**As a** new user,  
**I want to** register with my name, email, and password,  
**So that** I can access the TMS platform.

**Personas**: All  
**Acceptance Criteria**:
- Registration form accepts name, email, password
- Account is active immediately (no email verification)
- Duplicate email returns a clear error
- Password is stored hashed (never plain text)
- After registration, user is redirected to login

---

### US-AUTH-02: User Login
**As a** registered user,  
**I want to** log in with my email and password,  
**So that** I can access my dashboard and features.

**Personas**: All  
**Acceptance Criteria**:
- Login form accepts email and password
- Successful login issues access token (15 min) + refresh token (7 days)
- Failed login shows generic error (no user enumeration)
- After 5 failed attempts, account is temporarily locked or delayed
- Logout invalidates the refresh token server-side

---

### US-AUTH-03: Admin Role Assignment
**As an** Admin,  
**I want to** assign roles to registered users,  
**So that** the correct permissions are applied to each team member.

**Personas**: Alex (Admin)  
**Acceptance Criteria**:
- Admin can view all registered users
- Admin can change a user's role (ADMIN | TEAM_LEADER | TEAM_MEMBER | JUNIOR_MEMBER)
- Role change takes effect immediately
- Non-admin users cannot access role management

---

### US-AUTH-04: Availability Status Update
**As a** user,  
**I want to** update my availability status,  
**So that** my team knows whether I'm available, in a call, away, or offline.

**Personas**: All  
**Acceptance Criteria**:
- Status options: Available (green), In Call (blue), Away (amber), Offline (gray)
- Status can be updated from the top bar or profile drawer
- Status change broadcasts in real-time to all connected users via Socket.io
- Status ring on avatar updates immediately for all viewers

---

## Epic 2: Org Chart & Team Hierarchy

### US-ORG-01: View Interactive Org Chart
**As a** user,  
**I want to** see the full team hierarchy as an interactive org chart,  
**So that** I understand the team structure and who reports to whom.

**Personas**: All  
**Acceptance Criteria**:
- Org chart renders all users as nodes in a tree
- Each node shows: avatar with availability ring, name, role badge, current project, workload bar
- Chart is interactive (zoomable, pannable)
- Chart updates in real-time when hierarchy changes

---

### US-ORG-02: Admin Restructures Org Chart
**As an** Admin,  
**I want to** drag and drop users to restructure the org chart,  
**So that** I can reorganize the team hierarchy as needed.

**Personas**: Alex (Admin)  
**Acceptance Criteria**:
- Admin can drag any user node to a new parent
- When a node is dragged, all its descendants move with it (subtree drag)
- Hierarchy change is persisted to the database
- No role-rule validation on drag (Admin is trusted)
- Other users see the updated chart in real-time

---

### US-ORG-03: Team Leader Restructures Own Subtree
**As a** Team Leader,  
**I want to** drag and drop Team Members and Junior Members within my subtree,  
**So that** I can reorganize my team's reporting structure.

**Personas**: Taylor (Team Leader)  
**Acceptance Criteria**:
- TL can drag TMs and JTMs within their own subtree only
- Attempting to drag outside own subtree is blocked with a clear message
- Subtree drag moves all descendants

---

### US-ORG-04: View User Profile Drawer
**As a** user,  
**I want to** click on any org chart node to see a detailed profile drawer,  
**So that** I can view that person's status, workload, and recent tasks.

**Personas**: All  
**Acceptance Criteria**:
- Clicking a node opens a slide-in drawer from the right
- Drawer shows: full name, role, email, avatar, availability status dropdown, current project, workload meter, work progress (tasks done/total), recent task list
- [Assign Task] button visible and role-gated (only shown if viewer has permission to assign to this user)
- [Chat] button opens direct message with that user

---

## Epic 3: Task Management

### US-TASK-01: View Kanban Board
**As a** user,  
**I want to** see all relevant tasks on a Kanban board,  
**So that** I can track the status of work at a glance.

**Personas**: All  
**Acceptance Criteria**:
- Board has four columns: TODO | IN PROGRESS | REVIEW | DONE
- Each card shows: title, priority badge (color-coded), due date, assignee avatar, attachment count, comment count
- Admin sees all tasks; TL sees team tasks; TM/JTM see own tasks
- Board loads with skeleton loaders while fetching

---

### US-TASK-02: Create Task
**As a** user with assignment permissions,  
**I want to** create a new task and assign it to an eligible user,  
**So that** work is tracked and delegated appropriately.

**Personas**: Alex (Admin), Taylor (TL), Morgan (TM)  
**Acceptance Criteria**:
- Create task modal: title (required), description, priority, due date, file attachments, assignee (role-gated dropdown)
- Admin can assign to any user
- TL can assign to own TMs and JTMs
- TM can assign to own JTMs only
- JTM cannot create/assign tasks (button hidden + backend enforced)
- Task appears in the TODO column immediately after creation
- Assignee receives a real-time notification

---

### US-TASK-03: Move Task Between Columns
**As a** task assignee,  
**I want to** drag a task card to a different column,  
**So that** I can update the task's status.

**Personas**: All  
**Acceptance Criteria**:
- Cards can be dragged between columns
- Status update persists to the database
- Workload meter recalculates on status change
- Assignee and assigner receive Socket.io event on status change

---

### US-TASK-04: Filter Tasks
**As a** user,  
**I want to** filter the Kanban board by assignee, priority, project, or date,  
**So that** I can focus on the tasks most relevant to me.

**Personas**: All  
**Acceptance Criteria**:
- Filter bar above the board with: assignee dropdown, priority multi-select, project dropdown, date range picker
- Filters apply immediately without page reload
- Active filters are visually indicated
- Clear all filters button resets the board

---

### US-TASK-05: Add Comment to Task
**As a** user,  
**I want to** add comments to a task,  
**So that** I can discuss the task with my team without leaving the task board.

**Personas**: All  
**Acceptance Criteria**:
- Task detail modal has a comment thread section
- Any user with access to the task can add a comment
- Comments show author avatar, name, timestamp, and text
- Comment count on the task card updates in real-time

---

### US-TASK-06: Log Time on Task
**As a** task assignee,  
**I want to** log hours spent on a task,  
**So that** time tracking is recorded for reporting.

**Personas**: All  
**Acceptance Criteria**:
- Task detail modal has a "Log Time" section
- User can enter hours and an optional note
- Total logged time is displayed on the task
- Time entries are stored per user per task

---

## Epic 4: Real-Time Chat

### US-CHAT-01: Send Direct Message
**As a** user,  
**I want to** send a direct message to another user,  
**So that** I can communicate privately without leaving the platform.

**Personas**: All  
**Acceptance Criteria**:
- DM list shows all conversations with unread badge counts
- Message composer supports text, bold, italic, link formatting
- Messages delivered in real-time via Socket.io
- Read receipts shown per message

---

### US-CHAT-02: Create and Use Group Chat
**As a** user,  
**I want to** create a group chat with selected members,  
**So that** I can communicate with multiple team members at once.

**Personas**: All  
**Acceptance Criteria**:
- Group creation modal: name + member selection
- Group messages visible to all members in real-time
- Group list shows unread badge counts
- Any member can send messages to the group

---

### US-CHAT-03: Send File and Image in Chat
**As a** user,  
**I want to** attach files and images to chat messages,  
**So that** I can share documents and visuals with my team.

**Personas**: All  
**Acceptance Criteria**:
- File attach button in composer
- Supported types: images (PNG, JPG), documents (PDF, DOCX)
- Images render inline in the message thread
- Documents show as a file card with name and download link
- Link messages show a preview card with title, description, and thumbnail

---

### US-CHAT-04: Edit and Delete Messages
**As a** message sender,  
**I want to** edit or delete my own messages,  
**So that** I can correct mistakes or remove outdated information.

**Personas**: All  
**Acceptance Criteria**:
- Edit and delete options appear on hover for own messages only
- Edited messages show an "edited" indicator
- Deleted messages show "This message was deleted" placeholder
- Other users see the update in real-time

---

### US-CHAT-05: Video/Audio Call
**As a** user,  
**I want to** start a video or audio call with another user,  
**So that** I can have real-time face-to-face communication.

**Personas**: All  
**Acceptance Criteria**:
- Call button available in DM thread
- WebRTC peer-to-peer connection established
- Caller sees ringing state; callee sees incoming call notification
- Both parties can mute audio and toggle video
- Call ends cleanly for both parties when either hangs up

---

## Epic 5: AI Tools

### US-AI-01: Summarize / Analyze a Document
**As a** user,  
**I want to** upload a document and get an AI-generated summary and analysis,  
**So that** I can quickly understand the content without reading the full document.

**Personas**: All  
**Acceptance Criteria**:
- Upload area accepts: PDF, DOCX, TXT, PNG, JPG, CSV, XLSX, PPTX
- File sent to Claude API; response shows: summary, key points, detailed analysis
- Response displayed in a formatted card
- Loading state shown while Claude processes

---

### US-AI-02: Create AI-Generated Document
**As a** user,  
**I want to** describe a document I need and have AI generate it with my formatting preferences,  
**So that** I can produce professional documents quickly.

**Personas**: All  
**Acceptance Criteria**:
- Text area to describe the document
- AI asks 10 setup questions (type, tone, font, font size, page size, TOC, sections, color theme, header/footer, output format) with option buttons
- Claude generates full document content with streaming (tokens appear progressively)
- Document rendered in a styled preview pane
- Download as DOCX using the `docx` npm package with proper formatting

---

## Epic 6: Documents

### US-DOC-01: Create and Edit Document
**As a** user,  
**I want to** create and edit rich-text documents using TipTap,  
**So that** I can produce and maintain team documentation.

**Personas**: All  
**Acceptance Criteria**:
- TipTap editor with formatting: headings, bold, italic, lists, links
- Document auto-saves or has explicit save button
- Document stored with metadata: title, font, fontSize, theme, pageSize

---

### US-DOC-02: Share Document
**As a** document owner,  
**I want to** share a document with individuals or groups,  
**So that** my team can view or collaborate on it.

**Personas**: All  
**Acceptance Criteria**:
- Share modal: copy link, share with user (search & select), share with group
- Permission levels: view-only or edit
- Shared users see the document in their Documents list
- Owner can revoke access

---

## Epic 7: Dashboard & Analytics

### US-DASH-01: View Dashboard
**As a** user,  
**I want to** see a dashboard with key metrics and charts,  
**So that** I have an at-a-glance overview of team activity.

**Personas**: All  
**Acceptance Criteria**:
- Dashboard shows: tasks by status (Recharts bar/pie chart), workload distribution chart
- Admin sees org-wide metrics; TL sees team metrics; TM/JTM see personal metrics
- Charts load with skeleton loaders
- Notification bell with badge count in top bar

---

## Epic 8: Notifications

### US-NOTIF-01: Receive In-App Notifications
**As a** user,  
**I want to** receive real-time in-app notifications for key events,  
**So that** I stay informed without constantly checking each section.

**Personas**: All  
**Acceptance Criteria**:
- Bell icon in top bar shows unread badge count
- Notifications for: task assigned, task completed, message received, document shared
- Notifications delivered in real-time via Socket.io
- Clicking a notification navigates to the relevant item
- Notifications are in-memory only (cleared on page refresh)
