/**
 * Gemini AI Service
 * Uses Google Gemini 1.5 Flash for both document summarization and creation.
 * Falls back to local NLP engine if the API key is not configured.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';
import type { AISummaryDto, CreateDocumentAnswers } from '../_shared';
import { summarizeText, generateDocumentSync } from './localAI.service';

// --- Model initialization -----------------------------------------------------

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (model) return model;
  if (!env.GEMINI_API_KEY) {
    throw new AppError(503, 'Gemini API key not configured');
  }
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
    },
  });
  return model;
}

const hasGemini = () => Boolean(env.GEMINI_API_KEY);

// --- Summarize ----------------------------------------------------------------

const SUMMARIZE_PROMPT = (content: string) => `You are a professional document analyst.
Analyze the following document and respond with ONLY a valid JSON object � no markdown, no code blocks, just raw JSON.

The JSON must have exactly this structure:
{
  "summary": "A clear 2-3 paragraph summary of the document",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "analysis": "A paragraph analyzing the document's tone, purpose, structure, and key insights"
}

Document content:
${content.slice(0, 30000)}`;

export async function summarizeDocument(content: string, isImage = false): Promise<AISummaryDto> {
  // Image: Gemini vision not set up, use local
  if (isImage) {
    return {
      summary: 'Image analysis requires vision capabilities. Please upload a text-based document (PDF, DOCX, TXT) for full AI analysis.',
      keyPoints: ['Upload a text document for complete analysis', 'Supported: PDF, DOCX, TXT, CSV, XLSX'],
      analysis: 'Image files cannot be analyzed in text mode. Convert your image to a text document for best results.',
    };
  }

  if (!hasGemini()) {
    logger.warn({ event: 'GEMINI_FALLBACK', reason: 'No API key � using local NLP' });
    return summarizeText(content);
  }

  try {
    const m = getModel();
    const result = await m.generateContent(SUMMARIZE_PROMPT(content));
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in them
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      return JSON.parse(cleaned) as AISummaryDto;
    } catch {
      // If JSON parse fails, structure the raw response
      return {
        summary: cleaned.slice(0, 800),
        keyPoints: ['See summary for details'],
        analysis: 'Analysis complete. See summary above.',
      };
    }
  } catch (error: unknown) {
    logger.error({ event: 'GEMINI_SUMMARIZE_ERROR', error: error instanceof Error ? error.message : String(error) });
    // Fallback to local NLP
    logger.info({ event: 'GEMINI_FALLBACK', reason: 'API error � using local NLP' });
    return summarizeText(content);
  }
}

// --- Document creation (streaming) -------------------------------------------

function buildDocumentPrompt(description: string, answers: CreateDocumentAnswers): string {
  const tocLine = answers.toc ? 'Include a Table of Contents after the title.' : 'Do not include a Table of Contents.';
  const headerLine = answers.headerFooter ? 'Include a header and footer note.' : '';
  const numSections = parseInt(String(answers.sections ?? '5'), 10) || 5;

  return `You are a professional document writer. Create a complete, well-structured ${answers.type} document.

Document Description: ${description}

Specifications:
- Document Type: ${answers.type}
- Tone: ${answers.tone}
- Font (for reference): ${answers.font}, ${answers.fontSize}pt
- Page Size: ${answers.pageSize}
- Number of Sections: ${numSections}
- Color Theme: ${answers.colorTheme}
- ${tocLine}
- ${headerLine}

Instructions:
1. Write a complete, professional document with ${numSections} main sections
2. Use proper Markdown formatting: # for title, ## for sections, ### for subsections
3. Each section should have 2-3 substantial paragraphs
4. Include relevant bullet points where appropriate
5. Make the content specific and relevant to: "${description}"
6. Maintain a ${answers.tone.toLowerCase()} tone throughout
7. Start directly with the document � no preamble or meta-commentary

Write the complete document now:`;
}

/**
 * Streams a Gemini-generated document chunk by chunk.
 * Falls back to local generation if Gemini is unavailable.
 */
export async function generateDocumentFull(
  description: string,
  answers: CreateDocumentAnswers
): Promise<string> {
  if (!hasGemini()) {
    logger.warn({ event: 'GEMINI_FALLBACK', reason: 'No API key � using local generation' });
    return generateDocumentSync(description, answers);
  }

  try {
    const m = getModel();
    const prompt = buildDocumentPrompt(description, answers);
    const result = await m.generateContent(prompt);
    const text = result.response.text();
    logger.info({ event: 'GEMINI_SUCCESS', chars: text.length });
    return text || generateDocumentSync(description, answers);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ event: 'GEMINI_GENERATE_ERROR', error: msg, stack: error instanceof Error ? error.stack?.slice(0, 300) : undefined });
    logger.info({ event: 'GEMINI_FALLBACK', reason: 'API error � using local generation' });
    return generateDocumentSync(description, answers);
  }
}

/**
 * @deprecated Use generateDocumentFull instead � kept for compatibility
 */
export async function* streamDocument(
  description: string,
  answers: CreateDocumentAnswers
): AsyncGenerator<string> {
  const content = await generateDocumentFull(description, answers);
  yield content;
}
