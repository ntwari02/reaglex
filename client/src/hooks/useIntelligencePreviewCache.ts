import { useCallback, useRef } from 'react';
import {
  adminIntelligenceSearchApi,
  type IntelligenceEntityPreview,
  type IntelligenceEntityType,
} from '@/services/adminIntelligenceSearchApi';

const MAX_CACHE = 48;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { preview: IntelligenceEntityPreview; at: number };

function cacheKey(entityType: IntelligenceEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

export function useIntelligencePreviewCache() {
  const cacheRef = useRef(new Map<string, CacheEntry>());
  const inflightRef = useRef(new Map<string, AbortController>());

  const getCached = useCallback((entityType: IntelligenceEntityType, entityId: string) => {
    const key = cacheKey(entityType, entityId);
    const hit = cacheRef.current.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      cacheRef.current.delete(key);
      return null;
    }
    return hit.preview;
  }, []);

  const fetchPreview = useCallback(
    async (
      entityType: IntelligenceEntityType,
      entityId: string,
      signal?: AbortSignal,
    ): Promise<IntelligenceEntityPreview | null> => {
      const cached = getCached(entityType, entityId);
      if (cached) return cached;

      const key = cacheKey(entityType, entityId);
      inflightRef.current.get(key)?.abort();
      const ac = new AbortController();
      inflightRef.current.set(key, ac);
      const merged = signal
        ? (() => {
            signal.addEventListener('abort', () => ac.abort(), { once: true });
            return ac.signal;
          })()
        : ac.signal;

      try {
        const preview = await adminIntelligenceSearchApi.preview(entityType, entityId, merged);
        if (merged.aborted) return null;
        if (cacheRef.current.size >= MAX_CACHE) {
          const first = cacheRef.current.keys().next().value;
          if (first) cacheRef.current.delete(first);
        }
        cacheRef.current.set(key, { preview, at: Date.now() });
        return preview;
      } catch {
        return null;
      } finally {
        if (inflightRef.current.get(key) === ac) inflightRef.current.delete(key);
      }
    },
    [getCached],
  );

  const prefetch = useCallback(
    (entityType: IntelligenceEntityType, entityId: string) => {
      if (getCached(entityType, entityId)) return;
      void fetchPreview(entityType, entityId);
    },
    [fetchPreview, getCached],
  );

  const clear = useCallback(() => {
    inflightRef.current.forEach((ac) => ac.abort());
    inflightRef.current.clear();
    cacheRef.current.clear();
  }, []);

  return { getCached, fetchPreview, prefetch, clear };
}
