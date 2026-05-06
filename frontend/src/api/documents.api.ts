import { apiClient } from './client';
import type { Document } from '@tms/shared';

export async function getDocumentsApi(): Promise<Document[]> {
  const res = await apiClient.get<{ data: { documents: Document[] } }>('/api/documents');
  return res.data.data.documents;
}

export async function getDocumentApi(id: string): Promise<Document> {
  const res = await apiClient.get<{ data: { document: Document } }>(`/api/documents/${id}`);
  return res.data.data.document;
}

export async function createDocumentApi(payload: Partial<Document>): Promise<Document> {
  const res = await apiClient.post<{ data: { document: Document } }>('/api/documents', payload);
  return res.data.data.document;
}

export async function updateDocumentApi(id: string, payload: Partial<Document>): Promise<Document> {
  const res = await apiClient.patch<{ data: { document: Document } }>(`/api/documents/${id}`, payload);
  return res.data.data.document;
}

export async function deleteDocumentApi(id: string): Promise<void> {
  await apiClient.delete(`/api/documents/${id}`);
}

export async function shareDocumentApi(id: string, userIds: string[], groupIds: string[], permission: 'VIEW' | 'EDIT'): Promise<void> {
  await apiClient.post(`/api/documents/${id}/share`, { userIds, groupIds, permission });
}
