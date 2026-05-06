# Tech Stack Decisions — Unit 7: Frontend Chat, AI Tools & Documents
## TMS (Project KALAM)

| Package | Version | Purpose |
|---|---|---|
| `@tiptap/react` | `2.4.0` | Rich text editor React integration |
| `@tiptap/starter-kit` | `2.4.0` | TipTap core extensions bundle |
| `@tiptap/extension-link` | `2.4.0` | Link extension for TipTap |
| `@tiptap/extension-placeholder` | `2.4.0` | Placeholder text |
| `simple-peer` | `9.11.1` | WebRTC peer connection wrapper |
| `@types/simple-peer` | `9.11.8` | TypeScript types for simple-peer |
| `emoji-mart` | `5.6.0` | Emoji picker component |
| `@emoji-mart/react` | `1.1.1` | React wrapper for emoji-mart |
| `@emoji-mart/data` | `1.1.2` | Emoji data set |
| `react-intersection-observer` | `9.10.3` | IntersectionObserver hook for read receipts |
| `react-window` | `1.8.10` | Virtual scrolling for message thread |
| `@types/react-window` | `1.8.8` | TypeScript types |
| `dompurify` | `3.1.6` | XSS sanitization for message content |
| `@types/dompurify` | `3.0.5` | TypeScript types |
| `docx` | `8.5.0` | DOCX generation (client-side download) |
| `marked` | `12.0.0` | Markdown to HTML for document preview |
| `react-router-dom` | `6.26.2` | Already in Unit 5, reused |
| `fast-check` | `3.22.0` | Already in Unit 5, reused |

All versions pinned exactly (no `^` or `~`) per SECURITY-10.
