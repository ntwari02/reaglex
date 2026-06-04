import { getClientUrl, getServerUrl } from '../config/publicEnv';

/** Absolute HTTPS/HTTP URL for email CTA buttons (required by mail clients). */
export function toAbsoluteEmailUrl(pathOrUrl: string): string {
  const raw = String(pathOrUrl || '').trim();
  if (!raw || raw === '#') return getClientUrl() || '/';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = getClientUrl() || getServerUrl() || '';
  if (!base) return raw.startsWith('/') ? raw : `/${raw}`;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${base.replace(/\/$/, '')}${path}`;
}

/** Resolve product/image paths for <img src> in email and in-app thumbnails. */
export function toAbsoluteMediaUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('data:')) return raw;
  const base = (getServerUrl() || getClientUrl() || '').replace(/\/$/, '');
  if (!base) return raw;
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function normalizeMediaUrls(urls: string[] | undefined): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.map(toAbsoluteMediaUrl).filter(Boolean).slice(0, 3);
}

/** Basic sanity check before sending HTML email. */
export function isProductionReadyEmailHtml(html: string): boolean {
  const h = String(html || '');
  return (
    h.includes('<!DOCTYPE html') &&
    h.includes('email-container') &&
    h.includes('@media') &&
    h.length > 200
  );
}
