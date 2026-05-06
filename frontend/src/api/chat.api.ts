import { apiClient } from './client';
import type { MessageWithSender, GroupWithMembers } from '@tms/shared';

export async function getDirectMessagesApi(userId: string): Promise<MessageWithSender[]> {
  const res = await apiClient.get<{ data: { messages: MessageWithSender[] } }>(`/api/messages/direct/${userId}`);
  return res.data.data.messages;
}

function detectType(attachments?: string[]): string {
  if (!attachments?.length) return 'TEXT';
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(attachments[0] ?? '') ? 'IMAGE' : 'FILE';
}

export async function sendDirectMessageApi(
  receiverId: string,
  content: string,
  attachments?: string[],
  replyToId?: string
): Promise<MessageWithSender> {
  const res = await apiClient.post<{ data: { message: MessageWithSender } }>('/api/messages/direct', {
    receiverId,
    content: content || undefined,
    attachments,
    replyToId,
    type: detectType(attachments),
  });
  return res.data.data.message;
}

export async function getGroupMessagesApi(groupId: string): Promise<MessageWithSender[]> {
  const res = await apiClient.get<{ data: { messages: MessageWithSender[] } }>(`/api/messages/group/${groupId}`);
  return res.data.data.messages;
}

export async function sendGroupMessageApi(
  groupId: string,
  content: string,
  attachments?: string[],
  replyToId?: string
): Promise<MessageWithSender> {
  const res = await apiClient.post<{ data: { message: MessageWithSender } }>('/api/messages/group', {
    groupId,
    content: content || undefined,
    attachments,
    replyToId,
    type: detectType(attachments),
  });
  return res.data.data.message;
}

export async function editMessageApi(messageId: string, content: string): Promise<MessageWithSender> {
  const res = await apiClient.patch<{ data: { message: MessageWithSender } }>(`/api/messages/${messageId}`, { content });
  return res.data.data.message;
}

export async function deleteMessageApi(messageId: string): Promise<void> {
  await apiClient.delete(`/api/messages/${messageId}`);
}

export async function markAsReadApi(messageId: string): Promise<void> {
  await apiClient.post(`/api/messages/${messageId}/read`);
}

export async function reactToMessageApi(messageId: string, emoji: string): Promise<void> {
  await apiClient.post(`/api/messages/${messageId}/react`, { emoji });
}

export async function uploadChatFileApi(file: File): Promise<{ url: string; type: string; name: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ data: { url: string; type: string; name: string } }>(
    '/api/messages/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

export async function getGroupsApi(): Promise<GroupWithMembers[]> {
  const res = await apiClient.get<{ data: { groups: GroupWithMembers[] } }>('/api/groups');
  return res.data.data.groups;
}

export async function createGroupApi(name: string, memberIds: string[]): Promise<GroupWithMembers> {
  const res = await apiClient.post<{ data: { group: GroupWithMembers } }>('/api/groups', { name, memberIds });
  return res.data.data.group;
}
