import { Router, RequestHandler } from 'express';
import { zodValidate } from '../middleware/validate';
import { IdParamSchema } from '../schemas/user.schemas';
import { CreateDocumentSchema, UpdateDocumentSchema, ShareDocumentSchema } from '../schemas/document.schemas';
import { prisma } from '../lib/prisma';
import { ForbiddenError, NotFoundError } from '../lib/errors';
import { emitToUser } from '../services/socket.service';
import type { DocumentShare } from '../_shared';

const router = Router();

// Helper: safely cast Prisma JSON field to DocumentShare[]
function toSharedWith(value: unknown): DocumentShare[] {
  if (!Array.isArray(value)) return [];
  return value as DocumentShare[];
}

const listDocuments: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const allDocs = await prisma.document.findMany({
      include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const accessible = allDocs.filter((d) => {
      if (d.ownerId === userId) return true;
      return toSharedWith(d.sharedWith).some((s) => s.userId === userId);
    });
    res.json({ data: { documents: accessible } });
  } catch (err) { next(err); }
};

const createDocument: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as {
      title: string;
      content?: Record<string, unknown>;
      font?: string;
      fontSize?: number;
      theme?: string;
      pageSize?: string;
    };
    const doc = await prisma.document.create({
      data: {
        title: body.title,
        content: (body.content ?? {}) as unknown as never,
        font: body.font ?? 'Inter',
        fontSize: body.fontSize ?? 12,
        theme: body.theme ?? 'light',
        pageSize: body.pageSize ?? 'A4',
        ownerId: req.user!.id,
      },
    });
    res.status(201).json({ data: { document: doc } });
  } catch (err) { next(err); }
};

const getDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params['id']! } });
    if (!doc) throw new NotFoundError('Document');
    const userId = req.user!.id;
    if (doc.ownerId !== userId) {
      const shared = toSharedWith(doc.sharedWith);
      if (!shared.some((s) => s.userId === userId)) throw new ForbiddenError('Access denied');
    }
    res.json({ data: { document: doc } });
  } catch (err) { next(err); }
};

const updateDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params['id']! } });
    if (!doc) throw new NotFoundError('Document');
    const userId = req.user!.id;
    if (doc.ownerId !== userId) {
      const shared = toSharedWith(doc.sharedWith);
      const entry = shared.find((s) => s.userId === userId);
      if (!entry || entry.permission !== 'EDIT') throw new ForbiddenError('Edit access required');
    }
    const body = req.body as Record<string, unknown>;
    const updated = await prisma.document.update({
      where: { id: req.params['id']! },
      data: {
        ...(body['title'] !== undefined && { title: body['title'] as string }),
        ...(body['content'] !== undefined && { content: body['content'] as unknown as never }),
        ...(body['font'] !== undefined && { font: body['font'] as string }),
        ...(body['fontSize'] !== undefined && { fontSize: body['fontSize'] as number }),
        ...(body['theme'] !== undefined && { theme: body['theme'] as string }),
        ...(body['pageSize'] !== undefined && { pageSize: body['pageSize'] as string }),
      },
    });
    res.json({ data: { document: updated } });
  } catch (err) { next(err); }
};

const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params['id']! } });
    if (!doc) throw new NotFoundError('Document');
    if (doc.ownerId !== req.user!.id) throw new ForbiddenError('Only the owner can delete documents');
    await prisma.document.delete({ where: { id: req.params['id']! } });
    res.json({ data: { message: 'Document deleted' } });
  } catch (err) { next(err); }
};

const shareDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params['id']! } });
    if (!doc) throw new NotFoundError('Document');
    if (doc.ownerId !== req.user!.id) throw new ForbiddenError('Only the owner can share documents');

    const { userIds = [], groupIds = [], permission } = req.body as {
      userIds?: string[]; groupIds?: string[]; permission: 'VIEW' | 'EDIT';
    };

    const current = toSharedWith(doc.sharedWith);
    const newEntries: DocumentShare[] = [
      ...userIds.map((userId) => ({ userId, permission })),
      ...groupIds.map((groupId) => ({ groupId, permission })),
    ];

    const merged = [...current];
    for (const entry of newEntries) {
      const idx = merged.findIndex(
        (e) =>
          (entry.userId && e.userId === entry.userId) ||
          (entry.groupId && e.groupId === entry.groupId)
      );
      if (idx >= 0) merged[idx] = entry;
      else merged.push(entry);
    }

    // Cast to unknown first to satisfy Prisma's InputJsonValue constraint
    await prisma.document.update({
      where: { id: req.params['id']! },
      data: { sharedWith: merged as unknown as never },
    });

    const owner = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    });
    for (const userId of userIds) {
      emitToUser(userId, 'notification:new', {
        id: crypto.randomUUID(),
        type: 'DOCUMENT_SHARED',
        title: 'Document shared with you',
        message: `${owner?.name ?? 'Someone'} shared "${doc.title}" with you`,
        data: { documentId: doc.id, permission },
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    res.json({ data: { message: 'Document shared' } });
  } catch (err) { next(err); }
};

router.get('/', listDocuments);
router.post('/', zodValidate(CreateDocumentSchema), createDocument);
router.get('/:id', zodValidate(IdParamSchema, 'params'), getDocument);
router.patch('/:id', zodValidate(IdParamSchema, 'params'), zodValidate(UpdateDocumentSchema), updateDocument);
router.delete('/:id', zodValidate(IdParamSchema, 'params'), deleteDocument);
router.post('/:id/share', zodValidate(IdParamSchema, 'params'), zodValidate(ShareDocumentSchema), shareDocument);

export { router as documentRouter };
