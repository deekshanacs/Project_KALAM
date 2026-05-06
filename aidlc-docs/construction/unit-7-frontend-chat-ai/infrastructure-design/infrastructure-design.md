# Infrastructure Design — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## WebRTC
- STUN server: `stun:stun.l.google.com:19302` (public, no credentials required)
- No TURN server for MVP (NAT traversal may fail on symmetric NAT — documented limitation)
- Signaling relay: Socket.io events via existing backend connection
- Media: browser `getUserMedia` API, no server-side media processing

## AI Streaming
- Transport: `fetch` API with `ReadableStream` (POST request, not EventSource)
- No additional infrastructure; uses existing backend `/api/ai/create-document` endpoint
- CORS: backend already configured for frontend origin

## TipTap Editor
- Client-side only; no server-side rendering
- Content stored as TipTap JSON in Document.content field
- Auto-save via PATCH `/api/documents/:id`

## DOCX Download (Client-Side)
- `docx` npm package generates DOCX in browser memory
- Download triggered via `URL.createObjectURL(new Blob([buffer]))` + `<a>` click
- No server round-trip for DOCX generation (uses accumulated streaming content)

## File Upload (Chat Attachments)
- POST `/api/upload` (multipart) → returns `{ url: string }`
- URL stored in message.attachments array
- Images served from backend `/uploads` static path
