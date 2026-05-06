import { z } from 'zod';
import { TaskStatus, Priority } from '../_shared';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().min(1, 'Assignee is required'),
  projectId: z.string().optional().nullable(),
  attachments: z.array(z.string().url()).max(10).default([]),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  attachments: z.array(z.string().url()).max(10).optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const TaskListQuerySchema = z.object({
  assigneeId: z.string().optional(),
  assignedById: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const CreateTimeLogSchema = z.object({
  hours: z.number().positive().max(24),
  note: z.string().max(500).optional(),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
