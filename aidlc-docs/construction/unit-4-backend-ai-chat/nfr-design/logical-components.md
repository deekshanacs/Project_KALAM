# Logical Components — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 logical components implement the AI, chat, file upload, and document layers. The key components are: fileParserService, claudeService, docxGeneratorService, webrtcSignalingService, and groupMembershipGuard.

---

## 2. fileParserService

### 2.1 Purpose

Detects the MIME type of an uploaded file and routes it to the appropriate parser. Returns extracted text (or base64 for images) ready for Claude processing.

### 2.2 Interface

```typescript
// backend/src/services/fileParser.service.ts

export interface ParsedFile {
  text: string;
  isImage: boolean;
  mimeType: string;
}

export async function parseFile(file: Express.Multer.File): Promise<ParsedFile>;
```

### 2.3 Supported Formats

| MIME Type | Parser | Output |
|---|---|---|
| `application/pdf` | pdf-parse | Plain text |
| `application/vnd...wordprocessingml.document` | mammoth | Plain text |
| `text/plain` | fs.readFile | Plain text |
| `image/png`, `image/jpeg` | Buffer.toString('base64') | Base64 data URL |
| `text/csv` | xlsx | CSV text |
| `application/vnd...spreadsheetml.sheet` | xlsx | CSV text |
| `application/vnd...presentationml.presentation` | mammoth | Plain text (limited) |

### 2.4 Full Implementation

```typescript
import { readFile } from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';

const SUPPORTED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export async function parseFile(file: Express.Multer.File): Promise<ParsedFile> {
  if (!SUPPORTED_MIMES.has(file.mimetype)) {
    throw new ValidationError(
      `Unsupported file type: ${file.mimetype}. ` +
      `Supported types: PDF, DOCX, TXT, PNG, JPG, CSV, XLSX, PPTX`
    );
  }

  const isImage = file.mimetype.startsWith('image/');

  let text: string;

  if (file.mimetype === 'application/pdf') {
    const buffer = await readFile(file.path);
    const data = await pdfParse(buffer);
    text = data.text;
  } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ path: file.path });
    text = result.value;
  } else if (file.mimetype === 'text/plain') {
    const buffer = await readFile(file.path);
    text = buffer.toString('utf-8');
  } else if (isImage) {
    const buffer = await readFile(file.path);
    const base64 = buffer.toString('base64');
    text = `data:${file.mimetype};base64,${base64}`;
  } else if (
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const workbook = XLSX.readFile(file.path);
    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        sheets.push(`=== ${sheetName} ===\n${XLSX.utils.sheet_to_csv(sheet)}`);
      }
    }
    text = sheets.join('\n\n');
  } else {
    // PPTX — limited support
    try {
      const result = await mammoth.extractRawText({ path: file.path });
      text = result.value || '[Presentation: limited text extraction]';
    } catch {
      text = '[Presentation: text extraction failed]';
    }
  }

  logger.debug({
    event: 'FILE_PARSED',
    mimetype: file.mimetype,
    originalname: file.originalname,
    textLength: text.length,
    isImage,
  });

  return { text, isImage, mimeType: file.mimetype };
}
```

---

## 3. claudeService

### 3.1 Purpose

Wraps the Anthropic SDK to provide two operations: `summarize` (non-streaming, returns structured JSON) and `createDocument` (streaming, returns AsyncGenerator).

### 3.2 Interface

```typescript
// backend/src/services/claude.service.ts

export async function summarize(parsedFile: ParsedFile): Promise<AISummaryDto>;
export async function* createDocument(
  description: string,
  answers: CreateDocumentAnswers
): AsyncGenerator<string>;
```

### 3.3 Summarize Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { AISummaryDto } from '@tms/shared';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SUMMARIZE_SYSTEM_PROMPT = `You are a professional document analyst. 
Analyze the provided content and return ONLY a valid JSON object with this exact structure:
{
  "summary": "2-3 paragraph summary",
  "keyPoints": ["point 1", "point 2", ...],
  "analysis": "detailed analysis paragraph"
}
Do not include any text outside the JSON object.`;

export async function summarize(parsedFile: ParsedFile): Promise<AISummaryDto> {
  const messageContent = parsedFile.isImage
    ? [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: parsedFile.mimeType as 'image/jpeg' | 'image/png',
            data: parsedFile.text.split(',')[1] ?? parsedFile.text,
          },
        },
        { type: 'text' as const, text: 'Analyze this image.' },
      ]
    : `Analyze this document:\n\n${parsedFile.text.slice(0, 100000)}`; // Limit to 100K chars

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SUMMARIZE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    });

    const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';

    try {
      return JSON.parse(responseText) as AISummaryDto;
    } catch {
      return {
        summary: responseText,
        keyPoints: [],
        analysis: 'Structured analysis unavailable.',
      };
    }
  } catch (error: unknown) {
    handleClaudeError(error);
  }
}
```

