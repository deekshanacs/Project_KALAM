import { FileText, Share2, ExternalLink } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { Document } from '@tms/shared';

interface DocListProps {
  documents: Document[];
  onOpen: (id: string) => void;
  onShare: (id: string) => void;
}

export function DocList({ documents, onOpen, onShare }: DocListProps) {
  if (documents.length === 0) {
    return (
      <div data-testid="doc-list" className="flex flex-col items-center justify-center py-16 text-gray-500">
        <FileText size={40} className="mb-3 opacity-30" />
        <p>No documents yet</p>
      </div>
    );
  }

  return (
    <div data-testid="doc-list" className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          data-testid={`doc-item-${doc.id}`}
          className="flex items-center justify-between p-4 glass rounded-xl hover:bg-white/8 transition-colors mb-2"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={18} className="text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{doc.title}</p>
              <p className="text-xs text-gray-500">Updated {formatDate(doc.updatedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              data-testid={`doc-open-btn-${doc.id}`}
              onClick={() => onOpen(doc.id)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              aria-label="Open document"
            >
              <ExternalLink size={16} />
            </button>
            <button
              data-testid={`doc-share-btn-${doc.id}`}
              onClick={() => onShare(doc.id)}
              className="p-1.5 text-gray-400 hover:text-indigo-400 transition-colors"
              aria-label="Share document"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
