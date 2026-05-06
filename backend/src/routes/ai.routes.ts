import { Router, type RequestHandler } from 'express';
import { unlink } from 'fs/promises';
import { zodValidate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { CreateDocumentRequestSchema, GenerateDocxSchema } from '../schemas/ai.schemas';
import { parseFile } from '../services/fileParser.service';
import { generate as generateDocx } from '../services/docxGenerator.service';
import { summarizeDocument, generateDocumentFull } from '../services/gemini.service';
import { logger } from '../lib/logger';
import type { CreateDocumentRequestDto } from '@tms/shared';

const router = Router();

// ─── POST /api/ai/summarize ───────────────────────────────────────────────────
const summarizeHandler: RequestHandler = async (req, res, next) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  try {
    const parsed = await parseFile(req.file);
    const result = await summarizeDocument(parsed.text, parsed.isImage);
    res.json({ data: result });
  } catch (err) {
    logger.error({ event: 'SUMMARIZE_ERROR', error: err instanceof Error ? err.message : String(err) });
    next(err);
  } finally {
    if (req.file) await unlink(req.file.path).catch(() => undefined);
  }
};

// ─── POST /api/ai/create-document (SSE streaming) ────────────────────────────
// Generates the full document via Gemini, then streams it word-by-word
// using setTimeout batching — this avoids async generator / SSE flush issues.
const createDocumentHandler: RequestHandler = async (req, res) => {
  const { description, answers } = req.body as CreateDocumentRequestDto;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Generate full document (Gemini API call, ~2-5s)
    const fullContent = await generateDocumentFull(description, answers);

    // Stream it in word-sized batches for progressive rendering
    const tokens = fullContent.split(/(\s+)/); // preserve whitespace
    let idx = 0;

    const sendBatch = () => {
      if (res.writableEnded) return;

      const BATCH = 8;
      const batch = tokens.slice(idx, idx + BATCH).join('');
      idx += BATCH;

      if (batch) {
        res.write(`data: ${JSON.stringify({ chunk: batch })}\n\n`);
      }

      if (idx < tokens.length) {
        setTimeout(sendBatch, 10);
      } else {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        }
      }
    };

    sendBatch();
  } catch (error: unknown) {
    logger.error({ event: 'AI_STREAM_ERROR', error: error instanceof Error ? error.message : String(error) });
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: 'Document generation failed' })}\n\n`);
      res.end();
    }
  }
};

// ─── POST /api/ai/generate-docx ───────────────────────────────────────────────
const generateDocxHandler: RequestHandler = async (req, res, next) => {
  try {
    const { content, options } = req.body as { content: string; options: Record<string, unknown> };
    const buffer = await generateDocx(content, options as never);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${String(options['title'] ?? 'document')}.docx"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

router.post('/summarize', upload.single('file'), summarizeHandler);
router.post('/create-document', zodValidate(CreateDocumentRequestSchema), createDocumentHandler);
router.post('/generate-docx', zodValidate(GenerateDocxSchema), generateDocxHandler);

export { router as aiRouter };
