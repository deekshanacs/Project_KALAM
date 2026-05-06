import { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

export const groupMembershipGuard: RequestHandler = async (req, _res, next) => {
  if (!req.user) { next(new UnauthorizedError()); return; }

  const groupId = req.params['groupId'] ?? (req.body as { groupId?: string }).groupId;
  if (!groupId) { next(new Error('groupId is required')); return; }

  try {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } },
    });
    if (!membership) { next(new ForbiddenError('You are not a member of this group')); return; }
    next();
  } catch (err) { next(err); }
};
