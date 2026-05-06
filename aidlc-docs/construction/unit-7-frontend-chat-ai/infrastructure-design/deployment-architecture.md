# Deployment Architecture — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

Same as Unit 5: Vercel static SPA deployment.

**Additional notes**:
- WebRTC STUN dependency: `stun:stun.l.google.com:19302` — public Google STUN server, no cost, no configuration needed.
- TURN server limitation: peer-to-peer WebRTC may fail when both peers are behind symmetric NAT. For production, add a TURN server (e.g., Twilio TURN, Coturn). Documented as future enhancement.
- AI streaming: works over standard HTTPS; no special Vercel configuration needed.
- TipTap: client-side bundle; no server-side rendering required.
