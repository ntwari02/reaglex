import { Mutex } from 'async-mutex';

function randomBlacklistMs(): number {
  return 30 * 60 * 1000 + Math.floor(Math.random() * 30 * 60 * 1000);
}

export class ModelBlacklist {
  private readonly until = new Map<string, number>();

  private readonly mutex = new Mutex();

  async isBlocked(modelId: string): Promise<boolean> {
    return this.mutex.runExclusive(() => {
      const t = this.until.get(modelId);
      if (!t) return false;
      if (Date.now() >= t) {
        this.until.delete(modelId);
        return false;
      }
      return true;
    });
  }

  /** Call after HTTP 429 / quota errors. */
  async blockForRateLimit(modelId: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.until.set(modelId, Date.now() + randomBlacklistMs());
    });
  }

  async clear(modelId: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.until.delete(modelId);
    });
  }
}
