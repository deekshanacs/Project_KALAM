# Domain Entities — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 domain entities cover the chat layer (Message, Group), the document layer (Document with sharing), AI DTOs, and WebRTC signal DTOs.

---

## 2. Message Entity

### 2.1 Prisma Model (defined in Unit 1)

```prisma
model Message {
  id          String      @id @default(cuid())
  content     String?                          // null when soft-deleted
  type        MessageType @default(TEXT)
  attachments Json        @default("[]")       // string[] of file URLs
  readBy      Json        @default("[]")       // string[] of userIds who have read
  editedAt    DateTime?                        // set on first edit
  deletedAt   DateTime?                        // soft delete timestamp

  senderId    String
  receiverId  String?                          // set for DMs, null for group messages
  groupId     String?                          // set for group messages, null for DMs

  sender      User        @relation("MessageSender", fields: [senderId], references: [id])
  receiver    User?       @relation("MessageReceiver", fields: [receiverId], references: [id])
  group       Group?      @relation(fields: [groupId], references: [id])

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("messages")
}
```

### 2.2 TypeScript Interface

```typescript
// In @tms/shared
export interface Message {
  id: string;
  content: string | null;              // null = deleted
  type: MessageType;
  attachments: string[];               // array of file URLs
  readBy: string[];                    // array of userIds
  editedAt: string | null;             // ISO 8601
  deletedAt: string | null;            // ISO 8601, soft delete
  senderId: string;
  receiverId: string | null;           // DM target
  groupId: string | null;              // group target
  createdAt: string;
  updatedAt: string;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}
```

### 2.3 Message Type Semantics

| Type | Content | Attachments | Use Case |
|---|---|---|---|
| `TEXT` | Rich text string | Optional | Standard chat message |
| `FILE` | Optional caption | File URL(s) | Document/file share |
| `IMAGE` | Optional caption | Image URL(s) | Image share |
| `LINK` | URL string | None | Link with preview card |

---

## 3. Group Entity

### 3.1 Prisma Models (defined in Unit 1)

```prisma
model Group {
  id          String        @id @default(cuid())
  name        String
  createdById String

  createdBy   User          @relation("GroupCreator", fields: [createdById], references: [id])
  members     GroupMember[]
  messages    Message[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("groups")
}

model GroupMember {
  id        String   @id @default(cuid())
  groupId   String
  userId    String

  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  joinedAt  DateTime @default(now())

  @@unique([groupId, userId])
  @@map("group_members")
}
```

### 3.2 TypeScript Interfaces

```typescript
export interface Group {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
      role: Role;
      availabilityStatus: AvailabilityStatus;
    };
    joinedAt: string;
  }>;
  _count: {
    messages: number;
  };
}

export interface GroupWithLastMessage extends Group {
  members: GroupMember[];
  lastMessage: MessageWithSender | null;
  unreadCount: number;  // computed, not stored
}
```

---

## 4. Document Entity

