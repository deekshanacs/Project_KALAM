# NFR Design Patterns — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 introduces four key design patterns: the SSE streaming pattern for Claude responses, the file parsing pipeline for multi-format document processing, the WebRTC relay pattern for peer-to-peer signaling, and the error handling pattern for Claude API failures.

---

## 2. Streaming Pattern (SSE)

### 2.1 Pattern Description

The AI document creation endpoint uses Server-Sent Events (SSE) to stream Claude's response tokens to the client as they are generated. This provides a progressive rendering experience — the user sees text appearing in real-time rather than waiting for the full response.

### 2.2 SSE vs WebSocket for Streaming

| Criterion | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client only | Bidirectional |
| HTTP/2 support | Yes | Separate protocol |
| Auto-reconnect | Built-in | Manual |
| Complexity | Low | Higher |
| Use case | Streaming responses | Real-time bidirectional |

SSE is the correct choice for AI streaming because:
- The stream is unidirectional (server sends tokens, client receives)
- SSE works over standard HTTP (no protocol upgrade needed)
- The browser's `EventSource` API handles reconnection automatically
- No additional library needed on the server side

### 2.3 Implementation

```typescript
// backend/src/routes/ai.routes.ts

router.post('/create-document',
  authMiddleware,
  zodValidate(CreateDocumentRequestSchema),
  async (req, res, next) => {
    const { description, answers } = req.body as CreateDocumentRequestDto;

    // Set SSE headers BEFORE writing any data
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // Disable nginx buffering
    res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
    res.flushHeaders();  // Send headers immediately

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    try {
      const generator = claudeService.createDocument(description, answers);

      for await (const chunk of generator) {
        if (clientDisconnected || res.writableEnded) break;
        
        // SSE format: "data: {json}\n\n"
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    } catch (error: unknown) {
      logger.error({
        event: 'AI_STREAM_ERROR',
        requestId: req.requestId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      });

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: 'Document generation failed' })}\n\n`);
        res.end();
      }
    }
  }
);
```

### 2.4 SSE Message Format

```
data: {"chunk":"Hello"}\n\n
data: {"chunk":", world"}\n\n
data: {"chunk":"!"}\n\n
data: {"done":true}\n\n
```

**Error format**:
```
data: {"error":"Document generation failed"}\n\n
```

### 2.5 Frontend Consumption Pattern

```typescript
// Frontend (Unit 7)
const eventSource = new EventSource('/api/ai/create-document', {
  // Note: EventSource doesn't support POST natively
  // Use fetch with ReadableStream instead
});

// Using fetch + ReadableStream (preferred for POST requests)
const response = await fetch('/api/ai/create-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ description, answers }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n\n').filter(Boolean);
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; error?: string };
      if (data.chunk) appendToPreview(data.chunk);
      if (data.done) setGenerationComplete(true);
      if (data.error) setError(data.error);
    }
  }
}
```

---

## 3. File Parsing Pipeline

### 3.1 Pattern Description

The file parsing pipeline detects the MIME type of an uploaded file and routes it to the appropriate parser. The output is always a string (extracted text) that is sent to Claude.

### 3.2 Pipeline Architecture

```
Uploaded file (path + mimetype)
      │
      ▼
fileParserService.parseFile(file)
      │
      ├── application/pdf ──────────────────► pdf-parse → text
      │
      ├── application/vnd...wordprocessing ──► mammoth → text
      │
      ├── text/plain ───────────────────────► fs.readFile → text
      │
      ├── image/png, image/jpeg ────────────► base64 encode → data URL
      │   (Claude vision)
      │
      ├── text/csv ─────────────────────────► xlsx.utils.sheet_to_csv → text
      │
      ├── application/vnd...spreadsheet ───► xlsx.readFile → CSV text
      │
      ├── application/vnd...presentation ──► mammoth (limited) → text
      │
      └── Unsupported ──────────────────────► throw ValidationError
      │
      ▼
string (extracted text or base64)
      │
      ▼
claudeService.summarize(text)
```

### 3.3 Implementation

```typescript
// backend/src/services/fileParser.service.ts
import { readFile } from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ValidationError } from '../lib/errors';

interface UploadedFile {
  path: string;
  mimetype: string;
  originalname: string;
  size: number;
}

export async function parseFile(file: UploadedFile): Promise<string> {
  const { path: filePath, mimetype } = file;

  switch (mimetype) {
    case 'application/pdf':
      return parsePdf(filePath);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(filePath);

    case 'text/plain':
      return parseTxt(filePath);

    case 'image/png':
    case 'image/jpeg':
    case 'image/jpg':
      return parseImage(filePath);

    case 'text/csv':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return parseSpreadsheet(filePath);

    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return parsePptx(filePath);

    default:
      throw new ValidationError(`Unsupported file type: ${mimetype}`);
  }
}

async function parsePdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  if (result.messages.length > 0) {
    logger.warn({ event: 'DOCX_PARSE_WARNINGS', messages: result.messages });
  }
  return result.value;
}

async function parseTxt(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString('utf-8');
}

async function parseImage(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mimeType};base64,${base64}`;
}

function parseSpreadsheet(filePath: string): string {
  const workbook = XLSX.readFile(filePath);
  const sheets: string[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
  }
  
  return sheets.join('\n\n');
}

async function parsePptx(filePath: string): Promise<string> {
  // mammoth has limited PPTX support — extracts text from slides
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch {
    // Fallback: return a message indicating limited support
    return '[PPTX file: text extraction has limited support. Key content may be missing.]';
  }
}
```

