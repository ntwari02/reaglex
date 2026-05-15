/**
 * Canonical host for meta URLs. Prefer `VITE_SITE_ORIGIN` in production
 * when the SPA is hosted separately from marketing domains.
 */
export function getPreferredSiteOrigin(): string {
  const env = (import.meta.env.VITE_SITE_ORIGIN || '').trim();
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
