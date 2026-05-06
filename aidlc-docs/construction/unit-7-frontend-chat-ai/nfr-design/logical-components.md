# Logical Components — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## useChat
Manages DM and group message state, send/edit/delete, read receipts, real-time updates.
```typescript
interface UseChatReturn {
  messages: MessageWithSender[];
  isLoading: boolean;
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => void;
}
```

## useWebRTC
Manages RTCPeerConnection lifecycle, signaling via socket, media streams.
```typescript
interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  startCall: (targetUserId: string) => Promise<void>;
  acceptCall: (fromUserId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  endCall: () => void;
}
```

## useAIStream
Manages SSE fetch stream for AI document creation.
```typescript
interface UseAIStreamReturn {
  content: string;
  isStreaming: boolean;
  isDone: boolean;
  error: string | null;
  startStream: (description: string, answers: CreateDocumentAnswers) => Promise<void>;
  reset: () => void;
}
```

## useDocumentEditor
Manages TipTap editor instance, auto-save, save status.
```typescript
interface UseDocumentEditorReturn {
  editor: Editor | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
  forceSave: () => Promise<void>;
}
```

## useDocumentShare
Manages share modal state, user search, share submission.
```typescript
interface UseDocumentShareReturn {
  searchResults: User[];
  search: (query: string) => void;
  share: (userIds: string[], groupIds: string[], permission: 'VIEW' | 'EDIT') => Promise<void>;
  copyLink: () => void;
}
```
