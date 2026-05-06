import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';

const ACCEPTED = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx,.pptx';
const MAX_MB = 10;

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

export function FileUploader({ onFileSelected, isLoading }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_MB}MB.`);
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  return (
    <div
      data-testid="file-uploader"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
        isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 hover:border-indigo-500/50',
        isLoading && 'opacity-50 pointer-events-none'
      )}
    >
      <Upload size={32} className="mx-auto mb-3 text-gray-400" />
      <p className="text-sm text-gray-300">Drag & drop a file here, or click to browse</p>
      <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, PNG, JPG, CSV, XLSX, PPTX — max {MAX_MB}MB</p>
      {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        aria-label="Upload file"
      />
    </div>
  );
}
