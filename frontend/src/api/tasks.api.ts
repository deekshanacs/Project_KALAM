import { apiClient } from './client';
import type { TaskWithRelations, TaskStatus, Priority, CommentWithAuthor, TimeLogWithUser } from '@tms/shared';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  assignedToId: string;
  projectId?: string | null;
  attachments?: string[];
}

export async function getTasksApi(filters?: Record<string, unknown>): Promise<TaskWithRelations[]> {
  const res = await apiClient.get<{ data: { tasks: TaskWithRelations[] } }>('/api/tasks', { params: filters });
  return res.data.data.tasks;
}

export async function createTaskApi(payload: CreateTaskPayload): Promise<TaskWithRelations> {
  const res = await apiClient.post<{ data: { task: TaskWithRelations } }>('/api/tasks', payload);
  return res.data.data.task;
}

export async function updateTaskStatusApi(id: string, status: TaskStatus): Promise<TaskWithRelations> {
  const res = await apiClient.patch<{ data: { task: TaskWithRelations } }>(`/api/tasks/${id}/status`, { status });
  return res.data.data.task;
}

export async function deleteTaskApi(id: string): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}

export async function getCommentsApi(taskId: string): Promise<CommentWithAuthor[]> {
  const res = await apiClient.get<{ data: { comments: CommentWithAuthor[] } }>(`/api/tasks/${taskId}/comments`);
  return res.data.data.comments;
}

export async function addCommentApi(taskId: string, content: string): Promise<CommentWithAuthor> {
  const res = await apiClient.post<{ data: { comment: CommentWithAuthor } }>(`/api/tasks/${taskId}/comments`, { content });
  return res.data.data.comment;
}

export async function getTimeLogsApi(taskId: string): Promise<{ timeLogs: TimeLogWithUser[]; totalHours: number }> {
  const res = await apiClient.get<{ data: { timeLogs: TimeLogWithUser[]; totalHours: number } }>(`/api/tasks/${taskId}/time-logs`);
  return res.data.data;
}

export async function logTimeApi(taskId: string, hours: number, note?: string): Promise<TimeLogWithUser> {
  const res = await apiClient.post<{ data: { timeLog: TimeLogWithUser } }>(`/api/tasks/${taskId}/time-logs`, { hours, note });
  return res.data.data.timeLog;
}
