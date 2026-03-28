import type { ModelTier } from '../types';

interface ModelStats {
  latencyEmaMs: number;
  successCount: number;
  failureCount: number;
}

export class ModelScorer {
  private readonly stats = new Map<string, ModelStats>();

  recordLatency(modelId: string, ms: number): void {
    const prev = this.stats.get(modelId) ?? {
      latencyEmaMs: ms,
      successCount: 0,
      failureCount: 0,
    };
    const alpha = 0.25;
    prev.latencyEmaMs = prev.latencyEmaMs * (1 - alpha) + ms * alpha;
    prev.successCount += 1;
    this.stats.set(modelId, prev);
  }

  recordFailure(modelId: string): void {
    const prev = this.stats.get(modelId) ?? {
      latencyEmaMs: 2000,
      successCount: 0,
      failureCount: 0,
    };
    prev.failureCount += 1;
    this.stats.set(modelId, prev);
  }

  /**
   * Higher is better. Uses latency EMA, error rate, tier match, placeholder quota.
   */
  score(modelId: string, preferredTier: ModelTier, actualTier: ModelTier): number {
    const s = this.stats.get(modelId);
    const latency = s?.latencyEmaMs ?? 2500;
    const total = (s?.successCount ?? 0) + (s?.failureCount ?? 0);
    const errRate = total > 0 ? s!.failureCount / total : 0;

    const tierMatch =
      actualTier === preferredTier ? 40 : actualTier === 2 ? 20 : 10;

    const latencyScore = Math.max(0, 50 - Math.min(50, latency / 100));

    const stability = Math.max(0, 30 - errRate * 100);

    const quotaHint = 20;

    return tierMatch + latencyScore + stability + quotaHint;
  }
}
