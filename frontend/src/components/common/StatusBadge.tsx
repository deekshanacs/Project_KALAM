import { AvailabilityStatus } from '@tms/shared';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: AvailabilityStatus;
  showLabel?: boolean;
}

const statusConfig: Record<AvailabilityStatus, { dot: string; label: string }> = {
  AVAILABLE: { dot: 'bg-emerald-500', label: 'Available' },
  IN_CALL: { dot: 'bg-blue-500', label: 'In Call' },
  AWAY: { dot: 'bg-amber-500', label: 'Away' },
  OFFLINE: { dot: 'bg-gray-500', label: 'Offline' },
};

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const { dot, label } = statusConfig[status];
  return (
    <span data-testid="status-badge" className="inline-flex items-center gap-1.5">
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', dot)} />
      {showLabel && <span className="text-xs text-gray-400">{label}</span>}
    </span>
  );
}
