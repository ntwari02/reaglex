/**
 * Central place for public-facing URLs. Uses process.env only; dev fallbacks when NODE_ENV !== production.
 * Never import from routes that execute before dotenv loads — safe after server/index.ts runs dotenv.config().
 */

export function isProductionNodeEnv(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/** Frontend origin (email links, OAuth redirects, payment return, logos). */
export function getClientUrl(): string {
  const v = (process.env.CLIENT_URL || '').trim().replace(/\/$/, '');
  if (v) return v;
  if (!isProductionNodeEnv()) return 'http://localhost:5173';
  return '';
}

/** API / asset server base (uploads, Gemini image URLs, webhooks). */
export function getServerUrl(): string {
  const v =
    (process.env.SERVER_URL || '').trim() ||
    (process.env.RENDER_EXTERNAL_URL || '').trim() ||
    (process.env.APP_URL || '').trim();
  const normalized = v.replace(/\/$/, '');
  if (normalized) return normalized;
  if (!isProductionNodeEnv()) return 'http://localhost:5000';
  return '';
}

/**
 * CORS / Socket.IO allowed browser origins.
 * Production: ALLOWED_ORIGINS (comma-separated) is required when multiple frontends exist.
 */
export function getAllowedCorsOrigins(): string[] {
  const split = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const client = getClientUrl();
  const envList = split(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '');
  const localhostPack = ['http://localhost:5173', 'http://localhost:3000'];

  const expandWww = (origin: string): string[] => {
    try {
      const u = new URL(origin);
      const host = u.hostname;
      if (host.startsWith('www.')) {
        const bare = host.slice(4);
        return [origin, `${u.protocol}//${bare}`];
      }
      return [origin, `${u.protocol}//www.${host}`];
    } catch {
      return [origin];
    }
  };

  if (isProductionNodeEnv()) {
    if (envList.length > 0) return [...new Set(envList.flatMap(expandWww))];
    if (client) {
      console.warn(
        '[cors] ALLOWED_ORIGINS is empty in production; using CLIENT_URL only. Add other app origins (e.g. Vercel preview) to ALLOWED_ORIGINS.',
      );
      return [...new Set(expandWww(client))];
    }
    console.error('[cors] Set CLIENT_URL and ALLOWED_ORIGINS in production.');
    return [];
  }

  return [...new Set([...localhostPack, ...(client ? expandWww(client) : []), ...envList.flatMap(expandWww)])];
}
