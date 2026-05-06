import { marked } from 'marked';
import { Download } from 'lucide-react';
import { getAccessToken } from '../../api/client';
import type { CreateDocumentAnswers } from '@tms/shared';
import toast from 'react-hot-toast';

interface DocumentPreviewProps {
  content: string;
  isStreaming: boolean;
  isDone: boolean;
  answers?: CreateDocumentAnswers;
}

export function DocumentPreview({ content, isStreaming, isDone, answers }: DocumentPreviewProps) {
  const html = marked.parse(content) as string;

  const handleDownload = async () => {
    if (!content || !answers) return;
    try {
      const token = getAccessToken();
      const res = await fetch(`${import.meta.env['VITE_API_URL'] as string ?? ''}/api/ai/generate-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ content, options: { font: answers.font, fontSize: Number(answers.fontSize), pageSize: answers.pageSize } }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download DOCX');
    }
  };

  return (
    <div data-testid="document-preview" className="mt-4">
      <div className="glass rounded-xl p-6 min-h-48 prose prose-sm max-w-none text-sm">
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {isStreaming && <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1" />}
      </div>
      {isDone && (
        <button
          data-testid="download-docx-btn"
          onClick={() => void handleDownload()}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
        >
          <Download size={14} />
          Download DOCX
        </button>
      )}
    </div>
  );
}
