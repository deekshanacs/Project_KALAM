# Infrastructure Design — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 infrastructure covers Multer disk storage configuration, static file serving for uploads, Anthropic API configuration, HTTP chunked streaming for AI responses, and in-memory DOCX generation.

---

## 2. Multer: Disk Storage Configuration

### 2.1 Storage Configuration

```typescript
// backend/src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { ValidationError } from '../lib/errors';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(env.UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    // UUID + original extension to prevent filename collisions
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
    files: 1,                     // One file per request
    fields: 10,                   // Max 10 non-file fields
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(
        `File type not allowed: ${file.mimetype}. ` +
        `Allowed: PDF, DOCX, TXT, PNG, JPG, GIF, WEBP, CSV, XLSX, PPTX`
      ));
    }
  },
});
```

### 2.2 Upload Endpoint

```typescript
// backend/src/routes/upload.routes.ts

router.post('/', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ValidationError('No file uploaded'));
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    logger.info({
      event: 'FILE_UPLOADED',
      userId: req.user!.id,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: unknown) {
    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
    next(error);
  }
});
```

### 2.3 Multer Error Handling

```typescript
// backend/src/middleware/errorHandler.ts (addition)

// Handle Multer errors before the global error handler
export const multerErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ error: 'Too many files. Upload one file at a time.' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ error: 'Unexpected file field.' });
      default:
        return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
  }
  next(error);
};
```

---

## 3. Static File Serving

### 3.1 Express Static Middleware

```typescript
// backend/src/app.ts
import express from 'express';
import path from 'path';
import { env } from './config/env';

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR), {
  maxAge: '1d',           // Cache for 1 day
  etag: true,             // Enable ETag
  lastModified: true,     // Enable Last-Modified
  dotfiles: 'deny',       // Deny access to dotfiles (e.g., .env)
  index: false,           // Disable directory listing
  fallthrough: false,     // Return 404 for missing files (don't fall through to next middleware)
}));
```

### 3.2 File URL Structure

| Environment | Base URL | File URL Example |
|---|---|---|
| Local dev | `http://localhost:4000` | `http://localhost:4000/uploads/abc123.pdf` |
| Production | `https://your-backend.railway.app` | `https://your-backend.railway.app/uploads/abc123.pdf` |

The frontend stores the relative path (`/uploads/filename`) and prepends the API base URL when displaying files.

### 3.3 Security Considerations

- `dotfiles: 'deny'` prevents serving hidden files
- `index: false` prevents directory listing
- Files are served with `Content-Disposition: inline` by default (browser displays them)
- For download-only files, set `Content-Disposition: attachment` in the route handler

---

## 4. Anthropic API Configuration

### 4.1 Client Initialization

```typescript
// backend/src/services/claude.service.ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

// Singleton client
const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  maxRetries: 2,          // Retry on network errors
  timeout: 60000,         // 60 second timeout
});
```

### 4.2 Model Configuration

| Parameter | Value | Notes |
|---|---|---|
| Model | `claude-sonnet-4-20250514` | Specified in requirements |
| Max tokens (summarize) | 2048 | Sufficient for structured JSON response |
| Max tokens (create) | 4096 | Full document generation |
| Temperature | Default (1.0) | Not overridden |
| System prompt | Per operation | See business-logic-model.md |

### 4.3 API Key Validation

```typescript
// backend/src/routes/ai.routes.ts

// Middleware to check API key is configured
const requireAnthropicKey: RequestHandler = (_req, _res, next) => {
  if (!env.ANTHROPIC_API_KEY) {
    return next(new AppError(503, 'AI service not configured. Please contact the administrator.'));
  }
  next();
};

// Apply to all AI routes
router.use(requireAnthropicKey);
```

---

## 5. Streaming: HTTP Chunked Transfer

### 5.1 How It Works

Node.js automatically uses chunked transfer encoding when:
1. `Content-Length` header is NOT set
2. `res.write()` is called multiple times
3. `res.end()` is called to close the stream

No additional configuration is needed for chunked transfer encoding.

### 5.2 Headers for Streaming

```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');  // Critical for nginx
res.flushHeaders();  // Send headers immediately (don't buffer)
```

**`X-Accel-Buffering: no`**: This header tells nginx (used by Railway/Render) to disable response buffering. Without this, nginx buffers the entire response before sending it to the client, defeating the purpose of streaming.

### 5.3 SSE Event Format

```
data: {"chunk":"Hello"}\n\n
data: {"chunk":", world"}\n\n
data: {"done":true}\n\n
```

Each event is a JSON object on a single line, prefixed with `data: ` and followed by two newlines (`\n\n`).

---

## 6. DOCX: In-Memory Generation

### 6.1 Generation Flow

```typescript
// backend/src/routes/ai.routes.ts

router.post('/generate-docx', authMiddleware, zodValidate(GenerateDocxSchema), async (req, res, next) => {
  try {
    const { content, options } = req.body as GenerateDocxDto;
    
    // Generate DOCX in memory (no filesystem write)
    const buffer = await docxGeneratorService.generate(content, options);
    
    // Set download headers
    const filename = `${(options.title ?? 'document').replace(/[^a-z0-9]/gi, '_')}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send buffer directly (no filesystem involved)
    res.send(buffer);
  } catch (error: unknown) {
    next(error);
  }
});
```

### 6.2 Memory Considerations

- A typical 10-page DOCX document is approximately 50–200KB in memory
- The buffer is created, sent, and garbage collected in a single request
- No temporary files are written to disk
- Memory usage is bounded by the document size (max ~4096 tokens ≈ ~20KB text → ~200KB DOCX)

---

## 7. Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIT 4 INFRASTRUCTURE                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Express Server                             │   │
│  │                                                               │   │
│  │  POST /api/upload                                            │   │
│  │    └── Multer → diskStorage → ./uploads/{uuid}.{ext}         │   │
│  │                                                               │   │
│  │  POST /api/ai/summarize                                      │   │
│  │    └── Multer → fileParser → Claude API → JSON response      │   │
│  │        └── delete file after processing                      │   │
│  │                                                               │   │
│  │  POST /api/ai/create-document                                │   │
│  │    └── Claude API (streaming) → SSE chunks → res.write()     │   │
│  │                                                               │   │
│  │  POST /api/ai/generate-docx                                  │   │
│  │    └── docx package → Buffer → res.send(buffer)              │   │
│  │                                                               │   │
│  │  GET /uploads/:filename                                      │   │
│  │    └── express.static → ./uploads/                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│           │                              │                           │
│           ▼                              ▼                           │
│  ┌─────────────────┐          ┌──────────────────────┐             │
│  │  PostgreSQL DB   │          │  External Services    │             │
│  │                  │          │                       │             │
│  │  messages        │          │  Anthropic Claude API │             │
│  │  groups          │          │  (HTTPS, streaming)   │             │
│  │  group_members   │          │                       │             │
│  │  documents       │          └──────────────────────┘             │
│  └─────────────────┘                                               │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                               │
│  │  Local Filesystem│                                               │
│  │                  │                                               │
│  │  ./uploads/      │                                               │
│  │  (permanent)     │                                               │
│  │                  │                                               │
│  │  ./uploads/      │                                               │
│  │  (AI temp files) │                                               │
│  │  deleted after   │                                               │
│  │  processing      │                                               │
│  └─────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
```
