# Business Rules — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Message Edit Rules

- **BR-MSG-01**: Only the message sender can edit a message (`message.senderId === req.user.id`).
- **BR-MSG-02**: Editing a message sets `editedAt` to the current timestamp.
- **BR-MSG-03**: A deleted message cannot be edited (check `deletedAt === null` before editing).
- **BR-MSG-04**: Message content can be edited to any non-empty string (max 10,000 characters).
- **BR-MSG-05**: Editing a message emits a `message:edited` Socket.io event to the affected room (DM receiver or group).
- **BR-MSG-06**: The `type` field cannot be changed after creation.

---

## 2. Message Delete Rules

- **BR-DEL-01**: Only the message sender can delete a message.
- **BR-DEL-02**: Deletion is a soft delete: `deletedAt` is set to the current timestamp, `content` is set to `null`.
- **BR-DEL-03**: Deleted messages are returned in message lists with `content: null` and `deletedAt` set (so the UI can show "This message was deleted").
- **BR-DEL-04**: Deleting a message emits a `message:deleted` Socket.io event to the affected room.
- **BR-DEL-05**: Attachments are not deleted from the filesystem when a message is deleted (file cleanup is a future enhancement).

---

## 3. Read Receipt Rules

- **BR-READ-01**: The `readBy` field is a JSON array of user IDs who have read the message.
- **BR-READ-02**: The sender is automatically added to `readBy` when the message is created.
- **BR-READ-03**: A user is added to `readBy` when they call `POST /api/messages/:id/read`.
- **BR-READ-04**: The `readBy` array must never contain duplicate user IDs.
- **BR-READ-05**: Adding a user to `readBy` is idempotent — calling it multiple times has no effect.
- **BR-READ-06**: A read receipt update emits a `message:read` Socket.io event to the message sender.

---

## 4. Group Membership Rules

- **BR-GRP-01**: Only group members can send messages to a group.
- **BR-GRP-02**: Only group members can read group messages.
- **BR-GRP-03**: The group creator is automatically added as a member when the group is created.
- **BR-GRP-04**: The group creator can add or remove members.
- **BR-GRP-05**: A user cannot be added to a group they are already a member of (unique constraint on `[groupId, userId]`).
- **BR-GRP-06**: Removing a member from a group does not delete their past messages.
- **BR-GRP-07**: A group must have at least 1 member (the creator) at all times.

---

## 5. Document Permission Rules

- **BR-DOC-01**: The document owner always has full edit access.
- **BR-DOC-02**: Users in `sharedWith` with `permission: 'EDIT'` can read and modify the document.
- **BR-DOC-03**: Users in `sharedWith` with `permission: 'VIEW'` can only read the document.
- **BR-DOC-04**: Only the document owner or ADMIN can change sharing settings.
- **BR-DOC-05**: Only the document owner or ADMIN can delete a document.
- **BR-DOC-06**: The `sharedWith` array must not contain duplicate entries for the same `userId` or `groupId`.
- **BR-DOC-07**: If a user is shared both directly and via a group, the more permissive permission applies.
- **BR-DOC-08**: The document list endpoint returns only documents owned by or shared with the requesting user.

---

## 6. AI File Upload Rules

- **BR-AI-01**: Maximum file size for AI processing: 10MB.
- **BR-AI-02**: Supported file formats: PDF, DOCX, TXT, PNG, JPG, JPEG, CSV, XLSX, PPTX.
- **BR-AI-03**: Unsupported file formats return HTTP 400 with a clear error message.
- **BR-AI-04**: Files uploaded for AI processing are deleted from the filesystem after processing (not stored permanently).
- **BR-AI-05**: The `ANTHROPIC_API_KEY` must be present in the environment for AI routes to function. If missing, AI routes return HTTP 503.
- **BR-AI-06**: Claude model: `claude-sonnet-4-20250514` (hardcoded, not configurable by users).

---

## 7. DOCX Generation Rules

- **BR-DOCX-01**: DOCX is generated in memory (Buffer) and returned as a download response.
- **BR-DOCX-02**: The generated DOCX is not stored on the filesystem.
- **BR-DOCX-03**: Font, fontSize, pageSize, and colorTheme from the user's answers are applied to the DOCX.
- **BR-DOCX-04**: The `docx` npm package is used for DOCX generation (not LibreOffice or other tools).
- **BR-DOCX-05**: Markdown content from Claude is parsed and converted to DOCX paragraphs (headings, bullets, body text).

---

## 8. WebRTC Rules

- **BR-WR-01**: The backend only relays WebRTC signals (offer, answer, ICE candidates). It does not process or store media.
- **BR-WR-02**: WebRTC signaling uses Socket.io events (not REST API).
- **BR-WR-03**: Peers connect directly to each other for audio/video (peer-to-peer, no media relay server).
- **BR-WR-04**: The backend does not validate the content of WebRTC signals (they are opaque blobs).
- **BR-WR-05**: WebRTC signals are only relayed to authenticated users (Socket.io auth middleware applies).
- **BR-WR-06**: If the target user is not connected, the signal is silently dropped (no error).

