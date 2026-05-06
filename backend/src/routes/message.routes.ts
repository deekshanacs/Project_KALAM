import { Router, RequestHandler } from 'express';
import { zodValidate } from '../middleware/validate';
import { groupMembershipGuard } from '../middleware/groupMembership';
import { IdParamSchema } from '../schemas/user.schemas';
import {
  SendDirectMessageSchema, SendGroupMessageSchema, EditMessageSchema,
} from '../schemas/chat.schemas';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emitToUser, emitToGroup } from '../services/socket.service';
import { ForbiddenError, NotFoundError } from '../lib/errors';
import type { MessageReaction } from '@tms/shared';
import { upload } from '../middleware/upload';
import path from 'path';
import { env } from '../config/env';

const router = Router();

const messageInclude = {
  sender: { select: { id: true, name: true, avatarUrl: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      sender: { select: { id: true, name: true } },
    },
  },
} as const;

// ─── GET /messages/direct/:userId ─────────────────────────────────────────────
const getDirectMessages: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.params as { userId: string };
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user!.id, receiverId: userId },
          { senderId: userId, receiverId: req.user!.id },
        ],
      },
      include: messageInclude,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ data: { messages } });
  } catch (err) { next(err); }
};

// ─── POST /messages/direct ────────────────────────────────────────────────────
const sendDirectMessage: RequestHandler = async (req, res, next) => {
  try {
    const { receiverId, content, type, attachments, replyToId } = req.body as {
      receiverId: string; content?: string; type?: string;
      attachments?: string[]; replyToId?: string;
    };
    const message = await prisma.message.create({
      data: {
        content: content ?? null,
        type: (type ?? 'TEXT') as never,
        attachments: attachments ?? [],
        readBy: [req.user!.id],
        reactions: [],
        replyToId: replyToId ?? null,
        senderId: req.user!.id,
        receiverId,
      },
      include: messageInclude,
    });
    emitToUser(receiverId, 'message:new', message);
    emitToUser(req.user!.id, 'message:new', message);
    emitToUser(receiverId, 'notification:new', {
      id: crypto.randomUUID(), type: 'MESSAGE_RECEIVED',
      title: 'New message',
      message: content?.slice(0, 80) ?? 'Sent an attachment',
      data: { messageId: message.id, senderId: req.user!.id },
      createdAt: new Date().toISOString(), read: false,
    });
    res.status(201).json({ data: { message } });
  } catch (err) { next(err); }
};

// ─── GET /messages/group/:groupId ─────────────────────────────────────────────
const getGroupMessages: RequestHandler = async (req, res, next) => {
  try {
    const { groupId } = req.params as { groupId: string };
    const messages = await prisma.message.findMany({
      where: { groupId },
      include: messageInclude,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ data: { messages } });
  } catch (err) { next(err); }
};

// ─── POST /messages/group ─────────────────────────────────────────────────────
const sendGroupMessage: RequestHandler = async (req, res, next) => {
  try {
    const { groupId, content, type, attachments, replyToId } = req.body as {
      groupId: string; content?: string; type?: string;
      attachments?: string[]; replyToId?: string;
    };
    const message = await prisma.message.create({
      data: {
        content: content ?? null,
        type: (type ?? 'TEXT') as never,
        attachments: attachments ?? [],
        readBy: [req.user!.id],
        reactions: [],
        replyToId: replyToId ?? null,
        senderId: req.user!.id,
        groupId,
      },
      include: messageInclude,
    });
    emitToGroup(groupId, 'message:new', message);
    res.status(201).json({ data: { message } });
  } catch (err) { next(err); }
};

// ─── PATCH /messages/:id (edit) ───────────────────────────────────────────────
const editMessage: RequestHandler = async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params['id']! } });
    if (!msg) throw new NotFoundError('Message');
    if (msg.senderId !== req.user!.id) throw new ForbiddenError('Only the sender can edit');
    if (msg.deletedAt) { res.status(400).json({ error: 'Cannot edit a deleted message' }); return; }
    const updated = await prisma.message.update({
      where: { id: req.params['id']! },
      data: { content: (req.body as { content: string }).content, editedAt: new Date() },
      include: messageInclude,
    });
    if (msg.receiverId) emitToUser(msg.receiverId, 'message:edited', updated);
    if (msg.groupId) emitToGroup(msg.groupId, 'message:edited', updated);
    emitToUser(msg.senderId, 'message:edited', updated);
    res.json({ data: { message: updated } });
  } catch (err) { next(err); }
};

