# NFR Requirements — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

---

## Performance
- Message thread renders up to 500 messages using virtual scrolling (react-window) without perceptible lag.
- AI streaming first token appears within 2 seconds of request submission.
- Document editor responds to keystrokes within 16ms (60fps).
- File upload progress shown for files > 1MB.

## Security
- **SECURITY-05**: Message content sanitized with DOMPurify before rendering to prevent XSS.
- **SECURITY-08**: Document editor checks access permission before rendering (read-only vs edit).
- **SECURITY-09**: No API keys in frontend bundle; all AI calls proxied through backend.
- **SECURITY-04**: CSP meta tag prevents inline script execution.

## Accessibility
- Chat messages have ARIA live region (`aria-live="polite"`) for new message announcements.
- Call overlay has ARIA labels on all buttons (mute, video, end call).
- File uploader has keyboard-accessible alternative (click to browse).
- Document editor toolbar buttons have ARIA labels.

## Reliability
- WebRTC: if connection fails after 10 seconds, show "Call failed" message with retry option.
- AI streaming: if stream errors mid-way, show partial content + error message + retry button.
- Document auto-save: if save fails, show "Save failed" with manual retry button; keep dirty state.

## Usability
- Skeleton loaders for message thread, document list, AI response.
- Toast notifications for: message sent, file uploaded, document saved, share successful.
- Responsive: chat layout collapses to single-column on mobile (< 768px).
