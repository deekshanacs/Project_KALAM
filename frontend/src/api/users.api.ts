import { apiClient } from './client';
import type { User, WorkloadDto, TaskWithRelations, AvailabilityStatus } from '@tms/shared';

export async function getUsersApi(): Promise<User[]> {
  const res = await apiClient.get<{ data: { users: User[] } }>('/api/users');
  return res.data.data.users;
}

export async function getUserApi(id: string): Promise<User> {
  const res = await apiClient.get<{ data: { user: User } }>(`/api/users/${id}`);
  return res.data.data.user;
}

export async function updateStatusApi(id: string, availabilityStatus: AvailabilityStatus): Promise<User> {
  const res = await apiClient.patch<{ data: { user: User } }>(`/api/users/${id}/status`, { availabilityStatus });
  return res.data.data.user;
}

export async function updateSupervisorApi(id: string, supervisorId: string | null): Promise<User> {
  const res = await apiClient.patch<{ data: { user: User } }>(`/api/users/${id}/supervisor`, { supervisorId });
  return res.data.data.user;
}

export async function getUserTasksApi(id: string): Promise<TaskWithRelations[]> {
  const res = await apiClient.get<{ data: { tasks: TaskWithRelations[] } }>(`/api/users/${id}/tasks`);
  return res.data.data.tasks;
}

export async function getWorkloadApi(id: string): Promise<WorkloadDto> {
  const res = await apiClient.get<{ data: { workload: WorkloadDto } }>(`/api/users/${id}/workload`);
  return res.data.data.workload;
}
