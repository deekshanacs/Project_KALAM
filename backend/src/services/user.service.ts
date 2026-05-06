import { Role } from '../_shared';
import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../lib/errors';

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  availabilityStatus: true,
  avatarUrl: true,
  supervisorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getAllUsers() {
  return prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { name: 'asc' },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateStatus(userId: string, status: string, requesterId: string) {
  const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
  if (!requester) throw new NotFoundError('User');

  // Users can only update their own status unless Admin
  if (userId !== requesterId && requester.role !== Role.ADMIN) {
    throw new ForbiddenError('You can only update your own status');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { availabilityStatus: status as never },
    select: safeUserSelect,
  });
}

export async function updateSupervisor(
  userId: string,
  supervisorId: string | null,
  requesterId: string
) {
  const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
  if (!requester) throw new NotFoundError('User');

  if (requester.role !== Role.ADMIN) {
    // TL can only change supervisors within own subtree
    const descendants = await getDescendantIds(requesterId);
    if (!descendants.includes(userId)) {
      throw new ForbiddenError('You can only restructure users within your own subtree');
    }
  }

  // Prevent circular reference
  if (supervisorId) {
    const descendants = await getDescendantIds(userId);
    if (descendants.includes(supervisorId) || supervisorId === userId) {
      throw new ForbiddenError('Cannot create circular supervisor relationship');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: { supervisorId },
    select: safeUserSelect,
  });
}

export async function getDescendantIds(userId: string): Promise<string[]> {
  const descendants: string[] = [];
  const queue: string[] = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { supervisorId: currentId },
      select: { id: true },
    });
    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

export async function canAssign(assignerId: string, assigneeId: string): Promise<boolean> {
  if (assignerId === assigneeId) return true;

  const assigner = await prisma.user.findUnique({
    where: { id: assignerId },
    select: { role: true },
  });
  if (!assigner) return false;

  if (assigner.role === Role.ADMIN) return true;
  if (assigner.role === Role.JUNIOR_MEMBER) return false;

  const descendants = await getDescendantIds(assignerId);
  return descendants.includes(assigneeId);
}
