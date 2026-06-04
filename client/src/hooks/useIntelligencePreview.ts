import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { adminIntelligenceSearchApi, type IntelligenceEntityPreview } from '@/services/adminIntelligenceSearchApi';
import type { IntelligenceSearchHit } from '@/services/adminIntelligenceSearchApi';
import {
  getCachedPreview,
  previewFromHit,
  setCachedPreview,
} from '@/lib/intelligencePreviewCache';

type Options = {
  /** Load full dossier (timeline, links) — only when expanded */
  wantFull: boolean;
};

export function useIntelligencePreview(
  activeHit: IntelligenceSearchHit | null,
  { wantFull }: Options,
) {
  const [preview, setPreview] = useState<IntelligenceEntityPreview | null>(null);
  const [loadingLite, setLoadingLite] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    abortRef.current?.abort();
    if (!activeHit) {
      setPreview(null);
      setLoadingLite(false);
      setLoadingFull(false);
      return;
    }

    const { entityType, entityId } = activeHit;
    const instant = previewFromHit(activeHit);
    setPreview(instant);

    const cachedLite = getCachedPreview(entityType, entityId, 'lite');
    if (cachedLite) {
      startTransition(() => setPreview(cachedLite));
    }

    const rid = ++requestIdRef.current;
    const debounce = window.setTimeout(() => {
      const ac = new AbortController();
      abortRef.current = ac;
      setLoadingLite(true);
      adminIntelligenceSearchApi
        .preview(entityType, entityId, 'lite', ac.signal)
        .then((p) => {
          if (rid !== requestIdRef.current || ac.signal.aborted) return;
          setCachedPreview(entityType, entityId, 'lite', p);
          startTransition(() => setPreview(p));
        })
        .catch(() => {
          /* keep instant preview */
        })
        .finally(() => {
          if (rid === requestIdRef.current && !ac.signal.aborted) setLoadingLite(false);
        });
    }, 160);

    return () => {
      clearTimeout(debounce);
      abortRef.current?.abort();
    };
  }, [activeHit?.id, activeHit?.entityType, activeHit?.entityId]);

  useEffect(() => {
    if (!activeHit || !wantFull) return;

    const { entityType, entityId } = activeHit;
    const cachedFull = getCachedPreview(entityType, entityId, 'full');
    if (cachedFull) {
      startTransition(() => setPreview(cachedFull));
      return;
    }

    const rid = ++requestIdRef.current;
    setLoadingFull(true);
    const ac = new AbortController();
    abortRef.current = ac;

    adminIntelligenceSearchApi
      .preview(entityType, entityId, 'full', ac.signal)
      .then((p) => {
        if (rid !== requestIdRef.current || ac.signal.aborted) return;
        setCachedPreview(entityType, entityId, 'full', p);
        startTransition(() => setPreview(p));
      })
      .catch(() => {})
      .finally(() => {
        if (rid === requestIdRef.current) setLoadingFull(false);
      });

    return () => ac.abort();
  }, [activeHit?.id, activeHit?.entityType, activeHit?.entityId, wantFull]);

  const prefetch = useCallback((hit: IntelligenceSearchHit) => {
    const cached = getCachedPreview(hit.entityType, hit.entityId, 'lite');
    if (cached) return;
    void adminIntelligenceSearchApi.preview(hit.entityType, hit.entityId, 'lite').then((p) => {
      setCachedPreview(hit.entityType, hit.entityId, 'lite', p);
    });
  }, []);

  return {
    preview,
    loading: loadingLite,
    loadingFull,
    prefetch,
  };
}
