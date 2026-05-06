# Business Logic Model — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 implements the remaining backend features: real-time chat (DMs + groups + read receipts + edit/delete), WebRTC signaling relay, AI routes (Claude summarize + create with streaming), file upload (Multer + local), Documents CRUD with sharing, and in-memory notifications.

---

## 2. Chat Message Flow

### 2.1 Send Direct Message

```
POST /api/messages/direct
Body: { receiverId, content, type?, attachments? }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(SendDirectMessageSchema)
      │
      ▼
3. Verify receiver exists: prisma.user.findUniqueOrThrow({ where: { id: receiverId } })
      │
      ▼
4. Create message:
   prisma.message.create({
     data: {
       content,
       type: type ?? 'TEXT',
       attachments: attachments ?? [],
       readBy: [req.user.id],  // sender has read it
       senderId: req.user.id,
       receiverId,
     }
   })
      │
      ▼
5. Emit via Socket.io:
   emitToUser(receiverId, 'message:new', messageWithSender)
   emitToUser(req.user.id, 'message:new', messageWithSender)  // echo to sender
      │
      ▼
6. Emit notification to receiver:
   emitToUser(receiverId, 'notification:new', {
     type: 'MESSAGE_RECEIVED',
     title: `New message from ${senderName}`,
     message: content?.slice(0, 100) ?? 'Sent an attachment',
     data: { messageId: message.id, senderId: req.user.id }
   })
      │
      ▼
7. Return 201: { message: MessageWithSender }
```

### 2.2 Send Group Message

```
POST /api/messages/group
Body: { groupId, content, type?, attachments? }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(SendGroupMessageSchema)
      │
      ▼
3. Verify group membership:
   prisma.groupMember.findUniqueOrThrow({
     where: { groupId_userId: { groupId, userId: req.user.id } }
   })
      │
      ├── Not a member → 403 Forbidden
      │
      ▼
4. Create message:
   prisma.message.create({
     data: {
       content, type, attachments,
       readBy: [req.user.id],
       senderId: req.user.id,
       groupId,
     }
   })
      │
      ▼
5. Emit to group room:
   emitToGroup(groupId, 'message:new', messageWithSender)
      │
      ▼
6. Return 201: { message: MessageWithSender }
```

### 2.3 Read Receipt Update

```
POST /api/messages/:id/read
      │
      ▼
1. authMiddleware
      │
      ▼
2. Fetch message: prisma.message.findUniqueOrThrow({ where: { id } })
      │
      ▼
3. Check access: user is receiver (DM) or group member (group message)
      │
      ▼
4. Add userId to readBy if not already present:
   const readBy = message.readBy as string[];
   if (!readBy.includes(req.user.id)) {
     await prisma.message.update({
       where: { id },
       data: { readBy: [...readBy, req.user.id] }
     });
   }
      │
      ▼
5. Emit read receipt to sender:
   emitToUser(message.senderId, 'message:read', {
     messageId: id,
     readBy: req.user.id,
   })
      │
      ▼
6. Return 200: { message: 'Read receipt updated' }
```

### 2.4 Edit Message

```
PATCH /api/messages/:id
Body: { content: string }
      │
      ▼
1. authMiddleware
      │
      ▼
2. Fetch message: prisma.message.findUniqueOrThrow({ where: { id } })
      │
      ▼
3. Ownership check: message.senderId === req.user.id
      │
      ├── Not sender → 403 Forbidden
      │
      ▼
4. Check not deleted: message.deletedAt === null
      │
      ├── Deleted → 400 Bad Request
      │
      ▼
5. Update:
   prisma.message.update({
     where: { id },
     data: { content, editedAt: new Date() }
   })
      │
      ▼
6. Emit edit event to affected room:
   if (message.receiverId) emitToUser(message.receiverId, 'message:edited', updatedMessage)
   if (message.groupId) emitToGroup(message.groupId, 'message:edited', updatedMessage)
      │
      ▼
7. Return 200: { message: MessageWithSender }
```

### 2.5 Delete Message (Soft Delete)

