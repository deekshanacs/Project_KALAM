import { Role, WorkloadDto, MAX_CAPACITY, OPEN_STATUSES } from '@tms/shared';
import { prisma } from '../lib/prisma';

export async function calculateWorkload(userId: string): Promise<WorkloadDto> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      _count: {
        select: {
          tasksReceived: {
            where: { status: { in: OPEN_STATUSES } },
          },
        },
      },
    },
  });

  const openTasks = user._count.tasksReceived;
  const maxCapacity = MAX_CAPACITY[user.role as Role];
  const rawPercentage = (openTasks / maxCapacity) * 100;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  const colorTier: WorkloadDto['colorTier'] =
    percentage <= 40 ? 'green' : percentage <= 70 ? 'amber' : 'red';

  return { userId, openTasks, maxCapacity, percentage, colorTier };
}
