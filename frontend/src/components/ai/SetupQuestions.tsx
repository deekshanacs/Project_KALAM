import { useState } from 'react';
import type { CreateDocumentAnswers } from '@tms/shared';

const QUESTIONS: { key: keyof CreateDocumentAnswers; label: string; options: { value: string; label: string }[] }[] = [
  { key: 'type', label: 'Document type?', options: [{ value: 'Report', label: 'Report' }, { value: 'Proposal', label: 'Proposal' }, { value: 'Minutes', label: 'Minutes' }, { value: 'Letter', label: 'Letter' }, { value: 'Policy', label: 'Policy' }] },
  { key: 'tone', label: 'Tone?', options: [{ value: 'Formal', label: 'Formal' }, { value: 'Semi-formal', label: 'Semi-formal' }, { value: 'Casual', label: 'Casual' }] },
  { key: 'font', label: 'Font?', options: [{ value: 'Arial', label: 'Arial' }, { value: 'Times New Roman', label: 'Times New Roman' }, { value: 'Calibri', label: 'Calibri' }, { value: 'Georgia', label: 'Georgia' }] },
  { key: 'fontSize', label: 'Font size?', options: [{ value: '10', label: '10pt' }, { value: '11', label: '11pt' }, { value: '12', label: '12pt' }, { value: '14', label: '14pt' }] },
  { key: 'pageSize', label: 'Page size?', options: [{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'Letter' }, { value: 'Legal', label: 'Legal' }] },
  { key: 'toc', label: 'Include table of contents?', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
  { key: 'sections', label: 'Number of sections?', options: [{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '7', label: '7' }] },
  { key: 'colorTheme', label: 'Color theme?', options: [{ value: 'Blue', label: 'Blue' }, { value: 'Green', label: 'Green' }, { value: 'Gray', label: 'Gray' }, { value: 'Minimal Black', label: 'Minimal Black' }] },
  { key: 'headerFooter', label: 'Include header/footer?', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
  { key: 'outputFormat', label: 'Output format?', options: [{ value: 'Preview', label: 'Preview in browser' }, { value: 'DOCX', label: 'Download DOCX' }] },
];

interface SetupQuestionsProps {
  onComplete: (answers: CreateDocumentAnswers) => void;
}

export function SetupQuestions({ onComplete }: SetupQuestionsProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Partial<CreateDocumentAnswers>>({});

  const q = QUESTIONS[current]!;

  const handleSelect = (value: string) => {
    const updated = { ...answers, [q.key]: q.key === 'toc' || q.key === 'headerFooter' ? value === 'true' : value };
    setAnswers(updated);
    if (current < QUESTIONS.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onComplete(updated as CreateDocumentAnswers);
    }
  };

  return (
    <div data-testid="setup-questions" className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>Question {current + 1} of {QUESTIONS.length}</span>
        <div className="flex gap-1">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i <= current ? 'bg-indigo-500' : 'bg-gray-700'}`} />
          ))}
        </div>
      </div>
      <p className="text-sm font-medium text-white">{q.label}</p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((opt) => (
          <button
            key={opt.value}
            data-testid={`question-option-${opt.value}`}
            onClick={() => handleSelect(opt.value)}
            className="px-4 py-2 bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 text-sm text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
