import Redis from 'ioredis';

let client: Redis | null | undefined;

export function isRedisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    client = null;
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    client.on('error', (err) => {
      console.warn('[redis]', err.message);
    });
    void client.connect().catch((e) => {
      console.warn('[redis] connect failed:', e.message);
    });
  } catch (e) {
    console.warn('[redis] init failed:', (e as Error).message);
    client = null;
  }
  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedisClient();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  try {
    await r.set(key, value, 'EX', ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function redisDelPattern(prefix: string): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await r.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 50);
      cursor = next;
      if (keys.length) await r.del(...keys);
    } while (cursor !== '0');
  } catch {
    /* ignore */
  }
}