// ─── DELETE /messages/:id ─────────────────────────────────────────────────────
const deleteMessage: RequestHandler = async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params['id']! } });
    if (!msg) throw new NotFoundError('Message');
    if (msg.senderId !== req.user!.id) throw new ForbiddenError('Only the sender can delete');
    const updated = await prisma.message.update({
      where: { id: req.params['id']! },
      data: { deletedAt: new Date(), content: null },
      include: messageInclude,
    });
    if (msg.receiverId) emitToUser(msg.receiverId, 'message:deleted', updated);
    if (msg.groupId) emitToGroup(msg.groupId, 'message:deleted', updated);
    emitToUser(msg.senderId, 'message:deleted', updated);
    res.json({ data: { message: 'Deleted' } });
  } catch (err) { next(err); }
};

// ─── POST /messages/:id/read ──────────────────────────────────────────────────
const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params['id']! } });
    if (!msg) throw new NotFoundError('Message');
    const readBy = msg.readBy as string[];
    if (!readBy.includes(req.user!.id)) {
      await prisma.message.update({
        where: { id: req.params['id']! },
        data: { readBy: [...readBy, req.user!.id] },
      });
      emitToUser(msg.senderId, 'message:read', {
        messageId: msg.id,
        readBy: [...readBy, req.user!.id],
        readerId: req.user!.id,
      });
    }
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
};

// ─── POST /messages/:id/react ─────────────────────────────────────────────────
const ReactSchema = z.object({ emoji: z.string().min(1).max(10) });

const reactToMessage: RequestHandler = async (req, res, next) => {
  try {
    const { emoji } = req.body as { emoji: string };
    const msg = await prisma.message.findUnique({ where: { id: req.params['id']! } });
    if (!msg) throw new NotFoundError('Message');

    const reactions = ((msg.reactions as unknown) as MessageReaction[]) ?? [];
    const existingIdx = reactions.findIndex(
      (r) => r.userId === req.user!.id && r.emoji === emoji
    );

    let updated: MessageReaction[];
    if (existingIdx >= 0) {
      // Toggle off
      updated = reactions.filter((_, i) => i !== existingIdx);
    } else {
      // Add reaction
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      });
      updated = [...reactions, { emoji, userId: req.user!.id, userName: user?.name ?? '' }];
    }

    await prisma.message.update({
      where: { id: req.params['id']! },
      data: { reactions: updated as never },
      include: messageInclude,
    });

    const payload = { messageId: msg.id, reactions: updated };
    if (msg.receiverId) {
      emitToUser(msg.receiverId, 'message:reaction', payload);
      emitToUser(msg.senderId, 'message:reaction', payload);
    }
    if (msg.groupId) emitToGroup(msg.groupId, 'message:reaction', payload);

    res.json({ data: { reactions: updated } });
  } catch (err) { next(err); }
};

// ─── POST /messages/upload ────────────────────────────────────────────────────
const uploadChatFile: RequestHandler = (req, res, _next) => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const url = `${process.env['VITE_API_URL'] ?? `http://localhost:${env.PORT}`}/uploads/${path.basename(req.file.path)}`;
  const isImage = req.file.mimetype.startsWith('image/');
  res.json({ data: { url, type: isImage ? 'IMAGE' : 'FILE', name: req.file.originalname } });
};

router.post('/upload', upload.single('file'), uploadChatFile);  // MUST be before /:id routes
router.get('/direct/:userId', getDirectMessages);
router.post('/direct', zodValidate(SendDirectMessageSchema), sendDirectMessage);
router.get('/group/:groupId', groupMembershipGuard, getGroupMessages);
router.post('/group', zodValidate(SendGroupMessageSchema), groupMembershipGuard, sendGroupMessage);
router.patch('/:id', zodValidate(IdParamSchema, 'params'), zodValidate(EditMessageSchema), editMessage);
router.delete('/:id', zodValidate(IdParamSchema, 'params'), deleteMessage);
router.post('/:id/read', zodValidate(IdParamSchema, 'params'), markAsRead);
router.post('/:id/react', zodValidate(IdParamSchema, 'params'), zodValidate(ReactSchema), reactToMessage);

export { router as messageRouter };
