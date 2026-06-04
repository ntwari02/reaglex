import type { IntelligenceEntityPreview, IntelligenceSearchHit } from '@/services/adminIntelligenceSearchApi';

type CacheEntry = {
  lite?: IntelligenceEntityPreview;
  full?: IntelligenceEntityPreview;
  at: number;
};

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 48;
const cache = new Map<string, CacheEntry>();

function key(entityType: string, entityId: string) {
  return `${entityType}:${entityId}`;
}

function prune() {
  if (cache.size <= MAX_ENTRIES) return;
  const sorted = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
  for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
    cache.delete(sorted[i][0]);
  }
}

export function previewFromHit(hit: IntelligenceSearchHit): IntelligenceEntityPreview {
  return {
    entityType: hit.entityType,
    entityId: hit.entityId,
    title: hit.title,
    subtitle: hit.subtitle,
    status: hit.status,
    statusTone: hit.statusTone,
    fields: [
      { label: 'Module', value: hit.moduleLabel },
      ...(hit.status ? [{ label: 'Status', value: hit.status }] : []),
    ],
    actions: [{ label: `Open ${hit.moduleLabel}`, href: hit.deepLink, primary: true }],
    relationships: [],
  };
}

export function getCachedPreview(
  entityType: string,
  entityId: string,
  depth: 'lite' | 'full',
): IntelligenceEntityPreview | null {
  const entry = cache.get(key(entityType, entityId));
  if (!entry || Date.now() - entry.at > TTL_MS) return null;
  return depth === 'full' ? entry.full || entry.lite || null : entry.lite || null;
}

export function setCachedPreview(
  entityType: string,
  entityId: string,
  depth: 'lite' | 'full',
  preview: IntelligenceEntityPreview,
) {
  const k = key(entityType, entityId);
  const prev = cache.get(k) || { at: 0 };
  cache.set(k, {
    ...prev,
    at: Date.now(),
    [depth]: preview,
    ...(depth === 'full' ? { lite: prev.lite || preview } : {}),
  });
  prune();
}

export function clearPreviewCache() {
  cache.clear();
}
