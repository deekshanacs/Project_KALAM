# Business Rules — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## 1. Chat Rules
- **BR-CHAT-01**: Only the message sender sees edit/delete options (checked via `message.senderId === currentUser.id`).
- **BR-CHAT-02**: Edited messages display "(edited)" label after the timestamp.
- **BR-CHAT-03**: Deleted messages display "This message was deleted" placeholder; no content shown.
- **BR-CHAT-04**: Read receipts are marked when a message enters the viewport (IntersectionObserver threshold 0.5).
- **BR-CHAT-05**: Unread badge count resets to 0 when the conversation is opened.
- **BR-CHAT-06**: Message composer sends on Enter key; Shift+Enter inserts newline.
- **BR-CHAT-07**: File attachments in chat: images render inline; other files render as download cards.

## 2. WebRTC Rules
- **BR-WEBRTC-01**: Only 1:1 calls are supported (no group calls).
- **BR-WEBRTC-02**: Call ends for both parties if either disconnects or clicks End Call.
- **BR-WEBRTC-03**: STUN server: `stun:stun.l.google.com:19302` (public, no auth required).
- **BR-WEBRTC-04**: If `getUserMedia` fails (permission denied), show error toast and abort call.
- **BR-WEBRTC-05**: Incoming call notification shown as overlay; callee can accept or decline.

## 3. AI Summarizer Rules
- **BR-AI-01**: Max file size: 10MB. Files exceeding this show an error before upload.
- **BR-AI-02**: Accepted types: PDF, DOCX, TXT, PNG, JPG, CSV, XLSX, PPTX.
- **BR-AI-03**: Loading skeleton shown while waiting for Claude response.
- **BR-AI-04**: On Claude error, show error state with retry button.

## 4. AI Creator Rules
- **BR-AI-05**: All 10 setup questions must be answered before generation starts.
- **BR-AI-06**: Each question shows option buttons; user must click one to proceed to next question.
- **BR-AI-07**: Streaming chunks are appended to preview content in real-time.
- **BR-AI-08**: Download DOCX button only appears after streaming is complete (`isDone === true`).
- **BR-AI-09**: DOCX is generated client-side using the `docx` npm package from the accumulated content.

## 5. Document Rules
- **BR-DOC-01**: Auto-save debounce: 2000ms after last keystroke.
- **BR-DOC-02**: On component unmount, if document is dirty, save immediately (cancel debounce, fire request).
- **BR-DOC-03**: Read-only mode: TipTap editor is non-editable; no save triggers.
- **BR-DOC-04**: Share modal: owner can share with VIEW or EDIT permission.
- **BR-DOC-05**: Copy link generates a shareable URL: `{VITE_API_URL}/documents/{id}`.

## 6. Testable Properties (PBT-01)

### Round-Trip: Message Content Serialize → Deserialize (PBT-02)
```typescript
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 5000 }),
    (content) => {
      const serialized = JSON.stringify({ content });
      const deserialized = JSON.parse(serialized) as { content: string };
      return deserialized.content === content;
    }
  )
);
```

### Invariant: Streaming Chunks Concatenated = Complete Document (PBT-03)
```typescript
fc.assert(
  fc.property(
    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 50 }),
    (chunks) => {
      const accumulated = chunks.reduce((acc, chunk) => acc + chunk, '');
      return accumulated === chunks.join('');
    }
  )
);
```

### Round-Trip: TipTap JSON Serialize → Deserialize = Identity (PBT-02)
```typescript
fc.assert(
  fc.property(
    fc.record({
      type: fc.constant('doc'),
      content: fc.array(
        fc.record({ type: fc.constant('paragraph'), content: fc.array(fc.record({ type: fc.constant('text'), text: fc.string() })) }),
        { maxLength: 10 }
      ),
    }),
    (tiptapJson) => {
      const serialized = JSON.stringify(tiptapJson);
      const deserialized = JSON.parse(serialized);
      return JSON.stringify(deserialized) === serialized;
    }
  )
);
```
