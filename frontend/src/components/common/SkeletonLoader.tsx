import { clsx } from 'clsx';

interface SkeletonLoaderProps {
  variant?: 'card' | 'listItem' | 'text' | 'chart';
  lines?: number;
  className?: string;
}

const shimmer = 'animate-pulse bg-white/6 rounded';

export function SkeletonLoader({ variant = 'card', lines = 3, className }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div data-testid="skeleton-card" className={clsx('glass rounded-xl p-4', className)}>
        <div className={clsx(shimmer, 'h-4 w-3/4 mb-3')} />
        <div className={clsx(shimmer, 'h-3 w-full mb-2')} />
        <div className={clsx(shimmer, 'h-3 w-5/6')} />
      </div>
    );
  }
  if (variant === 'listItem') {
    return (
      <div data-testid="skeleton-listItem" className={clsx('flex items-center gap-3 p-3', className)}>
        <div className={clsx(shimmer, 'w-10 h-10 rounded-full flex-shrink-0')} />
        <div className="flex-1 space-y-2">
          <div className={clsx(shimmer, 'h-3 w-1/2')} />
          <div className={clsx(shimmer, 'h-2 w-3/4')} />
        </div>
      </div>
    );
  }
  if (variant === 'chart') {
    return (
      <div data-testid="skeleton-chart" className={clsx('glass rounded-2xl p-4', className)}>
        <div className={clsx(shimmer, 'h-4 w-1/3 mb-4')} />
        <div className={clsx(shimmer, 'h-48 w-full rounded-xl')} />
      </div>
    );
  }
  return (
    <div data-testid="skeleton-text" className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx(shimmer, 'h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
