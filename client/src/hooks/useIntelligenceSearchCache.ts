import type { IntelligenceSearchResponse } from '@/services/adminIntelligenceSearchApi';

const TTL_MS = 90_000;
const MAX_ENTRIES = 32;

type Entry = { at: number; data: IntelligenceSearchResponse };

const cache = new Map<string, Entry>();

function cacheKey(q: string, limit: number) {
  return `${q.trim().toLowerCase()}::${limit}`;
}

export function getCachedIntelligenceSearch(
  q: string,
  limit: number,
): IntelligenceSearchResponse | null {
  const key = cacheKey(q, limit);
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return { ...hit.data, cached: true };
}

export function setCachedIntelligenceSearch(
  q: string,
  limit: number,
  data: IntelligenceSearchResponse,
): void {
  const key = cacheKey(q, limit);
  if (cache.size >= MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { at: Date.now(), data });
}

export function clearIntelligenceSearchCache(): void {
  cache.clear();
}
