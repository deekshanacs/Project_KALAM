import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react';
import { getDocumentApi, updateDocumentApi } from '../../api/documents.api';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface DocEditorProps {
  documentId: string;
  readOnly?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function DocEditor({ documentId, readOnly = false }: DocEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [docTitle, setDocTitle] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      isDirtyRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveDocument(e.getJSON());
      }, 2000);
    },
  });

  const saveDocument = useCallback(async (content: Record<string, unknown>) => {
    setSaveStatus('saving');
    try {
      await updateDocumentApi(documentId, { content });
      setSaveStatus('saved');
      isDirtyRef.current = false;
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      toast.error('Failed to save document');
    }
  }, [documentId]);

  useEffect(() => {
    getDocumentApi(documentId).then((doc) => {
      setDocTitle(doc.title);
      editor?.commands.setContent(doc.content as never);
    }).catch(() => toast.error('Failed to load document'));
  }, [documentId, editor]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (isDirtyRef.current && editor) {
        void saveDocument(editor.getJSON() as Record<string, unknown>);
      }
    };
  }, [editor, saveDocument]);

  const statusLabel = { idle: '', saving: 'Saving...', saved: 'Saved', error: 'Save failed' }[saveStatus];
  const statusColor = { idle: '', saving: 'text-gray-400', saved: 'text-emerald-400', error: 'text-rose-400' }[saveStatus];

  return (
    <div data-testid="doc-editor" className="flex flex-col h-full glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-medium text-white truncate">{docTitle}</h2>
        {!readOnly && (
          <span data-testid="doc-save-status" className={clsx('text-xs', statusColor)}>{statusLabel}</span>
        )}
      </div>

      {/* Toolbar */}
      {!readOnly && editor && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 flex-wrap">
          {[
            { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Bold' },
            { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Italic' },
            { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), label: 'H1' },
            { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'H2' },
            { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Bullet list' },
            { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Ordered list' },
          ].map(({ icon: Icon, action, active, label }) => (
            <button key={label} onClick={action} aria-label={label}
              className={clsx('p-1.5 rounded text-sm transition-colors', active ? 'bg-indigo-600/30 text-indigo-400' : 'text-gray-400 hover:text-white hover:bg-white/5')}>
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <EditorContent editor={editor} className="prose prose-invert prose-sm max-w-none min-h-full focus:outline-none" />
      </div>
    </div>
  );
}
