/**
 * Centralized API and server configuration.
 * Production builds must define VITE_API_URL and VITE_SERVER_URL (see .env.production).
 * Development: falls back to localhost when variables are unset.
 */

const trim = (s: string | undefined) => (s || '').trim();

const DEV_FALLBACK_API = 'http://localhost:5000/api';
const DEV_FALLBACK_SERVER = 'http://localhost:5000';

const viteApi = trim(import.meta.env.VITE_API_URL);
const viteServer = trim(import.meta.env.VITE_SERVER_URL);
const derivedServerFromApi = trim(import.meta.env.VITE_API_URL?.replace(/\/api\/?$/i, ''));

/** API base URL — must match the Express app’s /api mount */
export const API_BASE_URL = viteApi || (import.meta.env.DEV ? DEV_FALLBACK_API : '');

/** Origin for uploads, WebSockets, absolute media (no trailing slash) */
export const SERVER_URL =
  viteServer || derivedServerFromApi || (import.meta.env.DEV ? DEV_FALLBACK_SERVER : '');

if (!import.meta.env.DEV && !viteApi) {
  console.error(
    '[config] VITE_API_URL is missing. Set it in client/.env.production (e.g. https://your-api.example.com/api).',
  );
}

if (!import.meta.env.DEV && !viteServer && !derivedServerFromApi) {
  console.error(
    '[config] VITE_SERVER_URL is missing. Set it in client/.env.production (same host as API, without /api).',
  );
}

/** Resolve a relative path (e.g. /uploads/xxx) to full URL */
export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = SERVER_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
