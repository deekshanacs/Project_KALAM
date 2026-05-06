import { clsx } from 'clsx';
import { getWorkloadColor, WORKLOAD_COLORS } from '../../utils/workload';

interface WorkloadBarProps {
  percentage: number;
  showLabel?: boolean;
  className?: string;
}

export function WorkloadBar({ percentage, showLabel = false, className }: WorkloadBarProps) {
  const tier = getWorkloadColor(percentage);
  const barColor = WORKLOAD_COLORS[tier];

  return (
    <div data-testid="workload-bar" className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Workload</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