### 3.4 Create Document Implementation

```typescript
export async function* createDocument(
  description: string,
  answers: CreateDocumentAnswers
): AsyncGenerator<string> {
  const prompt = buildCreateDocumentPrompt(description, answers);

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  } catch (error: unknown) {
    handleClaudeError(error);
  }
}
```

---

## 4. docxGeneratorService

### 4.1 Purpose

Converts markdown content (from Claude) into a properly formatted DOCX file. Returns a Buffer that can be sent as a download response.

### 4.2 Interface

```typescript
// backend/src/services/docxGenerator.service.ts

export interface DocxGenerationOptions {
  title?: string;
  font?: string;
  fontSize?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  colorTheme?: string;
  headerFooter?: boolean;
}

export async function generate(
  markdownContent: string,
  options: DocxGenerationOptions
): Promise<Buffer>;
```

### 4.3 Implementation

```typescript
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Header, Footer, PageNumber, NumberFormat
} from 'docx';

export async function generate(
  markdownContent: string,
  options: DocxGenerationOptions
): Promise<Buffer> {
  const font = options.font ?? 'Calibri';
  const fontSize = (options.fontSize ?? 12) * 2;  // docx uses half-points

  const paragraphs = parseMarkdownToParagraphs(markdownContent, font, fontSize);

  const sections = [{
    properties: {
      page: { size: getPageSize(options.pageSize ?? 'A4') },
    },
    headers: options.headerFooter ? {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: options.title ?? 'Document', font, size: fontSize - 4 })],
          alignment: AlignmentType.RIGHT,
        })],
      }),
    } : undefined,
    footers: options.headerFooter ? {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: 'Page ', font, size: fontSize - 4 }),
            new TextRun({ children: [PageNumber.CURRENT], font, size: fontSize - 4 }),
          ],
          alignment: AlignmentType.CENTER,
        })],
      }),
    } : undefined,
    children: paragraphs,
  }];

  const doc = new Document({
    sections,
    styles: {
      default: {
        document: {
          run: { font, size: fontSize },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}
```

---

## 5. webrtcSignalingService

### 5.1 Purpose

Handles WebRTC signaling relay within the Socket.io connection handler. Validates incoming signal events and relays them to the target user.

### 5.2 Interface

```typescript
// backend/src/services/webrtcSignaling.service.ts

export function registerWebRTCHandlers(socket: Socket, fromUserId: string): void;
```

### 5.3 Implementation

```typescript
import { Socket } from 'socket.io';
import { emitToUser } from './socket.service';
import { logger } from '../lib/logger';

export function registerWebRTCHandlers(socket: Socket, fromUserId: string): void {
  socket.on('webrtc:offer', (data: unknown) => {
    if (!isValidSignal(data, 'offer')) return;
    const { targetUserId, offer } = data as { targetUserId: string; offer: unknown };
    
    logger.debug({ event: 'WEBRTC_OFFER_RELAY', fromUserId, targetUserId });
    emitToUser(targetUserId, 'webrtc:offer', { fromUserId, offer });
  });

  socket.on('webrtc:answer', (data: unknown) => {
    if (!isValidSignal(data, 'answer')) return;
    const { targetUserId, answer } = data as { targetUserId: string; answer: unknown };
    
    emitToUser(targetUserId, 'webrtc:answer', { fromUserId, answer });
  });

  socket.on('webrtc:ice-candidate', (data: unknown) => {
    if (!isValidSignal(data, 'candidate')) return;
    const { targetUserId, candidate } = data as { targetUserId: string; candidate: unknown };
    
    emitToUser(targetUserId, 'webrtc:ice-candidate', { fromUserId, candidate });
  });

  socket.on('webrtc:call-end', (data: unknown) => {
    if (typeof data !== 'object' || data === null) return;
    const { targetUserId } = data as { targetUserId?: string };
    if (typeof targetUserId !== 'string') return;
    
    emitToUser(targetUserId, 'webrtc:call-end', { fromUserId });
  });
}

function isValidSignal(
  data: unknown,
  signalKey: string
): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.targetUserId === 'string' && obj[signalKey] !== undefined;
}
```

