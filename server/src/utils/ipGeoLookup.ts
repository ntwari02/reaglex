import axios from 'axios';

const cache = new Map<string, { label: string; at: number }>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Best-effort coarse location label for an IP (admin security views only).
 * Uses ip-api.com public endpoint; cached. Fails closed to a safe string.
 */
export async function lookupIpGeoLabel(ip: string): Promise<string> {
  const raw = (ip || '').trim();
  if (!raw || raw === '::1' || raw === '127.0.0.1' || raw.startsWith('::ffff:127.')) {
    return 'Local / loopback';
  }
  const hit = cache.get(raw);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.label;

  try {
    const { data } = await axios.get(
      `http://ip-api.com/json/${encodeURIComponent(raw)}?fields=status,message,country,regionName,city,query`,
      { timeout: 4500 },
    );
    if (data?.status !== 'success') {
      const label = 'Location unavailable';
      cache.set(raw, { label, at: Date.now() });
      return label;
    }
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    const label = parts.length ? parts.join(', ') : 'Unknown region';
    cache.set(raw, { label, at: Date.now() });
    return label;
  } catch {
    const label = 'Location lookup failed';
    cache.set(raw, { label, at: Date.now() });
    return label;
  }
}

/** Lightweight UA summary for admin displays (no external deps). */
export function summarizeUserAgent(ua: string): { browser: string; os: string; device: string } {
  const s = ua || '';
  let browser = 'Unknown browser';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = 'Chrome';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = 'Safari';
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = 'Opera';

  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(s)) os = 'Windows 10/11';
  else if (/Windows/i.test(s)) os = 'Windows';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Linux/i.test(s)) os = 'Linux';

  let device = 'Desktop';
  if (/Mobile|Android.*Mobile|iPhone/i.test(s)) device = 'Mobile';
  else if (/Tablet|iPad/i.test(s)) device = 'Tablet';

  return { browser, os, device };
}
