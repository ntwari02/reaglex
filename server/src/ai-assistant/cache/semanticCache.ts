import { Mutex } from 'async-mutex';
import type { CacheEntry } from '../types';
import { normalizePromptForCache } from './normalize';

const TTL_MS = 24 * 60 * 60 * 1000;
const SEMANTIC_THRESHOLD = 0.9;
const CLEANUP_MS = 10 * 60 * 1000;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

export class SemanticCache {
  private readonly exact = new Map<string, CacheEntry>();

  private readonly semantic: CacheEntry[] = [];

  private readonly mutex = new Mutex();

  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, CLEANUP_MS);
    this.cleanupTimer.unref?.();
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    await this.mutex.runExclusive(() => {
      for (const [k, v] of this.exact.entries()) {
        if (now - v.timestamp > TTL_MS) this.exact.delete(k);
      }
      const kept: CacheEntry[] = [];
      for (const e of this.semantic) {
        if (now - e.timestamp <= TTL_MS) kept.push(e);
      }
      this.semantic.length = 0;
      this.semantic.push(...kept);
    });
  }

  async getExact(normalizedKey: string): Promise<CacheEntry | null> {
    return this.mutex.runExclusive(() => {
      const e = this.exact.get(normalizedKey);
      if (!e) return null;
      if (Date.now() - e.timestamp > TTL_MS) {
        this.exact.delete(normalizedKey);
        return null;
      }
      return e;
    });
  }

  async findSemantic(
    embedding: number[],
    excludeNormalizedKey: string,
  ): Promise<CacheEntry | null> {
    return this.mutex.runExclusive(() => {
      const now = Date.now();
      let best: CacheEntry | null = null;
      let bestSim = SEMANTIC_THRESHOLD;
      for (const e of this.semantic) {
        if (now - e.timestamp > TTL_MS) continue;
        if (normalizePromptForCache(e.prompt) === excludeNormalizedKey) continue;
        if (!e.embedding?.length) continue;
        const sim = cosineSimilarity(embedding, e.embedding);
        if (sim >= bestSim) {
          bestSim = sim;
          best = e;
        }
      }
      return best;
    });
  }

  async set(
    normalizedKey: string,
    entry: Omit<CacheEntry, 'timestamp'> & { timestamp?: number },
  ): Promise<void> {
    await this.mutex.runExclusive(() => {
      const full: CacheEntry = {
        ...entry,
        timestamp: entry.timestamp ?? Date.now(),
      };
      this.exact.set(normalizedKey, full);
      this.semantic.push({ ...full, prompt: entry.prompt });
    });
  }
}
