/**
 * Local AI Service - rule-based NLP document analysis and generation.
 * No external API required. Works entirely server-side.
 */

import type { AISummaryDto, CreateDocumentAnswers } from '../_shared';

// --- NLP utilities ------------------------------------------------------------

const STOP_WORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her','was','one',
  'our','out','day','get','has','him','his','how','its','may','new','now','old',
  'see','two','way','who','did','let','put','say','she','too','use','that','this',
  'with','have','from','they','will','been','were','said','each','which','their',
  'there','would','about','could','other','into','than','then','some','what',
  'when','your','more','also','just','like','over','such','even','most','made',
  'after','where','much','well','only','very','back','good','also','then','than',
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

function termFreq(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    if (!STOP_WORDS.has(t)) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return freq;
}

function topKeywords(text: string, n = 10): string[] {
  const freq = termFreq(tokenize(text));
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

function splitSentences(text: string): string[] {
  return text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
}

function scoreSentence(s: string, keywords: string[], pos: number, total: number): number {
  const lower = s.toLowerCase();
  let score = 0;
  for (const kw of keywords) if (lower.includes(kw)) score += 2;
  if (pos < 3) score += 3;
  if (pos > total - 3) score += 1;
  const wc = s.split(' ').length;
  if (wc >= 10 && wc <= 30) score += 1;
  return score;
}

// --- Summarize ----------------------------------------------------------------

export function summarizeText(content: string): AISummaryDto {
  const clean = content.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(clean);
  const keywords = topKeywords(clean, 10);

  if (sentences.length === 0) {
    return {
      summary: 'The document appears to be empty or contains no readable text.',
      keyPoints: ['No content could be extracted'],
      analysis: 'Please upload a document with readable text content.',
    };
  }

  const scored = sentences.map((s, i) => ({ s, score: scoreSentence(s, keywords, i, sentences.length), i }));
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, Math.min(6, Math.ceil(sentences.length * 0.3)));
  const summaryParts = top.sort((a, b) => a.i - b.i).map((x) => x.s);
  const mid = Math.ceil(summaryParts.length / 2);
  const summary = [summaryParts.slice(0, mid).join(' '), summaryParts.slice(mid).join(' ')].filter(Boolean).join('\n\n');

  const topSet = new Set(top.map((x) => x.i));
  const keyPoints = scored.filter((x) => !topSet.has(x.i)).sort((a, b) => b.score - a.score).slice(0, 6).sort((a, b) => a.i - b.i)
    .map((x) => { const t = x.s.replace(/^(however|therefore|furthermore|additionally|moreover),?\s*/i, ''); return t.charAt(0).toUpperCase() + t.slice(1); });

  const wordCount = clean.split(/\s+/).length;
  const avgLen = Math.round(wordCount / Math.max(sentences.length, 1));
  const tone = avgLen > 20 ? 'formal and technical' : avgLen > 12 ? 'professional and clear' : 'concise and direct';
  const topKws = keywords.slice(0, 5).join(', ');

  const analysis =
    `This document contains approximately ${wordCount} words across ${sentences.length} sentences ` +
    `(avg ${avgLen} words/sentence), suggesting a ${tone} writing style. ` +
    `Primary topics: ${topKws}. ` +
    `The content is ${sentences.length > 20 ? 'comprehensive' : 'focused'} and covers the subject with adequate depth.`;

  return { summary, keyPoints: keyPoints.length > 0 ? keyPoints : keywords.slice(0, 5).map((k) => `Key topic: ${k}`), analysis };
}

// --- Document generation ------------------------------------------------------

const SECTION_TEMPLATES: Record<string, string[]> = {
  Report:   ['Executive Summary', 'Introduction', 'Background', 'Findings', 'Analysis', 'Recommendations', 'Conclusion'],
  Proposal: ['Executive Summary', 'Problem Statement', 'Proposed Solution', 'Scope of Work', 'Timeline', 'Budget', 'Conclusion'],
  Minutes:  ['Meeting Details', 'Attendees', 'Agenda', 'Discussion Points', 'Decisions Made', 'Action Items', 'Next Steps'],
  Letter:   ['Opening', 'Purpose', 'Main Content', 'Supporting Details', 'Call to Action', 'Closing'],
  Policy:   ['Purpose', 'Scope', 'Definitions', 'Policy Statement', 'Procedures', 'Responsibilities', 'Compliance'],
};