---

## 6. groupMembershipGuard

### 6.1 Purpose

Express middleware that validates the requesting user is a member of the group specified in the request (either in params or body).

### 6.2 Interface

```typescript
// backend/src/middleware/groupMembership.ts

export const groupMembershipGuard: RequestHandler;
// Reads groupId from req.params.groupId or req.body.groupId
// Throws ForbiddenError if user is not a member
```

### 6.3 Implementation

```typescript
import { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export const groupMembershipGuard: RequestHandler = async (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  // Get groupId from params or body
  const groupId = req.params.groupId ?? (req.body as { groupId?: string }).groupId;

  if (!groupId) {
    return next(new Error('groupId is required for group membership check'));
  }

  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      return next(new ForbiddenError('You are not a member of this group'));
    }

    next();
  } catch (error: unknown) {
    next(error);
  }
};
```

---

## 7. Component Dependency Graph

```
ai.routes.ts
    │
    ├── authMiddleware
    ├── zodValidate
    ├── multer (upload middleware)
    │
    ├── fileParserService
    │   ├── pdf-parse
    │   ├── mammoth
    │   ├── xlsx
    │   └── fs/promises
    │
    ├── claudeService
    │   └── @anthropic-ai/sdk
    │
    └── docxGeneratorService
        └── docx

message.routes.ts
    │
    ├── authMiddleware
    ├── zodValidate
    ├── groupMembershipGuard (for group routes)
    │   └── lib/prisma.ts
    │
    └── chat.service.ts
        ├── lib/prisma.ts
        └── socket.service.ts (emitToUser, emitToGroup)

document.routes.ts
    │
    ├── authMiddleware
    ├── zodValidate
    │
    └── document.service.ts
        ├── lib/prisma.ts
        └── notification.service.ts
            └── socket.service.ts

socket.service.ts (WebRTC section)
    └── webrtcSignaling.service.ts
        └── socket.service.ts (emitToUser)
```

---

## 8. Route Summary

```typescript
// backend/src/routes/ai.routes.ts
router.post('/summarize', authMiddleware, upload.single('file'), summarizeHandler);
router.post('/create-document', authMiddleware, zodValidate(CreateDocumentRequestSchema), createDocumentHandler);
router.post('/generate-docx', authMiddleware, zodValidate(GenerateDocxSchema), generateDocxHandler);

// backend/src/routes/message.routes.ts
router.get('/direct/:userId', authMiddleware, zodValidate(MessageListQuerySchema, 'query'), getDirectMessagesHandler);
router.post('/direct', authMiddleware, zodValidate(SendDirectMessageSchema), sendDirectMessageHandler);
router.get('/group/:groupId', authMiddleware, groupMembershipGuard, zodValidate(MessageListQuerySchema, 'query'), getGroupMessagesHandler);
router.post('/group', authMiddleware, zodValidate(SendGroupMessageSchema), groupMembershipGuard, sendGroupMessageHandler);
router.patch('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(EditMessageSchema), editMessageHandler);
router.delete('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), deleteMessageHandler);
router.post('/:id/read', authMiddleware, zodValidate(IdParamSchema, 'params'), markAsReadHandler);

// backend/src/routes/group.routes.ts
router.get('/', authMiddleware, listGroupsHandler);
router.post('/', authMiddleware, zodValidate(CreateGroupSchema), createGroupHandler);
router.get('/:id', authMiddleware, groupMembershipGuard, getGroupHandler);
router.post('/:id/members', authMiddleware, zodValidate(IdParamSchema, 'params'), addMemberHandler);
router.delete('/:id/members/:userId', authMiddleware, zodValidate(IdParamSchema, 'params'), removeMemberHandler);

// backend/src/routes/document.routes.ts
router.get('/', authMiddleware, listDocumentsHandler);
router.post('/', authMiddleware, zodValidate(CreateDocumentSchema), createDocumentHandler);
router.get('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), getDocumentHandler);
router.patch('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(UpdateDocumentSchema), updateDocumentHandler);
router.delete('/:id', authMiddleware, zodValidate(IdParamSchema, 'params'), deleteDocumentHandler);
router.post('/:id/share', authMiddleware, zodValidate(IdParamSchema, 'params'), zodValidate(ShareDocumentSchema), shareDocumentHandler);

// backend/src/routes/upload.routes.ts
router.post('/', authMiddleware, upload.single('file'), uploadFileHandler);
```
