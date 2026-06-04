import NodeCache from 'node-cache';
import crypto from 'crypto';
import { isRedisEnabled, redisDelPattern, redisGet, redisSet } from './redisClient';

const memory = new NodeCache({ stdTTL: 45, checkperiod: 90, maxKeys: 500 });

function cacheKey(prefix: string, payload: unknown): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
  return `intel:${prefix}:${hash}`;
}

export async function getCachedSearch<T>(query: string, limit: number): Promise<T | undefined> {
  const key = cacheKey('search', { query, limit });

  if (isRedisEnabled()) {
    const raw = await redisGet(key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        /* fall through */
      }
    }
  }

  return memory.get<T>(key);
}

export async function setCachedSearch<T>(query: string, limit: number, value: T): Promise<void> {
  const key = cacheKey('search', { query, limit });
  memory.set(key, value);

  if (isRedisEnabled()) {
    await redisSet(key, JSON.stringify(value), 45);
  }
}

export async function getCachedPreview<T>(entityType: string, entityId: string): Promise<T | undefined> {
  const key = cacheKey('preview', { entityType, entityId });

  if (isRedisEnabled()) {
    const raw = await redisGet(key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        /* fall through */
      }
    }
  }

  return memory.get<T>(key);
}

export async function setCachedPreview<T>(
  entityType: string,
  entityId: string,
  value: T,
): Promise<void> {
  const key = cacheKey('preview', { entityType, entityId });
  memory.set(key, value, 120);

  if (isRedisEnabled()) {
    await redisSet(key, JSON.stringify(value), 120);
  }
}

/** Bust cached search results after index updates (lightweight prefix scan). */
export async function invalidateSearchCache(): Promise<void> {
  memory.flushAll();
  if (isRedisEnabled()) {
    await redisDelPattern('intel:search:');
    await redisDelPattern('intel:preview:');
  }
}
