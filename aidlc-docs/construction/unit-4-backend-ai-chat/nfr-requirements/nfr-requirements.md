# NFR Requirements — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 NFR requirements cover the performance, security, reliability, and scalability requirements for the chat, AI, file upload, and document layers.

---

## 2. Performance Requirements

### 2.1 Chat Performance

| Endpoint | Target | Notes |
|---|---|---|
| `POST /api/messages/direct` | < 100ms | DB insert + Socket.io emit |
| `GET /api/messages/direct/:userId` | < 200ms | Paginated message list |
| `POST /api/messages/group` | < 100ms | DB insert + Socket.io emit |
| `GET /api/messages/group/:groupId` | < 200ms | Paginated message list |
| `PATCH /api/messages/:id` | < 100ms | DB update + Socket.io emit |
| `DELETE /api/messages/:id` | < 100ms | Soft delete + Socket.io emit |
| Socket.io `message:new` delivery | < 100ms | From HTTP response to Socket.io delivery |

### 2.2 AI Performance

| Operation | Target | Notes |
|---|---|---|
| File upload (10MB) | < 5 seconds | Multer disk write |
| File parsing (PDF, DOCX) | < 3 seconds | Depends on file size |
| Claude API first token | < 2 seconds | Streaming begins |
| Claude API full response | < 30 seconds | Depends on document length |
| DOCX generation | < 2 seconds | In-memory generation |

### 2.3 Document Performance

| Endpoint | Target | Notes |
|---|---|---|
| `GET /api/documents` | < 200ms | List without content field |
| `GET /api/documents/:id` | < 100ms | Single document with content |
| `POST /api/documents` | < 100ms | Create with TipTap JSON |
| `PATCH /api/documents/:id` | < 100ms | Update with TipTap JSON |
| `POST /api/documents/:id/share` | < 100ms | Update sharedWith array |

---

## 3. Security Requirements

### 3.1 SECURITY-05: Validate File Type and Size

**Requirement**: All file uploads must validate MIME type and file size before processing.

**Multer configuration**:
```typescript
const upload = multer({
  storage: multer.diskStorage({
    destination: env.UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
    files: 1,                     // One file per request
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/gif',
      'image/webp',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Unsupported file type: ${file.mimetype}`));
    }
  },
});
```

**File size error handling**:
```typescript
// Multer throws MulterError with code 'LIMIT_FILE_SIZE' when size exceeded
app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  next(error);
});
```

### 3.2 SECURITY-08: Group Membership Check

**Requirement**: All group message endpoints must verify the requesting user is a member of the group before allowing access.

```typescript
// Middleware for group access
export async function groupMembershipGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const groupId = req.params.groupId ?? (req.body as { groupId?: string }).groupId;
  
  if (!groupId || !req.user) {
    return next(new UnauthorizedError());
  }
  
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId: req.user.id },
    },
  });
  
  if (!membership) {
    return next(new ForbiddenError('You are not a member of this group'));
  }
  
  next();
}
```

### 3.3 SECURITY-03: No API Keys in Logs

**Requirement**: The `ANTHROPIC_API_KEY` must never appear in log output.

**Rules**:
- The API key is loaded from `env.ANTHROPIC_API_KEY` only
- The key is never logged, even in debug mode
- Error messages from the Anthropic SDK must be sanitized before logging
- The key must not appear in error responses

**Implementation**:
```typescript
// backend/src/services/claude.service.ts