const TONE_OPENERS: Record<string, string> = {
  Formal:       'This document has been prepared to provide a comprehensive overview of',
  'Semi-formal': 'This document outlines the key aspects of',
  Casual:       "Here's a clear breakdown of",
};

function buildSection(name: string, description: string, tone: string, keywords: string[], idx: number): string {
  const opener = TONE_OPENERS[tone] ?? TONE_OPENERS['Semi-formal']!;
  const kw1 = keywords[idx % Math.max(keywords.length, 1)] ?? 'the subject';
  const kw2 = keywords[(idx + 1) % Math.max(keywords.length, 1)] ?? 'this area';

  const p1 = `${opener} ${description.toLowerCase()} as it relates to ${name.toLowerCase()}. ` +
    `This section addresses the critical aspects of ${kw1} and provides actionable insights for stakeholders.`;

  const p2 = `When examining ${kw1} in the context of ${description.toLowerCase()}, several important considerations emerge. ` +
    `The relationship between ${kw1} and ${kw2} plays a significant role in determining outcomes. ` +
    `A structured approach to ${name.toLowerCase()} consistently yields the most effective results, ` +
    `and organizations that prioritize this aspect demonstrate improved performance and stakeholder satisfaction.`;

  const p3 = idx > 0
    ? `In summary, ${name.toLowerCase()} represents a foundational element of ${description.toLowerCase()}. ` +
      `The insights presented here should guide decision-making and inform subsequent actions. ` +
      `Continued attention to ${kw2} will ensure sustained progress toward the stated objectives.`
    : '';

  return [p1, p2, p3].filter(Boolean).join('\n\n');
}

/**
 * Generates a complete document synchronously and returns it as a string.
 * The route handler streams it chunk by chunk.
 */
export function generateDocumentSync(description: string, answers: CreateDocumentAnswers): string {
  const docType = answers.type ?? 'Report';
  const tone = answers.tone ?? 'Semi-formal';
  const numSections = Math.min(Math.max(parseInt(String(answers.sections ?? '5'), 10) || 5, 1), 8);
  const includeToc = Boolean(answers.toc);
  const includeHeaderFooter = Boolean(answers.headerFooter);

  const sectionNames = (SECTION_TEMPLATES[docType] ?? SECTION_TEMPLATES['Report']!).slice(0, numSections);
  const keywords = topKeywords(description, 12);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const parts: string[] = [];

  // Title
  const title = `${docType}: ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`;
  parts.push(`# ${title}\n`);
  parts.push(`\n*Document Type: ${docType} | Tone: ${tone} | Date: ${date}*\n`);

  if (includeHeaderFooter) parts.push('\n---\n');

  // TOC
  if (includeToc) {
    parts.push('\n## Table of Contents\n');
    sectionNames.forEach((name, i) => parts.push(`\n${i + 1}. ${name}`));
    parts.push('\n\n---\n');
  }

  // Sections
  sectionNames.forEach((name, i) => {
    parts.push(`\n\n## ${i + 1}. ${name}\n\n`);
    parts.push(buildSection(name, description, tone, keywords, i));

    if (['Findings', 'Recommendations', 'Action Items', 'Procedures'].includes(name)) {
      parts.push('\n\n**Key Points:**\n');
      keywords.slice(i % 3, (i % 3) + 4).forEach((kw) => {
        parts.push(`\n- ${kw.charAt(0).toUpperCase() + kw.slice(1)}: Requires careful consideration for optimal outcomes`);
      });
    }
  });

  if (includeHeaderFooter) {
    parts.push('\n\n---\n');
    parts.push(`\n*Generated on ${date}. Review and customize before distribution.*`);
  }

  return parts.join('');
}
