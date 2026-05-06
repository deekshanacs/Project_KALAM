import { readFile } from 'fs/promises';
import { ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';

export interface ParsedFile {
  text: string;
  isImage: boolean;
  mimeType: string;
}

export async function parseFile(file: Express.Multer.File): Promise<ParsedFile> {
  const { mimetype, path: filePath, originalname } = file;
  const isImage = mimetype.startsWith('image/');

  logger.debug({ event: 'FILE_PARSE_START', mimetype, originalname });

  let text: string;

  try {
    if (mimetype === 'application/pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
      const buffer = await readFile(filePath);
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth') as { extractRawText: (opts: { path: string }) => Promise<{ value: string }> };
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (mimetype === 'text/plain') {
      const buffer = await readFile(filePath);
      text = buffer.toString('utf-8');
    } else if (isImage) {
      const buffer = await readFile(filePath);
      const base64 = buffer.toString('base64');
      text = `data:${mimetype};base64,${base64}`;
    } else if (
      mimetype === 'text/csv' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require('xlsx') as {
        readFile: (p: string) => { SheetNames: string[]; Sheets: Record<string, unknown> };
        utils: { sheet_to_csv: (s: unknown) => string };
      };
      const workbook = XLSX.readFile(filePath);
      const sheets: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) sheets.push(`=== ${sheetName} ===\n${XLSX.utils.sheet_to_csv(sheet)}`);
      }
      text = sheets.join('\n\n');
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth') as { extractRawText: (opts: { path: string }) => Promise<{ value: string }> };
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '[Presentation: limited text extraction]';
      } catch {
        text = '[Presentation: text extraction failed]';
      }
    } else {
      throw new ValidationError(`Unsupported file type: ${mimetype}`);
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    logger.error({ event: 'FILE_PARSE_ERROR', mimetype, error: err instanceof Error ? err.message : String(err) });
    throw new ValidationError(`Failed to parse file: ${originalname}`);
  }

  return { text, isImage, mimeType: mimetype };
}
