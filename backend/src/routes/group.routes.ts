import { Router, RequestHandler } from 'express';
import { zodValidate } from '../middleware/validate';
import { groupMembershipGuard } from '../middleware/groupMembership';
import { CreateGroupSchema } from '../schemas/chat.schemas';
import { IdParamSchema } from '../schemas/user.schemas';
import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';

const router = Router();

const listGroups: RequestHandler = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
        _count: { select: { messages: true } },
      },
    });
    res.json({ data: { groups } });
  } catch (err) { next(err); }
};

const createGroup: RequestHandler = async (req, res, next) => {
  try {
    const { name, memberIds } = req.body as { name: string; memberIds: string[] };
    const allMemberIds = [...new Set([req.user!.id, ...memberIds])];
    const group = await prisma.group.create({
      data: {
        name,
        createdById: req.user!.id,
        members: { create: allMemberIds.map((userId) => ({ userId })) },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
      },
    });
    res.status(201).json({ data: { group } });
  } catch (err) { next(err); }
};

const getGroup: RequestHandler = async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params['id']! },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
      },
    });
    if (!group) throw new NotFoundError('Group');
    res.json({ data: { group } });
  } catch (err) { next(err); }
};

const addMember: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body as { userId: string };
    await prisma.groupMember.create({ data: { groupId: req.params['id']!, userId } });
    res.json({ data: { message: 'Member added' } });
  } catch (err) { next(err); }
};

const removeMember: RequestHandler = async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params['id']! } });
    if (!group) throw new NotFoundError('Group');
    if (group.createdById !== req.user!.id) throw new ForbiddenError('Only the group creator can remove members');
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: req.params['id']!, userId: req.params['userId']! } },
    });
    res.json({ data: { message: 'Member removed' } });
  } catch (err) { next(err); }
};

router.get('/', listGroups);
router.post('/', zodValidate(CreateGroupSchema), createGroup);
router.get('/:id', zodValidate(IdParamSchema, 'params'), groupMembershipGuard, getGroup);
router.post('/:id/members', zodValidate(IdParamSchema, 'params'), groupMembershipGuard, addMember);
router.delete('/:id/members/:userId', zodValidate(IdParamSchema, 'params'), removeMember);

export { router as groupRouter };
