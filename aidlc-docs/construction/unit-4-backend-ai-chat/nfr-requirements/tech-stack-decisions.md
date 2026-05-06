# Tech Stack Decisions — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 introduces the AI, file parsing, and DOCX generation dependencies. All versions are pinned exactly per SECURITY-10. The WebRTC signaling is handled entirely via Socket.io (no additional backend library needed).

---

## 2. AI Integration

### 2.1 @anthropic-ai/sdk

| Decision | Value |
|---|---|
| Package | `@anthropic-ai/sdk` |
| Version | `0.32.1` |
| Model | `claude-sonnet-4-20250514` |

**Why Anthropic Claude over alternatives?**

| Criterion | Claude (Anthropic) | GPT-4 (OpenAI) | Gemini (Google) |
|---|---|---|---|
| Document analysis | Excellent | Excellent | Good |
| Long context | 200K tokens | 128K tokens | 1M tokens |
| Streaming support | Yes | Yes | Yes |
| TypeScript SDK | Official | Official | Official |
| Pricing | Competitive | Higher | Competitive |

Claude is specified in the requirements (`claude-sonnet-4-20250514`). The `@anthropic-ai/sdk` provides:
- Native TypeScript types
- Streaming support via `messages.stream()`
- Automatic retry with exponential backoff
- Error types for rate limits, overload, etc.

**Streaming usage**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

// Streaming
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
});

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    yield chunk.delta.text;
  }
}
```

---

## 3. File Upload

### 3.1 multer

| Decision | Value |
|---|---|
| Package | `multer` |
| Version | `1.4.5-lts.1` |
| Types | `@types/multer` `1.4.12` |

**Why multer?**
- De facto standard for multipart/form-data in Express
- Disk storage prevents memory exhaustion for large files
- File filter callback for MIME type validation
- File size limits built-in

**Note**: Version `1.4.5-lts.1` is the LTS version. The `2.x` version was in development at project start. The LTS version is stable and well-tested.

---

## 4. File Parsing

### 4.1 pdf-parse

| Decision | Value |
|---|---|
| Package | `pdf-parse` |
| Version | `1.1.1` |
| Types | `@types/pdf-parse` `1.1.4` |

**Purpose**: Extract text from PDF files for Claude summarization.

**Usage**:
```typescript
import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

export async function parsePdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}
```

**Limitation**: pdf-parse extracts plain text only. Complex PDF layouts (tables, columns) may not parse perfectly. This is acceptable for MVP.

### 4.2 mammoth

| Decision | Value |
|---|---|
| Package | `mammoth` |
| Version | `1.8.0` |

**Purpose**: Extract text from DOCX files for Claude summarization.

**Usage**:
```typescript
import mammoth from 'mammoth';

export async function parseDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}
```

**Why mammoth over docx for parsing?**
- mammoth is specifically designed for DOCX → text extraction
- The `docx` package is for DOCX generation, not parsing
- mammoth handles complex DOCX structures (tables, lists, headers)

### 4.3 xlsx

| Decision | Value |
|---|---|
| Package | `xlsx` |
| Version | `0.18.5` |

**Purpose**: Parse CSV and XLSX files into text tables for Claude summarization.

**Usage**:
```typescript
import * as XLSX from 'xlsx';

export function parseSpreadsheet(filePath: string): string {
  const workbook = XLSX.readFile(filePath);
  const sheets: string[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`Sheet: ${sheetName}\n${csv}`);
  }
  
  return sheets.join('\n\n');
}
```

---

## 5. DOCX Generation

### 5.1 docx

| Decision | Value |
|---|---|
| Package | `docx` |
| Version | `9.0.2` |

**Purpose**: Generate properly formatted DOCX files from Claude's markdown output.

**Why docx over alternatives?**

| Criterion | docx | officegen | libreoffice |
|---|---|---|---|
| TypeScript support | Excellent (native) | Limited | N/A (CLI) |
| No system dependencies | Yes | Yes | No (requires install) |
| Formatting support | Rich | Basic | Full |
| Bundle size | Medium | Small | N/A |
| Active maintenance | Yes | Stale | N/A |

The `docx` package provides a programmatic API for creating DOCX files with full formatting support (fonts, sizes, headings, bullets, tables). It generates valid DOCX files that open correctly in Microsoft Word and LibreOffice.

**Key classes used**:
- `Document` — root document container
- `Packer` — serializes Document to Buffer
- `Paragraph` — text block
- `TextRun` — inline text with formatting
- `HeadingLevel` — H1, H2, H3 headings
- `PageSize` — A4, Letter, Legal

---

## 6. WebRTC

### 6.1 simple-peer (Frontend Only)

| Decision | Value |
|---|---|
| Package | `simple-peer` (frontend only) |
| Version | `9.11.1` |
| Backend usage | None (backend only relays signals) |

**Why simple-peer?**
- Wraps the native WebRTC API with a simpler interface
- Handles ICE candidate gathering automatically
- Works with Socket.io for signaling
- TypeScript types available

**Backend role**: The backend does NOT use simple-peer. It only relays WebRTC signals (offer, answer, ICE candidates) between peers via Socket.io. The actual WebRTC connection is established directly between the two browser clients.

---

## 7. Complete Dependency Summary for Unit 4

New dependencies added in Unit 4 (all were pre-installed in Unit 1's initial setup):

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "0.32.1",
    "docx": "9.0.2",
    "mammoth": "1.8.0",
    "multer": "1.4.5-lts.1",
    "pdf-parse": "1.1.1",
    "xlsx": "0.18.5"
  },
  "devDependencies": {
    "@types/mammoth": "1.5.4",
    "@types/multer": "1.4.12",
    "@types/pdf-parse": "1.1.4"
  }
}
```

---

## 8. Decision Log

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| AI SDK | @anthropic-ai/sdk 0.32.1 | openai, @google/generative-ai | Required by spec (Claude) |
| Claude model | claude-sonnet-4-20250514 | claude-3-opus, claude-3-haiku | Required by spec |
| File upload | multer 1.4.5-lts.1 | busboy, formidable | Standard, disk storage, file filter |
| PDF parsing | pdf-parse 1.1.1 | pdfjs-dist, pdf2json | Simple API, text extraction |
| DOCX parsing | mammoth 1.8.0 | docx (wrong tool), officegen | Designed for DOCX→text |
| Spreadsheet | xlsx 0.18.5 | exceljs, csv-parse | Handles both CSV and XLSX |
| DOCX generation | docx 9.0.2 | officegen, pptxgenjs | TypeScript native, rich formatting |
| WebRTC backend | None (relay only) | mediasoup, Janus | Peer-to-peer, no media relay needed |
