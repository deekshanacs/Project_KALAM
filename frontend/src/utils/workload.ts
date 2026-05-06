import { Role, MAX_CAPACITY } from '@tms/shared';

export function getWorkloadColor(percentage: number): 'green' | 'amber' | 'red' {
  if (percentage <= 40) return 'green';
  if (percentage <= 70) return 'amber';
  return 'red';
}

export function getWorkloadPercentage(openTasks: number, role: Role): number {
  const maxCapacity = MAX_CAPACITY[role];
  return Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
}

export const WORKLOAD_COLORS = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
} as const;
