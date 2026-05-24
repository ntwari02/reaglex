import NodeCache from 'node-cache';
import crypto from 'crypto';

const cache = new NodeCache({ stdTTL: 45, checkperiod: 90, maxKeys: 500 });

function cacheKey(prefix: string, payload: unknown): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
  return `${prefix}:${hash}`;
}

export function getCachedSearch<T>(query: string, limit: number): T | undefined {
  return cache.get<T>(cacheKey('admin_intel', { query, limit }));
}

export function setCachedSearch<T>(query: string, limit: number, value: T): void {
  cache.set(cacheKey('admin_intel', { query, limit }), value);
}

export function getCachedPreview<T>(entityType: string, entityId: string): T | undefined {
  return cache.get<T>(cacheKey('admin_intel_preview', { entityType, entityId }));
}

export function setCachedPreview<T>(entityType: string, entityId: string, value: T): void {
  cache.set(cacheKey('admin_intel_preview', { entityType, entityId }), value, 120);
}