### 4.1 Prisma Model (defined in Unit 1)

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  content     Json     @default("{}")          // TipTap JSON content
  font        String   @default("Inter")
  fontSize    Int      @default(12)
  theme       String   @default("light")
  pageSize    String   @default("A4")
  sharedWith  Json     @default("[]")          // DocumentShare[]

  ownerId     String
  owner       User     @relation("DocumentOwner", fields: [ownerId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("documents")
}
```

### 4.2 TypeScript Interfaces

```typescript
export interface Document {
  id: string;
  title: string;
  content: Record<string, unknown>;    // TipTap JSON
  font: string;
  fontSize: number;
  theme: string;
  pageSize: string;
  sharedWith: DocumentShare[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentShare {
  userId?: string;
  groupId?: string;
  permission: 'VIEW' | 'EDIT';
}

export interface DocumentWithOwner extends Document {
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

// Document list item (without full content for performance)
export interface DocumentListItem {
  id: string;
  title: string;
  font: string;
  fontSize: number;
  theme: string;
  pageSize: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  sharedWith: DocumentShare[];
  createdAt: string;
  updatedAt: string;
  // content is NOT included in list view
}
```

---

## 5. AI DTOs

### 5.1 AISummaryDto

```typescript
export interface AISummaryDto {
  summary: string;                     // 2-3 paragraph summary
  keyPoints: string[];                 // 5-10 key points
  analysis: string;                    // detailed analysis
}
```

### 5.2 CreateDocumentRequestDto

```typescript
export interface CreateDocumentAnswers {
  type: string;                        // e.g., 'Report', 'Proposal', 'Letter'
  tone: string;                        // e.g., 'Professional', 'Casual', 'Academic'
  font: string;                        // e.g., 'Calibri', 'Times New Roman', 'Arial'
  fontSize: number;                    // e.g., 11, 12, 14
  pageSize: 'A4' | 'Letter' | 'Legal';
  toc: boolean;                        // include table of contents
  sections: number;                    // number of sections (1-10)
  colorTheme: string;                  // e.g., 'Blue', 'Green', 'Monochrome'
  headerFooter: boolean;               // include header/footer
  outputFormat: 'DOCX' | 'PDF' | 'Markdown';
}

export interface CreateDocumentRequestDto {
  description: string;                 // user's document description
  answers: CreateDocumentAnswers;
}
```

### 5.3 Zod Schemas for AI DTOs

```typescript
// backend/src/schemas/ai.schemas.ts
import { z } from 'zod';

export const CreateDocumentRequestSchema = z.object({
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description too long'),
  answers: z.object({
    type: z.string().min(1).max(50),
    tone: z.string().min(1).max(50),
    font: z.string().min(1).max(50),
    fontSize: z.number().int().min(8).max(72),
    pageSize: z.enum(['A4', 'Letter', 'Legal']),
    toc: z.boolean(),
    sections: z.number().int().min(1).max(20),
    colorTheme: z.string().min(1).max(50),
    headerFooter: z.boolean(),
    outputFormat: z.enum(['DOCX', 'PDF', 'Markdown']),
  }),
});

export const GenerateDocxSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  options: z.object({
    title: z.string().max(200).optional(),
    font: z.string().max(50).optional(),
    fontSize: z.number().int().min(8).max(72).optional(),
    pageSize: z.enum(['A4', 'Letter', 'Legal']).optional(),
    colorTheme: z.string().max(50).optional(),
    headerFooter: z.boolean().optional(),
  }),
});
```

---

## 6. ShareDocumentDto

```typescript
// backend/src/schemas/document.schemas.ts
import { z } from 'zod';

export const ShareDocumentSchema = z.object({
  userIds: z.array(z.string().cuid()).optional(),
  groupIds: z.array(z.string().cuid()).optional(),
  permission: z.enum(['VIEW', 'EDIT']),
}).refine(
  (data) => (data.userIds?.length ?? 0) + (data.groupIds?.length ?? 0) > 0,
  { message: 'Must specify at least one user or group to share with' }
);

export type ShareDocumentDto = z.infer<typeof ShareDocumentSchema>;
```

---

## 7. WebRTC Signal DTOs

### 7.1 Client → Server Events

```typescript
// Socket.io event payloads (client sends these)

export interface WebRTCOfferEvent {
  targetUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerEvent {
  targetUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidateEvent {
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCCallEndEvent {
  targetUserId: string;
}
```

### 7.2 Server → Client Events (Relayed)

```typescript
// Socket.io event payloads (server relays these)

export interface WebRTCOfferRelayed {
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerRelayed {
  fromUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidateRelayed {
  fromUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCCallEndRelayed {
  fromUserId: string;
}
```

---

## 8. Chat Request/Response DTOs

### 8.1 Message Schemas

```typescript
// backend/src/schemas/message.schemas.ts

export const SendDirectMessageSchema = z.object({
  receiverId: z.string().cuid('Invalid receiver ID'),
  content: z.string().max(10000).optional(),
  type: z.enum(['TEXT', 'FILE', 'IMAGE', 'LINK']).default('TEXT'),
  attachments: z.array(z.string().url()).max(10).default([]),
}).refine(
  (data) => data.content || data.attachments.length > 0,
  { message: 'Message must have content or attachments' }
);

export const SendGroupMessageSchema = z.object({
  groupId: z.string().cuid('Invalid group ID'),
  content: z.string().max(10000).optional(),
  type: z.enum(['TEXT', 'FILE', 'IMAGE', 'LINK']).default('TEXT'),
  attachments: z.array(z.string().url()).max(10).default([]),
}).refine(
  (data) => data.content || data.attachments.length > 0,
  { message: 'Message must have content or attachments' }
);

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100).trim(),
  memberIds: z.array(z.string().cuid()).min(1, 'At least one member required'),
});

export const MessageListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().datetime().optional(),  // cursor-based pagination
});
```

### 8.2 Document Schemas

```typescript
// backend/src/schemas/document.schemas.ts

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  content: z.record(z.unknown()).default({}),  // TipTap JSON
  font: z.string().max(50).default('Inter'),
  fontSize: z.number().int().min(8).max(72).default(12),
  theme: z.enum(['light', 'dark']).default('light'),
  pageSize: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.record(z.unknown()).optional(),
  font: z.string().max(50).optional(),
  fontSize: z.number().int().min(8).max(72).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  pageSize: z.enum(['A4', 'Letter', 'Legal']).optional(),
});
```
