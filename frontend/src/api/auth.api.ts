import { apiClient } from './client';
import type { User } from '@tms/shared';

interface AuthResponse {
  data: { user: User; accessToken: string; refreshToken: string };
}

interface TokenResponse {
  data: { accessToken: string; refreshToken: string };
}

export async function loginApi(email: string, password: string): Promise<AuthResponse['data']> {
  const res = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
  return res.data.data;
}

export async function registerApi(name: string, email: string, password: string): Promise<AuthResponse['data']> {
  const res = await apiClient.post<AuthResponse>('/api/auth/register', { name, email, password });
  return res.data.data;
}

export async function refreshApi(refreshToken: string): Promise<TokenResponse['data']> {
  const res = await apiClient.post<TokenResponse>('/api/auth/refresh', { refreshToken });
  return res.data.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await apiClient.post('/api/auth/logout', { refreshToken });
}

export async function getMeApi(): Promise<User> {
  const res = await apiClient.get<{ data: { user: User } }>('/api/auth/me');
  return res.data.data.user;
}
