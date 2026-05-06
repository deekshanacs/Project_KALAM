# Frontend Components — Unit 7: Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## 1. ChatPage (`/pages/Chat.tsx`)
**Props**: none  
**State**: activeConversation, isMobile  
**Layout**: 3-column (DM/Group list | Thread | optional call overlay)  
**data-testid**: `chat-page`

---

## 2. DMList (`/components/chat/DMList.tsx`)
**Props**: `{ onSelect: (userId: string) => void; activeUserId?: string }`  
**State**: conversations fetched from API  
**Behaviors**: shows avatar, name, last message preview, unread badge  
**data-testid**: `dm-list`, `dm-item-{userId}`

---

## 3. GroupList (`/components/chat/GroupList.tsx`)
**Props**: `{ onSelect: (groupId: string) => void; activeGroupId?: string }`  
**State**: groups from API  
**data-testid**: `group-list`, `group-item-{groupId}`

---

## 4. MessageThread (`/components/chat/MessageThread.tsx`)
**Props**: `{ conversationType: 'dm' | 'group'; targetId: string }`  
**State**: messages[], isLoading, hasMore (pagination)  
**Behaviors**: virtual scroll (react-window), auto-scroll to bottom on new message, IntersectionObserver for read receipts  
**data-testid**: `message-thread`

---

## 5. MessageBubble (`/components/chat/MessageBubble.tsx`)
**Props**: `{ message: MessageWithSender; isOwn: boolean }`  
**State**: isHovered (show edit/delete)  
**Behaviors**: show "(edited)" label, show "This message was deleted" for deleted, read receipt avatars  
**data-testid**: `message-bubble-{messageId}`, `message-edit-btn`, `message-delete-btn`

---

## 6. MessageComposer (`/components/chat/MessageComposer.tsx`)
**Props**: `{ onSend: (content: string, attachments?: File[]) => void }`  
**State**: content, attachments[], isEmojiPickerOpen  
**Behaviors**: Enter to send, Shift+Enter for newline, file attach button, emoji picker (emoji-mart)  
**data-testid**: `message-composer`, `message-input`, `message-send-btn`, `message-attach-btn`

---

## 7. GroupModal (`/components/chat/GroupModal.tsx`)
**Props**: `{ isOpen: boolean; onClose: () => void; onCreated: (group: Group) => void }`  
**State**: name, selectedUserIds[]  
**data-testid**: `group-modal`, `group-name-input`, `group-create-btn`

---

## 8. CallOverlay (`/components/chat/CallOverlay.tsx`)
**Props**: `{ localStream: MediaStream | null; remoteStream: MediaStream | null; onEnd: () => void }`  
**State**: isMuted, isVideoOff  
**Behaviors**: renders local + remote video elements, mute/video toggle, end call button  
**data-testid**: `call-overlay`, `call-end-btn`, `call-mute-btn`, `call-video-btn`

---

## 9. AIToolsPage (`/pages/AITools.tsx`)
**Props**: none  
**State**: activeTab: 'summarizer' | 'creator'  
**data-testid**: `ai-tools-page`, `ai-tab-summarizer`, `ai-tab-creator`

---

## 10. FileUploader (`/components/ai/FileUploader.tsx`)
**Props**: `{ onFileSelected: (file: File) => void; accept: string; maxSizeMB: number }`  
**State**: isDragging, error  
**Behaviors**: drag-and-drop + click to browse, validate size/type, show error  
**data-testid**: `file-uploader`, `file-input`

---

## 11. SummaryCard (`/components/ai/SummaryCard.tsx`)
**Props**: `{ summary: AISummaryDto | null; isLoading: boolean; error: string | null }`  
**Behaviors**: skeleton while loading, formatted sections (Summary / Key Points / Analysis)  
**data-testid**: `summary-card`, `summary-retry-btn`

---

## 12. DocCreator (`/components/ai/DocCreator.tsx`)
**Props**: none  
**State**: description, answers (10 fields), phase: 'describe' | 'questions' | 'preview'  
**data-testid**: `doc-creator`, `doc-description-input`, `doc-generate-btn`

---

## 13. SetupQuestions (`/components/ai/SetupQuestions.tsx`)
**Props**: `{ onComplete: (answers: CreateDocumentAnswers) => void }`  
**State**: currentQuestion (0-9), answers  
**Behaviors**: renders one question at a time with option buttons, progress indicator  
**data-testid**: `setup-questions`, `question-option-{value}`

---

## 14. DocumentPreview (`/components/ai/DocumentPreview.tsx`)
**Props**: `{ content: string; isStreaming: boolean; onDownload: () => void }`  
**Behaviors**: renders markdown as styled HTML, streaming cursor animation, download button  
**data-testid**: `document-preview`, `download-docx-btn`

---

## 15. DocumentsPage (`/pages/Documents.tsx`)
**Props**: none  
**State**: documents[], activeDocumentId, isEditorOpen  
**data-testid**: `documents-page`

---

## 16. DocList (`/components/documents/DocList.tsx`)
**Props**: `{ documents: Document[]; onOpen: (id: string) => void; onShare: (id: string) => void }`  
**data-testid**: `doc-list`, `doc-item-{docId}`, `doc-open-btn-{docId}`, `doc-share-btn-{docId}`

---

## 17. DocEditor (`/components/documents/DocEditor.tsx`)
**Props**: `{ documentId: string; readOnly?: boolean }`  
**State**: editor (TipTap instance), saveStatus  
**Behaviors**: TipTap editor with toolbar (bold, italic, headings, lists, links), auto-save debounce 2s  
**data-testid**: `doc-editor`, `doc-save-status`

---

## 18. ShareModal (`/components/documents/ShareModal.tsx`)
**Props**: `{ documentId: string; isOpen: boolean; onClose: () => void }`  
**State**: searchQuery, searchResults, selectedUsers, permission  
**Behaviors**: search users by name/email, select permission (VIEW/EDIT), copy link button  
**data-testid**: `share-modal`, `share-user-search`, `share-permission-select`, `share-copy-link-btn`, `share-submit-btn`
