# Requirements Verification Questions — TMS (Project KALAM)

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
If none of the options match your needs, choose the last option (Other/X) and describe your preference.

---

## Section 1: Deployment & Environment

## Question 1
Where will this application be deployed?

A) Local development only (no cloud deployment needed)
B) AWS (EC2, RDS, S3)
C) Other cloud provider (GCP, Azure, DigitalOcean, etc.)
D) Docker / self-hosted VPS
E) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 2
For file uploads, which storage approach should be used?

A) Local filesystem (`/uploads` folder) — simpler, no cloud setup needed
B) AWS S3 — production-grade, requires AWS credentials
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 2: Authentication & Security

## Question 3
Should JWT tokens use refresh token rotation (short-lived access token + long-lived refresh token)?

A) Yes — use access token (15 min) + refresh token (7 days) with rotation
B) No — use a single long-lived JWT token (simpler, less secure)
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 4
Should the application support email verification on registration?

A) Yes — send verification email before account activation
B) No — accounts are active immediately after registration
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 5
Who can register new users?

A) Admin only — Admin creates all accounts (no self-registration)
B) Anyone can self-register, then Admin assigns roles
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 3: Real-Time & Chat

## Question 6
Should chat messages support message editing and deletion?

A) Yes — users can edit and delete their own messages
B) No — messages are immutable once sent
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 7
Should the chat support message read receipts (showing who has read a message)?

A) Yes — show read receipts per message
B) No — only show unread badge counts
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 8
Should the application support video/audio calls, or is chat (text + file) sufficient?

A) Text + file chat only (as specified)
B) Add basic video/audio call capability
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 4: AI Features

## Question 9
For the AI Document Creator, should Claude's response be streamed progressively (tokens appear as they are generated)?

A) Yes — stream the response for a better UX (progressive rendering)
B) No — wait for the full response then display it
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 10
For the AI Document Summarizer, which file types should be supported for upload?

A) PDF, DOCX, TXT only
B) PDF, DOCX, TXT, and images (PNG, JPG)
C) All of the above plus additional formats (CSV, XLSX, PPTX)
D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 11
Should the DOCX export for AI-generated documents use a real DOCX library (e.g., `docx` npm package) or a simple HTML-to-download approach?

A) Real DOCX generation using the `docx` npm package (proper formatting, styles)
B) Simple HTML download (browser prints to file, less fidelity)
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 5: Task Management

## Question 12
Should tasks support comments/discussion threads?

A) Yes — each task has a comment thread
B) No — tasks are standalone (no comments)
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 13
Should tasks support time tracking (logging hours spent)?

A) Yes — users can log time against tasks
B) No — no time tracking needed
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 14
Should the Dashboard show analytics/charts (e.g., tasks by status, workload distribution)?

A) Yes — include charts using Recharts as specified
B) No — keep dashboard simple without charts
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 6: Documents

## Question 15
Should the Documents page support real-time collaborative editing (multiple users editing simultaneously)?

A) Yes — real-time collaborative editing via Socket.io
B) No — single-user editing with share/view permissions only (as specified)
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 16
What rich text editor should be used for the Document Creator/Viewer?

A) TipTap (headless, highly customizable, works well with React)
B) Quill.js (mature, widely used)
C) Simple textarea (no rich text, plain text only)
D) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 7: Org Chart & Hierarchy

## Question 17
When an Admin drags a user to restructure the org chart, should the system validate that the new hierarchy doesn't violate role rules (e.g., a TM cannot be placed above a TL)?

A) Yes — enforce strict role-hierarchy validation on drag-and-drop
B) No — allow free restructuring, Admin is trusted
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 8: Notifications

## Question 18
Should notifications be persisted in the database (so users can see past notifications after refresh)?

A) Yes — store notifications in DB with read/unread status
B) No — in-memory only (notifications disappear on page refresh)
C) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Section 9: Extensions

## Question 19 — Security Extension
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

## Question 20 — Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips
C) No — skip all PBT rules (suitable for simple CRUD applications or thin integration layers)
X) Other (please describe after [Answer]: tag below)

[Answer]: 

---

*Please fill in all [Answer]: tags above, then let me know when you're done.*
