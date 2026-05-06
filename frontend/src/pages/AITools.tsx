import { useState } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { FileUploader } from '../components/ai/FileUploader';
import { SummaryCard } from '../components/ai/SummaryCard';
import { DocCreator } from '../components/ai/DocCreator';
import { apiClient } from '../api/client';
import type { AISummaryDto } from '@tms/shared';
import toast from 'react-hot-toast';

type Tab = 'summarizer' | 'creator';

export default function AITools() {
  const [tab, setTab] = useState<Tab>('summarizer');
  const [summary, setSummary] = useState<AISummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: AISummaryDto }>('/api/ai/summarize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummary(res.data.data);
    } catch {
      setError('Failed to analyze document. Please try again.');
      toast.error('Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper title="AI Tools">
      <div data-testid="ai-tools-page">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 glass rounded-xl w-fit mb-6">
          {(['summarizer', 'creator'] as Tab[]).map((t) => (
            <button
              key={t}
              data-testid={`ai-tab-${t}`}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'summarizer' ? 'Summarizer' : 'Document Creator'}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {tab === 'summarizer' && (
            <>
              <p className="text-sm text-gray-400 mb-4">Upload a document to get an AI-powered summary and analysis.</p>
              <div className="glass rounded-2xl p-6 shadow-xl">
                <FileUploader onFileSelected={(f) => void handleFileSelected(f)} isLoading={isLoading} />
              </div>
              <SummaryCard summary={summary} isLoading={isLoading} error={error} onRetry={() => setError(null)} />
            </>
          )}
          {tab === 'creator' && (
            <>
              <p className="text-sm text-gray-400 mb-4">Describe the document you need and let AI create it.</p>
              <div className="glass rounded-2xl p-6 shadow-xl">
                <DocCreator />
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
