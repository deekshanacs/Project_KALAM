import { useState } from 'react';
import { SetupQuestions } from './SetupQuestions';
import { DocumentPreview } from './DocumentPreview';
import { buildApiUrl, getAccessToken } from '../../api/client';
import type { CreateDocumentAnswers } from '@tms/shared';
import toast from 'react-hot-toast';

type Phase = 'describe' | 'questions' | 'preview';

export function DocCreator() {
  const [phase, setPhase] = useState<Phase>('describe');
  const [description, setDescription] = useState('');
  const [answers, setAnswers] = useState<CreateDocumentAnswers | null>(null);
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleQuestionsComplete = async (ans: CreateDocumentAnswers) => {
    setAnswers(ans);
    setPhase('preview');
    setIsStreaming(true);
    setContent('');
    setIsDone(false);

    try {
      const token = getAccessToken();
      const res = await fetch(buildApiUrl('/api/ai/create-document'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ description, answers: ans }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n\n').filter(Boolean)) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; error?: string };
          if (data.chunk) setContent((c) => c + data.chunk);
          if (data.done) setIsDone(true);
          if (data.error) { toast.error(data.error); break; }
        }
      }
    } catch {
      toast.error('Document generation failed');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div data-testid="doc-creator" className="space-y-4">
      {phase === 'describe' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Describe the document you need</label>
            <textarea
              data-testid="doc-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. A project proposal for a new mobile app targeting small businesses..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <button
            data-testid="doc-generate-btn"
            onClick={() => { if (description.trim()) setPhase('questions'); }}
            disabled={!description.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Continue →
          </button>
        </>
      )}

      {phase === 'questions' && (
        <SetupQuestions onComplete={(ans) => void handleQuestionsComplete(ans)} />
      )}

      {phase === 'preview' && answers && (
        <DocumentPreview content={content} isStreaming={isStreaming} isDone={isDone} answers={answers} />
      )}
    </div>
  );
}
