# Code Generation Plan — Unit 4: Backend AI, Chat & Documents
## TMS (Project KALAM)

**Unit**: Backend AI, Chat & Documents — Chat, WebRTC signaling, AI routes, file upload, documents  
**Stories**: US-CHAT-01–05, US-AI-01–02, US-DOC-01–02  
**Dependencies**: Unit 1, Unit 2 (auth middleware), Unit 3 (socket service)

---

## Execution Checklist

### Step 1: File Upload Route
- [x] Create `backend/src/middleware/upload.ts` (Multer diskStorage config: UPLOAD_DIR, uuid filename, 10MB limit, MIME type filter)
- [x] Create `backend/src/routes/upload.routes.ts` (POST / → upload single file → return { url })
- [x] Create `backend/src/controllers/upload.controller.ts`

### Step 2: Chat Schemas
- [x] Create `backend/src/schemas/chat.schemas.ts` (SendDirectMessageSchema, SendGroupMessageSchema, EditMessageSchema, CreateGroupSchema, MessageListQuerySchema)

### Step 3: Chat Service
- [x] Create `backend/src/services/chat.service.ts` (getDirectMessages, sendDirectMessage, getGroupMessages, sendGroupMessage, editMessage, deleteMessage, markAsRead, createGroup, getGroups, addGroupMember, removeGroupMember)

### Step 4: Chat Routes & Controllers
- [x] Create `backend/src/routes/message.routes.ts` (GET /direct/:userId, POST /direct, GET /group/:groupId, POST /group, PATCH /:id, DELETE /:id, POST /:id/read)
- [x] Create `backend/src/routes/group.routes.ts` (GET /, POST /, GET /:id, POST /:id/members, DELETE /:id/members/:userId)
- [x] Create `backend/src/controllers/message.controller.ts`
- [x] Create `backend/src/controllers/group.controller.ts`
- [x] Create `backend/src/middleware/groupMembership.ts` (groupMembershipGuard)

### Step 5: AI Services
- [x] Create `backend/src/services/fileParser.service.ts` (parseFile: PDF→pdf-parse, DOCX→mammoth, TXT→fs, images→base64, CSV/XLSX→xlsx, PPTX→mammoth)
- [x] Create `backend/src/services/claude.service.ts` (summarize with retry, createDocument as AsyncGenerator streaming, handleClaudeError)
- [x] Create `backend/src/services/docxGenerator.service.ts` (generate: markdown→docx Document→Packer.toBuffer, apply font/fontSize/pageSize/headerFooter options)

### Step 6: AI Routes & Controller
- [x] Create `backend/src/routes/ai.routes.ts` (POST /summarize multipart, POST /create-document SSE streaming, POST /generate-docx)
- [x] Create `backend/src/controllers/ai.controller.ts`
- [x] Create `backend/src/schemas/ai.schemas.ts` (CreateDocumentRequestSchema, GenerateDocxSchema)

### Step 7: Document Service
- [x] Create `backend/src/services/document.service.ts` (getDocuments, getDocumentById with access check, createDocument, updateDocument, deleteDocument, shareDocument with notification emit)
- [x] Create `backend/src/schemas/document.schemas.ts` (CreateDocumentSchema, UpdateDocumentSchema, ShareDocumentSchema)

### Step 8: Document Routes & Controller
- [x] Create `backend/src/routes/document.routes.ts` (GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, POST /:id/share)
- [x] Create `backend/src/controllers/document.controller.ts`

### Step 9: Notification Service
- [x] Create `backend/src/services/notification.service.ts` (sendNotification: emit notification:new to user room via socket)

### Step 10: Register All Routes in App
- [x] Update `backend/src/app.ts` to add all new routes (messages, groups, ai, upload, documents)

### Step 11: Unit Tests
- [x] Create `backend/src/services/__tests__/chat.service.test.ts` (example-based: send DM, group message, edit, delete; PBT: message serialization round-trip, readBy no duplicates)
- [x] Create `backend/src/services/__tests__/document.service.test.ts` (example-based: create, share, access check; PBT: sharedWith no duplicates, document JSON round-trip)
- [x] Create `backend/src/services/__tests__/fileParser.service.test.ts` (example-based: TXT parsing; PBT: text extraction invariant)

### Step 12: Documentation
- [x] Create `aidlc-docs/construction/unit-4-backend-ai-chat/code/unit-4-summary.md`

---

## Story Coverage
- US-CHAT-01: sendDirectMessage + socket emit
- US-CHAT-02: createGroup + sendGroupMessage
- US-CHAT-03: file upload + message with attachment URL
- US-CHAT-04: editMessage + deleteMessage (soft)
- US-CHAT-05: WebRTC signaling relay in socket.service.ts
- US-AI-01: POST /ai/summarize
- US-AI-02: POST /ai/create-document (streaming)
- US-DOC-01: POST /documents + PATCH /documents/:id
- US-DOC-02: POST /documents/:id/share