### 3.4 Image Handling for Claude Vision

When the file is an image, the base64 data URL is sent to Claude using the vision API:

```typescript
// backend/src/services/claude.service.ts

export async function summarize(content: string): Promise<AISummaryDto> {
  const isImage = content.startsWith('data:image/');
  
  const messageContent = isImage
    ? [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: content.split(';')[0].slice(5) as 'image/jpeg' | 'image/png',
            data: content.split(',')[1],
          },
        },
        {
          type: 'text' as const,
          text: 'Please analyze this image and provide a summary, key points, and analysis.',
        },
      ]
    : `Please analyze this document:\n\n${content}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SUMMARIZE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: messageContent }],
  });

  // ... parse response ...
}
```

---

## 4. WebRTC Relay Pattern

### 4.1 Pattern Description

The backend acts as a pure signaling relay. It receives WebRTC signals from one peer and forwards them to the target peer via Socket.io rooms. No signal content is inspected or stored.

### 4.2 Signal Flow

```
Peer A (caller)                Server                    Peer B (callee)
  │                               │                          │
  │── 'webrtc:offer' ────────────►│                          │
  │   { targetUserId: B, offer }  │── 'webrtc:offer' ───────►│
  │                               │   { fromUserId: A, offer }│
  │                               │                          │
  │                               │◄── 'webrtc:answer' ──────│
  │◄── 'webrtc:answer' ───────────│    { targetUserId: A, answer }
  │    { fromUserId: B, answer }  │                          │
  │                               │                          │
  │── 'webrtc:ice-candidate' ────►│── 'webrtc:ice-candidate'►│
  │◄── 'webrtc:ice-candidate' ────│◄── 'webrtc:ice-candidate'│
  │                               │                          │
  │── 'webrtc:call-end' ─────────►│── 'webrtc:call-end' ────►│
```

### 4.3 Implementation

```typescript
// backend/src/services/socket.service.ts (WebRTC section)

io.on('connection', (socket) => {
  const fromUserId = socket.data.userId as string;

  // Relay offer
  socket.on('webrtc:offer', (data: unknown) => {
    if (!isWebRTCOfferEvent(data)) return;
    emitToUser(data.targetUserId, 'webrtc:offer', {
      fromUserId,
      offer: data.offer,
    });
  });

  // Relay answer
  socket.on('webrtc:answer', (data: unknown) => {
    if (!isWebRTCAnswerEvent(data)) return;
    emitToUser(data.targetUserId, 'webrtc:answer', {
      fromUserId,
      answer: data.answer,
    });
  });

  // Relay ICE candidate
  socket.on('webrtc:ice-candidate', (data: unknown) => {
    if (!isWebRTCIceCandidateEvent(data)) return;
    emitToUser(data.targetUserId, 'webrtc:ice-candidate', {
      fromUserId,
      candidate: data.candidate,
    });
  });

  // Relay call end
  socket.on('webrtc:call-end', (data: unknown) => {
    if (!isWebRTCCallEndEvent(data)) return;
    emitToUser(data.targetUserId, 'webrtc:call-end', { fromUserId });
  });
});

// Type guards for WebRTC events
function isWebRTCOfferEvent(data: unknown): data is { targetUserId: string; offer: RTCSessionDescriptionInit } {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).targetUserId === 'string' &&
    typeof (data as Record<string, unknown>).offer === 'object'
  );
}
```

### 4.4 Security Considerations

- WebRTC signals are only relayed between authenticated users (Socket.io auth middleware)
- The `targetUserId` is validated to be a string (type guard)
- Signal content is not validated (it's opaque WebRTC data)
- If the target user is not connected, the signal is silently dropped

---

## 5. Claude API Error Handling Pattern

### 5.1 Pattern Description

Claude API errors are caught, logged server-side (without exposing the API key), and returned to the client as generic error messages.

### 5.2 Error Classification

```typescript
// backend/src/services/claude.service.ts

import Anthropic from '@anthropic-ai/sdk';

function handleClaudeError(error: unknown): never {
  // Log safely (no API key in logs)
  logger.error({
    event: 'CLAUDE_API_ERROR',
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    status: (error as { status?: number }).status,
    // Do NOT log error.message — may contain request details
  });

  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      throw new TooManyRequestsError('AI service rate limited. Please try again.', 60);
    }
    if (error.status === 529) {
      throw new AppError(503, 'AI service is overloaded. Please try again later.');
    }
    if (error.status === 401) {
      // Don't reveal that the API key is invalid
      throw new AppError(503, 'AI service temporarily unavailable.');
    }
  }

  if (error instanceof Anthropic.APIConnectionError) {
    throw new AppError(503, 'AI service connection failed. Please try again.');
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    throw new AppError(504, 'AI service request timed out. Please try again.');
  }

  throw new AppError(503, 'AI service temporarily unavailable.');
}
```

### 5.3 Retry Strategy

For non-streaming requests (summarize), a single retry is attempted on network errors:

```typescript
export async function summarize(content: string): Promise<AISummaryDto> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await anthropic.messages.create({ ... });
      return parseResponse(message);
    } catch (error: unknown) {
      lastError = error;
      
      // Only retry on connection errors, not on API errors
      if (error instanceof Anthropic.APIConnectionError && attempt < 2) {
        logger.warn({ event: 'CLAUDE_RETRY', attempt });
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      handleClaudeError(error);
    }
  }
  
  handleClaudeError(lastError);
}
```
