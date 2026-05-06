import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Production: VITE_API_URL = https://project-kalam-backend.onrender.com
// Dev: leave VITE_API_URL empty — Vite dev proxy handles /api/* routes
const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 → refresh → retry
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status: number };
      config?: InternalAxiosRequestConfig & { _retry?: boolean };
    };
    const originalRequest = axiosError.config;

    if (axiosError.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          const storedRefreshToken = localStorage.getItem('refreshToken');
          if (!storedRefreshToken) throw new Error('No refresh token');

          refreshPromise = axios
            .post<{ data: { accessToken: string; refreshToken: string } }>(
              `${API_BASE}/api/auth/refresh`,
              { refreshToken: storedRefreshToken }
            )
            .then((res) => {
              const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
              setAccessToken(newAccess);
              localStorage.setItem('refreshToken', newRefresh);
              return newAccess;
            })
            .finally(() => { refreshPromise = null; });
        }

        const newToken = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        setAccessToken(null);
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
