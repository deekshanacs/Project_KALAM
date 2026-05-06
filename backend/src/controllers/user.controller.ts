import { RequestHandler } from 'express';
import * as userService from '../services/user.service';
import { calculateWorkload } from '../services/workload.service';
import { prisma } from '../lib/prisma';

export const listUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ data: { users } });
  } catch (err) {
    next(err);
  }
};

export const getUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params['id']!);
    res.json({ data: { user } });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus: RequestHandler = async (req, res, next) => {
  try {
    const { availabilityStatus } = req.body as { availabilityStatus: string };
    const user = await userService.updateStatus(req.params['id']!, availabilityStatus, req.user!.id);

    // Emit socket event if socket service is available
    try {
      const { emitToAll } = await import('../services/socket.service');
      emitToAll('user:status-change', { userId: user.id, availabilityStatus: user.availabilityStatus });
    } catch {
      // Socket not yet initialized — ignore
    }

    res.json({ data: { user } });
  } catch (err) {
    next(err);
  }
};

export const updateUserSupervisor: RequestHandler = async (req, res, next) => {
  try {
    const { supervisorId } = req.body as { supervisorId: string | null };
    const user = await userService.updateSupervisor(req.params['id']!, supervisorId, req.user!.id);
    res.json({ data: { user } });
  } catch (err) {
    next(err);
  }
};

export const getUserTasksHandler: RequestHandler = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: req.params['id']! },
      include: {
        assignedBy: { select: { id: true, name: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true, timeLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: { tasks } });
  } catch (err) {
    next(err);
  }
};

export const getUserWorkloadHandler: RequestHandler = async (req, res, next) => {
  try {
    const workload = await calculateWorkload(req.params['id']!);
    res.json({ data: { workload } });
  } catch (err) {
    next(err);
  }
};
