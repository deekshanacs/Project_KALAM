import { Role, TaskStatus } from '@tms/shared';
import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../lib/errors';
import { canAssign } from './user.service';
import { calculateWorkload } from './workload.service';
import { emitToUser } from './socket.service';
import { logger } from '../lib/logger';
import type { CreateTaskDto } from '../schemas/task.schemas';

const taskInclude = {
  assignedBy: { select: { id: true, name: true, avatarUrl: true } },
  assignedTo: { select: { id: true, name: true, avatarUrl: true } },
  project: { select: { id: true, name: true } },
  _count: { select: { comments: true, timeLogs: true } },
} as const;

export async function getTasks(requesterId: string, filters: {
  assigneeId?: string; assignedById?: string; status?: TaskStatus;
  priority?: string; projectId?: string; page: number; pageSize: number;
}) {
  const requester = await prisma.user.findUniqueOrThrow({
    where: { id: requesterId }, select: { role: true },
  });

  // Build scope filter
  let scopeWhere = {};
  if (requester.role !== Role.ADMIN) {
    scopeWhere = { assignedToId: requesterId };
  }

  const where = {
    ...scopeWhere,
    ...(filters.assigneeId && { assignedToId: filters.assigneeId }),
    ...(filters.assignedById && { assignedById: filters.assignedById }),
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority as never }),
    ...(filters.projectId && { projectId: filters.projectId }),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page: filters.page, pageSize: filters.pageSize };
}

export async function createTask(dto: CreateTaskDto, assignerId: string) {
  const allowed = await canAssign(assignerId, dto.assignedToId);
  if (!allowed) {
    throw new ForbiddenError('You do not have permission to assign tasks to this user');
  }

  const task = await prisma.task.create({
    data: {
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      assignedById: assignerId,
      assignedToId: dto.assignedToId,
      projectId: dto.projectId ?? null,
      attachments: dto.attachments,
    },
    include: taskInclude,
  });

  // Notify assignee
  emitToUser(dto.assignedToId, 'task:assigned', task);
  emitToUser(dto.assignedToId, 'notification:new', {
    id: crypto.randomUUID(),
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    message: `You have been assigned: ${task.title}`,
    data: { taskId: task.id },
    createdAt: new Date().toISOString(),
    read: false,
  });

  void recalculateAndEmitWorkload(dto.assignedToId);

  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, requesterId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
  const isAdmin = requester?.role === Role.ADMIN;

  if (!isAdmin && requesterId !== task.assignedToId && requesterId !== task.assignedById) {
    throw new ForbiddenError('You do not have permission to update this task');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === TaskStatus.DONE ? new Date() : null,
    },
    include: taskInclude,
  });

  emitToUser(task.assignedToId, 'task:updated', updatedTask);
  if (task.assignedById !== task.assignedToId) {
    emitToUser(task.assignedById, 'task:updated', updatedTask);
  }

  void recalculateAndEmitWorkload(task.assignedToId);

  return updatedTask;
}

export async function deleteTask(taskId: string, requesterId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });
  if (requester?.role !== Role.ADMIN && requesterId !== task.assignedById) {
    throw new ForbiddenError('Only the task creator or Admin can delete tasks');
  }

  await prisma.task.delete({ where: { id: taskId } });
}

export async function addComment(taskId: string, content: string, authorId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  return prisma.comment.create({
    data: { content, taskId, authorId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function getComments(taskId: string) {
  return prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function logTime(taskId: string, hours: number, note: string | undefined, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task');

  return prisma.timeLog.create({
    data: { hours, note: note ?? null, taskId, userId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function getTimeLogs(taskId: string) {
  const timeLogs = await prisma.timeLog.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const totalHours = timeLogs.reduce((sum: number, log: { hours: number }) => sum + log.hours, 0);
  return { timeLogs, totalHours };
}

async function recalculateAndEmitWorkload(userId: string): Promise<void> {
  try {
    const workload = await calculateWorkload(userId);
    emitToUser(userId, 'user:workload-update', workload);
  } catch (error: unknown) {
    logger.error({
      event: 'WORKLOAD_RECALCULATION_FAILED',
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
