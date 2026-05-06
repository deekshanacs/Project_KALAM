import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { DocList } from '../components/documents/DocList';
import { DocEditor } from '../components/documents/DocEditor';
import { ShareModal } from '../components/documents/ShareModal';
import { getDocumentsApi, createDocumentApi } from '../api/documents.api';
import type { Document } from '@tms/shared';
import toast from 'react-hot-toast';

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [shareDocId, setShareDocId] = useState<string | null>(null);

  useEffect(() => {
    getDocumentsApi()
      .then(setDocuments)
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async () => {
    try {
      const doc = await createDocumentApi({ title: 'Untitled Document' });
      setDocuments((prev) => [doc, ...prev]);
      setActiveDocId(doc.id);
    } catch {
      toast.error('Failed to create document');
    }
  };

  return (
    <PageWrapper title="Documents">
      <div data-testid="documents-page" className="flex gap-5 h-full">
        {/* List panel */}
        <div className="w-72 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">My Documents</h2>
            <button
              onClick={() => void handleCreate()}
              className="flex items-center gap-1 px-3 py-1.5 glass hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-all border border-white/10"
            >
              <Plus size={12} />New
            </button>
          </div>
          <div className="glass rounded-2xl p-2 shadow-xl">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} variant="listItem" />)
              : <DocList documents={documents} onOpen={setActiveDocId} onShare={setShareDocId} />
            }
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 min-h-96">
          {activeDocId ? (
            <div className="glass rounded-2xl shadow-xl h-full overflow-hidden">
              <DocEditor documentId={activeDocId} />
            </div>
          ) : (
            <div className="glass rounded-2xl h-full flex items-center justify-center text-gray-500 shadow-xl">
              <p className="text-sm">Select a document to edit</p>
            </div>
          )}
        </div>
      </div>

      {shareDocId && (
        <ShareModal documentId={shareDocId} isOpen={!!shareDocId} onClose={() => setShareDocId(null)} />
      )}
    </PageWrapper>
  );
}
