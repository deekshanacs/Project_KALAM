# Code Generation Plan — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

**Unit**: Frontend Chat, AI Tools & Documents  
**Stories**: US-CHAT-01–05, US-AI-01–02, US-DOC-01–02  
**Dependencies**: Unit 5 (layout, auth, socket), Unit 4 (chat/AI/docs API)

---

## Execution Checklist

### Step 1: Chat Hooks
- [x] Create `frontend/src/hooks/useChat.ts` (fetch DM/group messages, send, edit, delete, markAsRead via IntersectionObserver, listen to socket message:new + message:edited + message:deleted events, manage unread counts)
- [x] Create `frontend/src/hooks/useWebRTC.ts` (RTCPeerConnection lifecycle, getUserMedia, createOffer/Answer, ICE candidates via socket events webrtc:offer/answer/ice-candidate/call-end, localStream + remoteStream refs)

### Step 2: Chat Components
- [x] Create `frontend/src/components/chat/DMList.tsx` (list of DM conversations: Avatar, name, last message preview, unread badge; data-testid: dm-list, dm-item-{userId})
- [x] Create `frontend/src/components/chat/GroupList.tsx` (list of groups: name, unread badge, create group button; data-testid: group-list)
- [x] Create `frontend/src/components/chat/MessageThread.tsx` (react-window FixedSizeList, auto-scroll to bottom on new message, IntersectionObserver for read receipts; data-testid: message-thread)
- [x] Create `frontend/src/components/chat/MessageBubble.tsx` (own vs other styling, edit/delete on hover for own messages, "(edited)" label, deleted placeholder, read receipt avatars, DOMPurify sanitize content; data-testid: message-bubble-{messageId})
- [x] Create `frontend/src/components/chat/MessageComposer.tsx` (textarea, Enter to send, Shift+Enter newline, emoji picker toggle, file attach button, send button; data-testid: message-composer, message-input, message-send-btn)
- [x] Create `frontend/src/components/chat/GroupModal.tsx` (Radix Dialog: group name input, user search + multi-select, create button; data-testid: group-modal)
- [x] Create `frontend/src/components/chat/CallOverlay.tsx` (local + remote video elements, mute/video toggle buttons, end call button, incoming call notification; data-testid: call-overlay, call-end-btn)
- [x] Create `frontend/src/pages/Chat.tsx` (3-column layout: DMList + GroupList | MessageThread | CallOverlay; data-testid: chat-page)

### Step 3: AI Stream Hook
- [x] Create `frontend/src/hooks/useAIStream.ts` (fetch + ReadableStream SSE consumption, accumulate chunks, handle done/error events, reset function)

### Step 4: AI Tools Components
- [x] Create `frontend/src/components/ai/FileUploader.tsx` (drag-and-drop zone + click to browse, validate size ≤ 10MB + MIME type, error display; data-testid: file-uploader, file-input)
- [x] Create `frontend/src/components/ai/SummaryCard.tsx` (skeleton while loading, sections: Summary / Key Points / Analysis, retry button on error; data-testid: summary-card, summary-retry-btn)
- [x] Create `frontend/src/components/ai/SetupQuestions.tsx` (10 questions rendered one at a time, option buttons, progress indicator 1/10 → 10/10; data-testid: setup-questions, question-option-{value})
- [x] Create `frontend/src/components/ai/DocumentPreview.tsx` (render accumulated markdown as HTML via marked, streaming cursor animation while isStreaming, Download DOCX button when isDone; data-testid: document-preview, download-docx-btn)
- [x] Create `frontend/src/components/ai/DocCreator.tsx` (phase machine: describe → questions → preview; description textarea, SetupQuestions, DocumentPreview; data-testid: doc-creator)
- [x] Create `frontend/src/pages/AITools.tsx` (tab switcher: Summarizer | Creator; FileUploader + SummaryCard for summarizer; DocCreator for creator; data-testid: ai-tools-page)

### Step 5: Document Editor Hook
- [x] Create `frontend/src/hooks/useDocumentEditor.ts` (TipTap editor instance, auto-save debounce 2000ms, save on unmount if dirty, saveStatus state)
- [x] Create `frontend/src/hooks/useDocumentShare.ts` (user search, share submission, copy link)

### Step 6: Document Components
- [x] Create `frontend/src/components/documents/DocList.tsx` (list of documents: title, owner, last updated, open + share buttons; data-testid: doc-list, doc-item-{docId})
- [x] Create `frontend/src/components/documents/DocEditor.tsx` (TipTap editor with toolbar: bold, italic, h1/h2/h3, bullet list, ordered list, link; save status indicator; read-only mode; data-testid: doc-editor, doc-save-status)
- [x] Create `frontend/src/components/documents/ShareModal.tsx` (Radix Dialog: user search input, search results list, permission select VIEW/EDIT, copy link button, submit button; data-testid: share-modal, share-user-search, share-submit-btn)
- [x] Create `frontend/src/pages/Documents.tsx` (DocList + DocEditor side-by-side or modal; data-testid: documents-page)

### Step 7: DOCX Client-Side Generation Utility
- [x] Create `frontend/src/utils/docxExport.ts` (generateAndDownloadDocx(content, options): uses docx npm package to build Document, Packer.toBuffer, Blob URL download trigger)

### Step 8: Unit Tests
- [x] Create `frontend/src/hooks/__tests__/useAIStream.test.ts` (example-based: chunk accumulation; PBT: chunks concatenated = complete content)
- [x] Create `frontend/src/utils/__tests__/docxExport.test.ts` (example-based: generates buffer from content)
- [x] Create `frontend/src/components/chat/__tests__/MessageBubble.test.tsx` (example-based: renders own vs other, deleted state, edited label)

### Step 9: Documentation
- [x] Create `aidlc-docs/construction/unit-7-frontend-chat-ai/code/unit-7-summary.md`

---

## Story Coverage
- US-CHAT-01: DMList + MessageThread + MessageComposer + socket real-time
- US-CHAT-02: GroupList + GroupModal + group MessageThread
- US-CHAT-03: MessageComposer file attach + image inline rendering
- US-CHAT-04: MessageBubble edit/delete on hover
- US-CHAT-05: CallOverlay + useWebRTC + socket signaling
- US-AI-01: FileUploader + SummaryCard + POST /ai/summarize
- US-AI-02: DocCreator + SetupQuestions + DocumentPreview streaming + DOCX download
- US-DOC-01: DocEditor (TipTap) + auto-save
- US-DOC-02: ShareModal + POST /documents/:id/share

