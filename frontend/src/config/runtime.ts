const normalizeUrl = (value: string | undefined): string => value?.trim() ?? '';

// In production these are set via .env.production or Vercel env vars
// Fallback prevents a hard crash if somehow missing
const apiUrl = normalizeUrl(import.meta.env.VITE_API_URL);
const socketUrl = normalizeUrl(import.meta.env.VITE_SOCKET_URL);

if (!apiUrl) {
  console.error('VITE_API_URL is not set — API calls will fail');
}

export const API_BASE_URL = apiUrl || 'https://project-kalam-backend-production.up.railway.app';
export const SOCKET_URL = socketUrl || 'https://project-kalam-backend-production.up.railway.app';

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
}
