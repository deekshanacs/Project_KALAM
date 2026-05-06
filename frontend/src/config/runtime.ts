// These are replaced at build time by Vite from .env.production or Vercel env vars
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';
const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim() ?? '';

if (!apiUrl) {
  console.error('[TMS] VITE_API_URL is not set — API calls will fail');
}

export const API_BASE_URL = apiUrl;
export const SOCKET_URL = socketUrl || apiUrl;

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${normalizedPath}`;
}