try {
  const response = await anthropic.messages.create({ ... });
} catch (error: unknown) {
  // Log error without exposing API key
  logger.error({
    event: 'CLAUDE_API_ERROR',
    // Do NOT log error.message directly — it may contain request details
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    // Sanitize: only log safe fields
    status: (error as { status?: number }).status,
  });
  throw new AppError(503, 'AI service temporarily unavailable');
}
```

### 3.4 SECURITY-09: ANTHROPIC_API_KEY in Environment Only

**Requirement**: The Anthropic API key must be stored in the `ANTHROPIC_API_KEY` environment variable only. It must not appear in:
- Source code
- Configuration files
- Log files
- API responses
- Error messages

**Validation at startup**:
```typescript
// backend/src/routes/ai.routes.ts
router.use((_req, _res, next) => {
  if (!env.ANTHROPIC_API_KEY) {
    return next(new AppError(503, 'AI service not configured'));
  }
  next();
});
```

### 3.5 Document Access Control

**Requirement**: Document endpoints must enforce access control based on ownership and `sharedWith` entries.

| Operation | Required Permission |
|---|---|
| Read document content | VIEW or EDIT (or owner) |
| Update document content | EDIT (or owner) |
| Share document | Owner or ADMIN only |
| Delete document | Owner or ADMIN only |

---

## 4. Reliability Requirements

### 4.1 Claude API Error Handling

**Requirement**: Claude API errors must be handled gracefully without crashing the server.

| Error Type | Handling |
|---|---|
| Network timeout | Retry once, then return 503 |
| Rate limit (429) | Return 429 with `Retry-After` header |
| Invalid API key (401) | Return 503 (do not expose key error) |
| Model overloaded (529) | Return 503 with retry suggestion |
| Streaming interrupted | Close SSE stream with error event |

```typescript
export async function* createDocumentWithErrorHandling(
  description: string,
  answers: CreateDocumentAnswers
): AsyncGenerator<string> {
  try {
    yield* claudeService.createDocument(description, answers);
  } catch (error: unknown) {
    const errorType = (error as { status?: number }).status;
    
    if (errorType === 429) {
      yield JSON.stringify({ error: 'AI service rate limited. Please try again in a moment.' });
    } else if (errorType === 529) {
      yield JSON.stringify({ error: 'AI service is overloaded. Please try again.' });
    } else {
      yield JSON.stringify({ error: 'Document generation failed. Please try again.' });
    }
  }
}
```

### 4.2 File Upload Cleanup on Error

**Requirement**: If file processing fails after upload, the uploaded file must be deleted.

```typescript
// backend/src/routes/ai.routes.ts

router.post('/summarize', authMiddleware, upload.single('file'), async (req, res, next) => {
  const file = req.file;
  
  if (!file) {
    return next(new ValidationError('No file uploaded'));
  }
  
  try {
    const text = await fileParserService.parseFile(file);
    const summary = await claudeService.summarize(text);
    
    // Delete file after successful processing
    await fs.unlink(file.path);
    
    res.json(summary);
  } catch (error: unknown) {
    // Delete file on error too
    if (file?.path) {
      await fs.unlink(file.path).catch(() => {
        // Ignore cleanup errors
        logger.warn({ event: 'FILE_CLEANUP_FAILED', path: file.path });
      });
    }
    next(error);
  }
});
```

### 4.3 Streaming Response Resilience

**Requirement**: If the client disconnects during streaming, the server must stop generating and clean up.

```typescript
router.post('/create-document', authMiddleware, zodValidate(CreateDocumentRequestSchema), async (req, res, next) => {
  // ... setup SSE headers ...
  
  // Detect client disconnect
  let clientDisconnected = false;
  req.on('close', () => {
    clientDisconnected = true;
    logger.info({ event: 'STREAM_CLIENT_DISCONNECTED', requestId: req.requestId });
  });
  
  try {
    for await (const chunk of claudeService.createDocument(description, answers)) {
      if (clientDisconnected || res.writableEnded) break;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (error: unknown) {
    // ... error handling ...
  }
});
```

---

## 5. Scalability Requirements

### 5.1 Streaming Response Uses Chunked Transfer Encoding

**Requirement**: The AI document creation endpoint must use HTTP chunked transfer encoding (SSE) to stream tokens progressively.

**Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no  (disables nginx buffering)
Transfer-Encoding: chunked  (set automatically by Node.js)
```

**SSE format**:
```
data: {"chunk":"Hello"}\n\n
data: {"chunk":", world"}\n\n
data: {"done":true}\n\n
```

### 5.2 File Upload Memory Efficiency

**Requirement**: File uploads must use disk storage (not memory storage) to prevent memory exhaustion.

```typescript
// CORRECT: Disk storage
const storage = multer.diskStorage({
  destination: env.UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

// WRONG: Memory storage (loads entire file into RAM)
// const storage = multer.memoryStorage();
```

---

## 6. Extension Compliance Summary

| Rule | Status | Implementation |
|---|---|---|
| SECURITY-03 (no API keys in logs) | Compliant | Claude errors sanitized before logging |
| SECURITY-05 (Zod + Multer validation) | Compliant | File type/size validated by Multer + Zod |
| SECURITY-08 (group membership check) | Compliant | `groupMembershipGuard` middleware |
| SECURITY-09 (API key in env only) | Compliant | `ANTHROPIC_API_KEY` from env, never in code |
| SECURITY-15 (global error handler) | Compliant | Inherited from Unit 2 |
| PBT-01 (properties defined) | Compliant | 4 properties in business-rules.md |
| PBT-02 (round-trip) | Compliant | Message + document content round-trip |
| PBT-03 (invariants) | Compliant | readBy no duplicates + sharedWith no duplicates |
| PBT-09 (fast-check) | Compliant | Inherited from Unit 1 |
