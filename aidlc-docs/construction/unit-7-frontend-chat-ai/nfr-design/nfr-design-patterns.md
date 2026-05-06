# NFR Design Patterns — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## 1. Virtual Scroll Pattern (Message Thread)
Use `react-window` `FixedSizeList` for the message thread. Messages are rendered only when in the viewport. On new message, scroll to bottom using `listRef.current.scrollToItem(messages.length - 1)`.

```typescript
<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
  ref={listRef}
  data-testid="message-thread"
>
  {({ index, style }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} isOwn={messages[index].senderId === currentUser.id} />
    </div>
  )}
</FixedSizeList>
```

---

## 2. SSE Consumption Pattern (AI Streaming)
Use `fetch` with `ReadableStream` (not `EventSource`) because the AI create endpoint is a POST request.

```typescript
// hooks/useAIStream.ts
export function useAIStream() {
  const [state, setState] = useState<AIStreamState>({ isStreaming: false, content: '', isDone: false, error: null });

  const startStream = async (description: string, answers: CreateDocumentAnswers) => {
    setState({ isStreaming: true, content: '', isDone: false, error: null });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/create-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ description, answers }),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n\n').filter(Boolean)) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; error?: string };
          if (data.chunk) setState(s => ({ ...s, content: s.content + data.chunk }));
          if (data.done) setState(s => ({ ...s, isStreaming: false, isDone: true }));
          if (data.error) setState(s => ({ ...s, isStreaming: false, error: data.error ?? 'Unknown error' }));
        }
      }
    } catch (err) {
      setState(s => ({ ...s, isStreaming: false, error: 'Stream connection failed' }));
    }
  };

  return { ...state, startStream };
}
```

---

## 3. WebRTC Connection Pattern
```typescript
// hooks/useWebRTC.ts
export function useWebRTC(socket: Socket) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const startCall = async (targetUserId: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit('webrtc:ice-candidate', { targetUserId, candidate: e.candidate }); };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:offer', { targetUserId, offer });
  };

  // Socket event handlers registered in useEffect
  return { startCall, endCall, localStream: localStreamRef.current };
}
```

---

## 4. XSS Prevention Pattern
All message content rendered via `dangerouslySetInnerHTML` must be sanitized first:
```typescript
import DOMPurify from 'dompurify';
const safeHtml = DOMPurify.sanitize(message.content ?? '', { ALLOWED_TAGS: ['b', 'i', 'a', 'br', 'p'] });
<div dangerouslySetInnerHTML={{ __html: safeHtml }} />
```

---

## 5. Auto-Save Pattern (Document Editor)
```typescript
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleEditorUpdate = useCallback(({ editor }: { editor: Editor }) => {
  setIsDirty(true);
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(async () => {
    await saveDocument(editor.getJSON());
  }, 2000);
}, [saveDocument]);

// On unmount: save immediately if dirty
useEffect(() => {
  return () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (isDirtyRef.current) void saveDocument(editorRef.current?.getJSON());
  };
}, []);
```