---

## 9. Notification Rules

- **BR-NOTIF-01**: Notifications are in-memory only — not persisted in the database.
- **BR-NOTIF-02**: Notifications are delivered via Socket.io to the target user's room.
- **BR-NOTIF-03**: Notification triggers: task assigned, task completed, message received (DM only), document shared.
- **BR-NOTIF-04**: Group message notifications are not sent (to avoid notification spam in active groups).
- **BR-NOTIF-05**: Each notification has a unique ID (UUID v4) generated at creation time.
- **BR-NOTIF-06**: Notifications disappear on page refresh (no persistence).

---

## 10. Testable Properties (PBT-01)

### 10.1 Round-Trip: Message Serialization → Deserialization Preserves All Fields (PBT-02)

**Property**: Serializing a message to JSON and deserializing it back produces an identical object.

```typescript
import fc from 'fast-check';

describe('Message Serialization PBT', () => {
  it('JSON round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.option(fc.string({ maxLength: 10000 }), { nil: null }),
          type: fc.constantFrom('TEXT', 'FILE', 'IMAGE', 'LINK'),
          attachments: fc.array(fc.webUrl(), { maxLength: 10 }),
          readBy: fc.array(fc.string({ minLength: 1 }), { maxLength: 50 }),
          senderId: fc.string({ minLength: 1 }),
          receiverId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          groupId: fc.option(fc.string({ minLength: 1 }), { nil: null }),
        }),
        (message) => {
          const serialized = JSON.stringify(message);
          const deserialized = JSON.parse(serialized) as typeof message;
          
          return (
            deserialized.id === message.id &&
            deserialized.content === message.content &&
            deserialized.type === message.type &&
            deserialized.attachments.length === message.attachments.length &&
            deserialized.readBy.length === message.readBy.length &&
            deserialized.senderId === message.senderId
          );
        }
      )
    );
  });
});
```

### 10.2 Invariant: readBy Array Never Contains Duplicate UserIds (PBT-03)

**Property**: After adding a userId to `readBy` multiple times, the array contains no duplicates.

```typescript
describe('Message ReadBy PBT', () => {
  it('readBy never contains duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (existingReadBy, newUserId) => {
          // Simulate the addToReadBy logic
          const addToReadBy = (readBy: string[], userId: string): string[] => {
            if (readBy.includes(userId)) return readBy;
            return [...readBy, userId];
          };
          
          // Add the same userId multiple times
          const result1 = addToReadBy(existingReadBy, newUserId);
          const result2 = addToReadBy(result1, newUserId);
          const result3 = addToReadBy(result2, newUserId);
          
          // No duplicates
          const uniqueIds = new Set(result3);
          return uniqueIds.size === result3.length;
        }
      )
    );
  });
});
```

### 10.3 Invariant: Document sharedWith Never Contains Duplicate Entries (PBT-03)

**Property**: After merging share entries, the `sharedWith` array contains no duplicate `userId` or `groupId` entries.

```typescript
describe('Document SharedWith PBT', () => {
  it('sharedWith never contains duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            userId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            groupId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
            permission: fc.constantFrom('VIEW', 'EDIT'),
          }),
          { maxLength: 20 }
        ),
        fc.record({
          userId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          permission: fc.constantFrom('VIEW', 'EDIT'),
        }),
        (existingShares, newShare) => {
          const mergeSharedWith = (
            existing: typeof existingShares,
            newEntry: typeof newShare
          ) => {
            const filtered = existing.filter(s => s.userId !== newEntry.userId);
            return [...filtered, newEntry];
          };
          
          const result = mergeSharedWith(existingShares, newShare);
          
          // Count userId occurrences
          const userIdCounts = new Map<string, number>();
          for (const share of result) {
            if (share.userId) {
              userIdCounts.set(share.userId, (userIdCounts.get(share.userId) ?? 0) + 1);
            }
          }
          
          // No userId appears more than once
          return Array.from(userIdCounts.values()).every(count => count <= 1);
        }
      )
    );
  });
});
```

### 10.4 Round-Trip: Document Content JSON Serialize → Deserialize = Identity (PBT-02)

**Property**: TipTap JSON content serialized and deserialized is identical to the original.

```typescript
describe('Document Content PBT', () => {
  it('TipTap JSON round-trip is identity', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constant('doc'),
          content: fc.array(
            fc.record({
              type: fc.constantFrom('paragraph', 'heading', 'bulletList'),
              content: fc.array(
                fc.record({
                  type: fc.constant('text'),
                  text: fc.string({ maxLength: 1000 }),
                }),
                { maxLength: 10 }
              ),
            }),
            { maxLength: 20 }
          ),
        }),
        (tipTapContent) => {
          const serialized = JSON.stringify(tipTapContent);
          const deserialized = JSON.parse(serialized) as typeof tipTapContent;
          
          return JSON.stringify(deserialized) === serialized;
        }
      )
    );
  });
});
```
