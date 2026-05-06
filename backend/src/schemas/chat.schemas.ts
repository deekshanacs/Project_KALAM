import { z } from 'zod';
import { MessageType } from '../_shared';

export const SendDirectMessageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().max(10000).optional(),   // optional when sending files
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  attachments: z.array(z.string()).default([]),
  replyToId: z.string().optional(),
});

export const SendGroupMessageSchema = z.object({
  groupId: z.string().min(1),
  content: z.string().max(10000).optional(),   // optional when sending files
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  attachments: z.array(z.string()).default([]),
  replyToId: z.string().optional(),
});

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string()).min(1),
});

export const MessageListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
