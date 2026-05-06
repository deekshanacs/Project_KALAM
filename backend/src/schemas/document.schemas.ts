import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.record(z.unknown()).default({}),
  font: z.string().default('Inter'),
  fontSize: z.number().int().positive().default(12),
  theme: z.string().default('light'),
  pageSize: z.string().default('A4'),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.record(z.unknown()).optional(),
  font: z.string().optional(),
  fontSize: z.number().int().positive().optional(),
  theme: z.string().optional(),
  pageSize: z.string().optional(),
});

export const ShareDocumentSchema = z.object({
  userIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  permission: z.enum(['VIEW', 'EDIT']),
});
