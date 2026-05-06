import { AvailabilityStatus } from '@tms/shared';
import { clsx } from 'clsx';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  status?: AvailabilityStatus | undefined;
  className?: string;
}

const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };

const statusRingMap: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'ring-2 ring-emerald-500',
  IN_CALL: 'ring-2 ring-blue-500',
  AWAY: 'ring-2 ring-amber-500',
  OFFLINE: 'ring-2 ring-gray-500',
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Avatar({ src, name, size = 'md', status, className }: AvatarProps) {
  const ring = status ? statusRingMap[status] : '';
  return (
    <div
      data-testid="avatar"
      className={clsx(
        'relative inline-flex items-center justify-center rounded-full bg-indigo-600 font-semibold text-white flex-shrink-0',
        sizeMap[size],
        ring,
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
