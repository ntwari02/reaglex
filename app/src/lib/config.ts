/**
 * Same contract as client `lib/config.ts` — API on `/api`, media on server origin.
 * Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SERVER_URL` in `.env` or `app` config extra.
 */
import Constants from 'expo-constants';

const trim = (s: string | undefined) => (s || '').trim();

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; serverUrl?: string };
const envApi = trim(process.env.EXPO_PUBLIC_API_URL);
const envServer = trim(process.env.EXPO_PUBLIC_SERVER_URL);
const derivedServerFromApi = trim(envApi.replace(/\/api\/?$/i, ''));

const DEV_FALLBACK_API = 'http://localhost:5000/api';
const DEV_FALLBACK_SERVER = 'http://localhost:5000';

export const API_BASE_URL = envApi || trim(extra.apiUrl) || (__DEV__ ? DEV_FALLBACK_API : '');

export const SERVER_URL =
  envServer || trim(extra.serverUrl) || derivedServerFromApi || (__DEV__ ? DEV_FALLBACK_SERVER : '');

if (!__DEV__ && !API_BASE_URL) {
  console.error(
    '[config] EXPO_PUBLIC_API_URL is missing. Set it to your API base (e.g. https://host.com/api).',
  );
}

export function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = SERVER_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Socket.IO URL — same idea as Vite: optional `EXPO_PUBLIC_WS_URL`, else http(s) → ws(s) on server host. */
export function getSocketUrl(): string {
  const w = trim(process.env.EXPO_PUBLIC_WS_URL);
  if (w) return w;
  const s = SERVER_URL;
  if (s.startsWith('https://')) return s.replace(/^https/i, 'wss');
  if (s.startsWith('http://')) return s.replace(/^http/i, 'ws');
  return s;
}
