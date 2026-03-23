/**
 * Centralized API and server configuration.
 * Supports BOTH local development and production via environment variables.
 *
 * Local dev:  .env.development or VITE_API_URL=http://localhost:5000/api
 * Production: .env.production or VITE_API_URL=https://reaglex.onrender.com/api
 */

const DEV_API = 'http://localhost:5000/api';
const DEV_SERVER = 'http://localhost:5000';
const PROD_API = 'https://reaglex.onrender.com/api';
const PROD_SERVER = 'https://reaglex.onrender.com';

const isDev = (import.meta as any).env?.DEV ?? import.meta.env?.MODE === 'development';

/** API base URL - uses VITE_API_URL or falls back to env-appropriate default */
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL?.trim() ||
  (isDev ? DEV_API : PROD_API);

/** Server base URL for uploads, images, WebSocket - uses VITE_SERVER_URL or derived from API */
export const SERVER_URL =
  (import.meta as any).env?.VITE_SERVER_URL?.trim() ||
  (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '')?.trim() ||
  (isDev ? DEV_SERVER : PROD_SERVER);

/** Resolve a relative path (e.g. /uploads/xxx) to full URL */
export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = SERVER_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
