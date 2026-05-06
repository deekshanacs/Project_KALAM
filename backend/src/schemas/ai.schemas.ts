import { z } from 'zod';

export const CreateDocumentRequestSchema = z.object({
  description: z.string().min(1, 'Description is required').max(2000),
  answers: z.object({
    type: z.string().min(1),
    tone: z.string().min(1),
    font: z.string().min(1),
    fontSize: z.string().min(1),
    pageSize: z.enum(['A4', 'Letter', 'Legal']),
    toc: z.boolean(),
    sections: z.string().min(1),
    colorTheme: z.string().min(1),
    headerFooter: z.boolean(),
    outputFormat: z.string().min(1),
  }),
});

export const GenerateDocxSchema = z.object({
  content: z.string().min(1),
  options: z.object({
    title: z.string().optional(),
    font: z.string().optional(),
    fontSize: z.coerce.number().int().positive().optional(),
    pageSize: z.enum(['A4', 'Letter', 'Legal']).optional(),
    headerFooter: z.boolean().optional(),
  }),
});
