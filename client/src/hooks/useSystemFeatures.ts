import { useCallback, useEffect, useState } from 'react';
import api from '@/services/api';

type FeaturesMap = Record<string, boolean>;

let cached: FeaturesMap | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;
let inflight: Promise<FeaturesMap> | null = null;

async function fetchFeatures(): Promise<FeaturesMap> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;
  if (inflight) return inflight;
  inflight = api
    .get<{ features: FeaturesMap }>('/platform/features')
    .then((r) => {
      cached = r.data?.features || {};
      cachedAt = Date.now();
      return cached;
    })
    .catch(() => cached || {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateSystemFeaturesCache() {
  cached = null;
  cachedAt = 0;
}

/** Defaults to enabled when unknown — safe for storefront. */
export function useSystemFeatures() {
  const [features, setFeatures] = useState<FeaturesMap>(cached || {});
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    void fetchFeatures().then((map) => {
      if (!cancelled) {
        setFeatures(map);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isEnabled = useCallback(
    (key: string) => features[key] !== false,
    [features],
  );

  return { features, loading, isEnabled, refresh: fetchFeatures };
}

/** True while loading or when the platform switch is on (safe default). */
export function usePlatformFeature(featureKey: string) {
  const { isEnabled, loading } = useSystemFeatures();
  return { enabled: loading || isEnabled(featureKey), loading };
}