```
DELETE /api/messages/:id
      │
      ▼
1. authMiddleware
      │
      ▼
2. Fetch message
      │
      ▼
3. Ownership check: message.senderId === req.user.id
      │
      ▼
4. Soft delete:
   prisma.message.update({
     where: { id },
     data: { deletedAt: new Date(), content: null }
   })
      │
      ▼
5. Emit delete event to affected room
      │
      ▼
6. Return 200: { message: 'Message deleted' }
```

---

## 3. WebRTC Signaling Relay

### 3.1 Architecture

The backend acts as a signaling relay only. It does not process or store media. Peers connect directly to each other for audio/video.

```
Peer A                    Server                    Peer B
  │                          │                          │
  │── emit 'webrtc:offer' ──►│                          │
  │   { targetUserId, offer }│── emit 'webrtc:offer' ──►│
  │                          │   { fromUserId, offer }  │
  │                          │                          │
  │                          │◄── emit 'webrtc:answer' ─│
  │◄── emit 'webrtc:answer' ─│    { targetUserId, answer}│
  │    { fromUserId, answer } │                          │
  │                          │                          │
  │── emit 'webrtc:ice' ────►│── emit 'webrtc:ice' ────►│
  │   { targetUserId, candidate }  { fromUserId, candidate }
```

### 3.2 Socket.io Signal Relay Implementation

```typescript
// backend/src/services/socket.service.ts (WebRTC section)

io.on('connection', (socket) => {
  const userId = socket.data.userId as string;
  
  // WebRTC signaling relay
  socket.on('webrtc:offer', (data: { targetUserId: string; offer: RTCSessionDescriptionInit }) => {
    emitToUser(data.targetUserId, 'webrtc:offer', {
      fromUserId: userId,
      offer: data.offer,
    });
  });

  socket.on('webrtc:answer', (data: { targetUserId: string; answer: RTCSessionDescriptionInit }) => {
    emitToUser(data.targetUserId, 'webrtc:answer', {
      fromUserId: userId,
      answer: data.answer,
    });
  });

  socket.on('webrtc:ice-candidate', (data: { targetUserId: string; candidate: RTCIceCandidateInit }) => {
    emitToUser(data.targetUserId, 'webrtc:ice-candidate', {
      fromUserId: userId,
      candidate: data.candidate,
    });
  });

  socket.on('webrtc:call-end', (data: { targetUserId: string }) => {
    emitToUser(data.targetUserId, 'webrtc:call-end', { fromUserId: userId });
  });
});
```

---

## 4. AI Summarize Flow

### 4.1 Flow

```
POST /api/ai/summarize
Content-Type: multipart/form-data
Body: file (PDF, DOCX, TXT, PNG, JPG, CSV, XLSX, PPTX)
      │
      ▼
1. authMiddleware
      │
      ▼
2. Multer: save file to UPLOAD_DIR, validate size (max 10MB) and MIME type
      │
      ▼
3. fileParserService.parseFile(file) → string (extracted text)
      │
      ├── PDF → pdf-parse → text
      ├── DOCX → mammoth → text
      ├── TXT → fs.readFile → text
      ├── PNG/JPG → base64 encode (for Claude vision)
      ├── CSV → xlsx parser → text table
      ├── XLSX → xlsx parser → text table
      └── PPTX → mammoth or custom → text
      │
      ▼
4. claudeService.summarize(extractedText) → AISummaryDto
      │
      ▼
5. Delete uploaded file (cleanup after processing)
      │
      ▼
6. Return 200: { summary, keyPoints, analysis }
```

### 4.2 Claude Summarize Prompt

```typescript
const SUMMARIZE_SYSTEM_PROMPT = `You are a professional document analyst. 
Analyze the provided document and return a structured JSON response with:
- summary: A concise 2-3 paragraph summary of the document
- keyPoints: An array of 5-10 key points or findings
- analysis: A detailed analysis including tone, purpose, and recommendations

