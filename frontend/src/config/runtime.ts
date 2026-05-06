const normalizeUrl = (value: string | undefined): string => value?.trim() ?? '';

function requireUrl(name: string, value: string | undefined): string {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    throw new Error(`${name} is required`);
  }
  return normalized;
}

export const API_BASE_URL = requireUrl('VITE_API_URL', import.meta.env.VITE_API_URL);
export const SOCKET_URL = requireUrl('VITE_SOCKET_URL', import.meta.env.VITE_SOCKET_URL);

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
}