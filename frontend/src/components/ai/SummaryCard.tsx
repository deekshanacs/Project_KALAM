import { SkeletonLoader } from '../common/SkeletonLoader';
import type { AISummaryDto } from '@tms/shared';

interface SummaryCardProps {
  summary: AISummaryDto | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export function SummaryCard({ summary, isLoading, error, onRetry }: SummaryCardProps) {
  if (isLoading) return <SkeletonLoader data-testid="summary-card" variant="card" className="mt-4" />;

  if (error) {
    return (
      <div data-testid="summary-card" className="mt-4 p-4 glass rounded-xl text-center border border-white/10">
        <p className="text-sm mb-3">{error}</p>
        {onRetry && (
          <button data-testid="summary-retry-btn" onClick={onRetry}
            className="px-4 py-1.5 glass hover:bg-white/10 rounded-lg text-sm transition-colors">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div data-testid="summary-card" className="mt-4 space-y-4">
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-60">Summary</h3>
        <p className="text-sm leading-relaxed whitespace-pre-line">{summary.summary}</p>
      </div>
      {summary.keyPoints.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-60">Key Points</h3>
          <ul className="space-y-1.5">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="opacity-40 flex-shrink-0">•</span>{point}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="glass rounded-xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-60">Analysis</h3>
        <p className="text-sm leading-relaxed">{summary.analysis}</p>
      </div>
    </div>
  );
}