Always respond with valid JSON matching this exact structure.`;

export async function summarize(content: string): Promise<AISummaryDto> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SUMMARIZE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Please analyze this document:\n\n${content}`,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  try {
    return JSON.parse(responseText) as AISummaryDto;
  } catch {
    // If Claude doesn't return valid JSON, structure the response
    return {
      summary: responseText,
      keyPoints: [],
      analysis: 'Analysis could not be structured. See summary for details.',
    };
  }
}
```

---

## 5. AI Create Document Flow (Streaming)

### 5.1 Flow

```
POST /api/ai/create-document
Body: { description, answers: { type, tone, font, fontSize, pageSize, toc, sections, colorTheme, headerFooter, outputFormat } }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(CreateDocumentRequestSchema)
      │
      ▼
3. Build system prompt from answers
      │
      ▼
4. Set response headers for streaming:
   res.setHeader('Content-Type', 'text/event-stream')
   res.setHeader('Cache-Control', 'no-cache')
   res.setHeader('Connection', 'keep-alive')
   res.setHeader('X-Accel-Buffering', 'no')
      │
      ▼
5. claudeService.createDocument(description, answers) → AsyncGenerator<string>
      │
      ▼
6. For each chunk from Claude:
   res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      │
      ▼
7. On stream complete:
   res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
   res.end()
      │
      ▼
8. On error:
   res.write(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`)
   res.end()
```

### 5.2 Claude Create Document Prompt

```typescript
function buildCreateDocumentPrompt(
  description: string,
  answers: CreateDocumentAnswers
): string {
  return `You are a professional document writer. Create a complete, well-structured document based on the following specifications:

Document Description: ${description}

Document Specifications:
- Type: ${answers.type}
- Tone: ${answers.tone}
- Font: ${answers.font}
- Font Size: ${answers.fontSize}pt
- Page Size: ${answers.pageSize}
- Table of Contents: ${answers.toc ? 'Yes' : 'No'}
- Number of Sections: ${answers.sections}
- Color Theme: ${answers.colorTheme}
- Header/Footer: ${answers.headerFooter ? 'Yes' : 'No'}
- Output Format: ${answers.outputFormat}

Please write the complete document content now. Use markdown formatting with proper headings (# for H1, ## for H2, etc.), bullet points, and paragraphs. Make it professional, comprehensive, and ready for use.`;
}

export async function* createDocument(
  description: string,
  answers: CreateDocumentAnswers
): AsyncGenerator<string> {
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildCreateDocumentPrompt(description, answers),
      },
    ],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text;
    }
  }
}
```

### 5.3 Streaming Response Handler

```typescript
// backend/src/routes/ai.routes.ts

