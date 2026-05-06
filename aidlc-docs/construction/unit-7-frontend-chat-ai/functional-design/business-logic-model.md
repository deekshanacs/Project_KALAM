# Business Logic Model — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## 1. Chat Message Flow

### 1.1 Send Direct Message
```
User types message → MessageComposer
  → POST /api/messages/direct { receiverId, content, type }
  → Optimistic update: append message to thread immediately
  → On success: replace optimistic message with server response
  → On error: remove optimistic message, show toast error
  → Socket.io 'message:new' event also updates thread for receiver
```

### 1.2 WebRTC Call Flow
```
User clicks Call button in DM thread
  → useWebRTC.startCall(targetUserId)
  → navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  → Create RTCPeerConnection with STUN config
  → Add local media tracks to connection
  → Create offer: pc.createOffer()
  → Set local description: pc.setLocalDescription(offer)
  → Emit via socket: 'webrtc:offer' { targetUserId, offer }
  → Callee receives 'webrtc:offer' → show incoming call UI
  → Callee accepts → getUserMedia → createAnswer → setLocalDescription
  → Emit 'webrtc:answer' { targetUserId, answer }
  → Caller receives answer → setRemoteDescription
  → ICE candidates exchanged via 'webrtc:ice-candidate' events
  → Connection established → render remote video stream
```

### 1.3 AI Summarizer Flow
```
User drags file onto FileUploader
  → Validate: size ≤ 10MB, type in allowed list
  → POST /api/ai/summarize (multipart/form-data)
  → Show loading skeleton in SummaryCard
  → On success: render { summary, keyPoints, analysis } in SummaryCard
  → On error: show error state with retry button
```

### 1.4 AI Creator Streaming Flow
```
User enters document description
  → SetupQuestions renders 10 questions sequentially
  → User selects option for each question
  → All 10 answered → POST /api/ai/create-document (SSE)
  → useAIStream reads ReadableStream chunks
  → Each chunk appended to previewContent state
  → DocumentPreview re-renders with accumulated content
  → On done: show Download DOCX button
  → User clicks download → generate DOCX in browser → trigger download
```

### 1.5 Document Auto-Save Flow
```
User edits document in TipTap editor
  → editor.on('update') fires
  → Debounce timer reset (2000ms)
  → After 2000ms idle: PATCH /api/documents/:id { content: editor.getJSON() }
  → Show "Saving..." indicator during request
  → On success: show "Saved" indicator
  → On unmount: cancel debounce, save immediately if dirty
```

---

## 2. Component State Management

### 2.1 Chat State (useChat hook)
```typescript
interface ChatState {
  conversations: Map<string, MessageWithSender[]>; // userId → messages
  groupMessages: Map<string, MessageWithSender[]>; // groupId → messages
  activeConversation: { type: 'dm' | 'group'; id: string } | null;
  unreadCounts: Map<string, number>;
  isLoading: boolean;
}
```

### 2.2 AI Stream State (useAIStream hook)
```typescript
interface AIStreamState {
  isStreaming: boolean;
  content: string;        // accumulated chunks
  isDone: boolean;
  error: string | null;
}
```

### 2.3 Document Editor State (useDocumentEditor hook)
```typescript
interface DocumentEditorState {
  document: Document | null;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
}
```
