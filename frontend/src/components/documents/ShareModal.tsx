import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { getUsersApi } from '../../api/users.api';
import { shareDocumentApi } from '../../api/documents.api';
import type { User } from '@tms/shared';
import toast from 'react-hot-toast';

interface ShareModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ documentId, isOpen, onClose }: ShareModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    const users = await getUsersApi();
    setResults(users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())));
  };

  const handleShare = async () => {
    if (selected.length === 0) { toast.error('Select at least one user'); return; }
    setIsLoading(true);
    try {
      await shareDocumentApi(documentId, selected, [], permission);
      toast.success('Document shared');
      onClose();
    } catch {
      toast.error('Failed to share document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(`${window.location.origin}/documents/${documentId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            data-testid="share-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white">Share Document</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    data-testid="share-user-search"
                    type="text"
                    value={query}
                    onChange={(e) => void handleSearch(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    aria-label="Search users"
                  />
                  {results.length > 0 && (
                    <div className="mt-1 glass rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {results.map((u) => (
                        <button key={u.id} onClick={() => setSelected((s) => s.includes(u.id) ? s.filter((id) => id !== u.id) : [...s, u.id])}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${selected.includes(u.id) ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-300 hover:bg-white/5'}`}>
                          <span className="flex-1">{u.name}</span>
                          <span className="text-xs text-gray-500">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Permission</label>
                  <select value={permission} onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT')}
                    data-testid="share-permission-select"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                    <option value="VIEW">View only</option>
                    <option value="EDIT">Can edit</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleCopyLink} data-testid="share-copy-link-btn"
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg text-sm transition-colors">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                  <button onClick={() => void handleShare()} disabled={isLoading || selected.length === 0}
                    data-testid="share-submit-btn"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors">
                    {isLoading ? 'Sharing...' : `Share with ${selected.length > 0 ? selected.length : ''} user${selected.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