router.post('/create-document', authMiddleware, zodValidate(CreateDocumentRequestSchema), async (req, res, next) => {
  const { description, answers } = req.body as CreateDocumentRequestDto;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const generator = claudeService.createDocument(description, answers);
    
    for await (const chunk of generator) {
      if (res.writableEnded) break;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (error: unknown) {
    logger.error({
      event: 'AI_STREAM_ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: 'Document generation failed' })}\n\n`);
      res.end();
    }
  }
});
```

---

## 6. Document Sharing Flow

### 6.1 Share Document

```
POST /api/documents/:id/share
Body: { userIds?, groupIds?, permission: 'VIEW' | 'EDIT' }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(ShareDocumentSchema)
      │
      ▼
3. Fetch document: prisma.document.findUniqueOrThrow({ where: { id } })
      │
      ▼
4. Permission check: document.ownerId === req.user.id OR ADMIN
      │
      ▼
5. Build new sharedWith array:
   const currentSharedWith = document.sharedWith as DocumentShare[];
   const newEntries = [
     ...(userIds?.map(userId => ({ userId, permission })) ?? []),
     ...(groupIds?.map(groupId => ({ groupId, permission })) ?? []),
   ];
   
   // Merge: update existing entries, add new ones
   const merged = mergeSharedWith(currentSharedWith, newEntries);
      │
      ▼
6. Update document:
   prisma.document.update({
     where: { id },
     data: { sharedWith: merged }
   })
      │
      ▼
7. Emit notifications to newly shared users:
   for (const userId of userIds ?? []) {
     emitToUser(userId, 'notification:new', {
       type: 'DOCUMENT_SHARED',
       title: 'Document shared with you',
       message: `${ownerName} shared "${document.title}" with you`,
       data: { documentId: id, permission }
     });
   }
      │
      ▼
8. Return 200: { document: Document }
```

### 6.2 Document Access Check

```typescript
export async function checkDocumentAccess(
  documentId: string,
  userId: string,
  requiredPermission: 'VIEW' | 'EDIT'
): Promise<void> {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });

  // Owner always has full access
  if (document.ownerId === userId) return;

  // Check sharedWith array
  const sharedWith = document.sharedWith as DocumentShare[];
  
  // Check direct user share
  const userShare = sharedWith.find(s => s.userId === userId);
  if (userShare) {
    if (requiredPermission === 'VIEW') return;
    if (requiredPermission === 'EDIT' && userShare.permission === 'EDIT') return;
    throw new ForbiddenError('You have view-only access to this document');
  }

  // Check group share (user must be a member of the group)
  const userGroups = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const userGroupIds = userGroups.map(g => g.groupId);
  
  const groupShare = sharedWith.find(s => s.groupId && userGroupIds.includes(s.groupId));
  if (groupShare) {
    if (requiredPermission === 'VIEW') return;
    if (requiredPermission === 'EDIT' && groupShare.permission === 'EDIT') return;
    throw new ForbiddenError('You have view-only access to this document');
  }

  throw new ForbiddenError('You do not have access to this document');
}
```

---

## 7. DOCX Generation Flow

### 7.1 Flow

```
POST /api/ai/generate-docx
Body: { content: string, options: DocxOptions }
      │
      ▼
1. authMiddleware
      │
      ▼
2. zodValidate(GenerateDocxSchema)
      │
      ▼
3. docxGeneratorService.generate(content, options) → Buffer
      │
      ▼
4. Set response headers:
   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
   res.setHeader('Content-Disposition', `attachment; filename="${options.title ?? 'document'}.docx"`)
      │
      ▼
5. res.send(buffer)
```

### 7.2 DOCX Generator

```typescript
// backend/src/services/docxGenerator.service.ts
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageSize, PageOrientation
} from 'docx';

export interface DocxOptions {
  title?: string;
  font?: string;
  fontSize?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  colorTheme?: string;
  headerFooter?: boolean;
}

export async function generate(
  markdownContent: string,
  options: DocxOptions
): Promise<Buffer> {
  const paragraphs = parseMarkdownToParagraphs(markdownContent, options);
  
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: getPageSize(options.pageSize ?? 'A4'),
          },
        },
        children: paragraphs,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: options.font ?? 'Calibri',
            size: (options.fontSize ?? 12) * 2,  // docx uses half-points
          },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}

function parseMarkdownToParagraphs(
  markdown: string,
  options: DocxOptions
): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(2),
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(3),
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(4),
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(2),
        bullet: { level: 0 },
      }));
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }));
    } else {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line })],
      }));
    }
  }

  return paragraphs;
}

function getPageSize(size: string): { width: number; height: number } {
  switch (size) {
    case 'Letter': return { width: 12240, height: 15840 };
    case 'Legal': return { width: 12240, height: 20160 };
    case 'A4':
    default: return { width: 11906, height: 16838 };
  }
}
```

---

## 8. Notification System

### 8.1 In-Memory Notification Flow

Notifications are not persisted in the database. They are generated and emitted via Socket.io only.

```typescript
// backend/src/services/notification.service.ts
import { v4 as uuidv4 } from 'uuid';
import { emitToUser } from './socket.service';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'MESSAGE_RECEIVED'
  | 'DOCUMENT_SHARED';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

export function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const notification: NotificationDto = {
    id: uuidv4(),
    type,
    title,
    message,
    data,
    createdAt: new Date().toISOString(),
    read: false,
  };

  emitToUser(userId, 'notification:new', notification);
}
```

**Limitation**: Notifications disappear on page refresh (no DB persistence). This is by design for MVP.
