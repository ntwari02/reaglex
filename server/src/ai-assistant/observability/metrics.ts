export interface ModelMetric {
  requests: number;
  successes: number;
  failures: number;
  latencySumMs: number;
}

export class MetricsRegistry {
  private readonly byModel = new Map<string, ModelMetric>();

  private fallbacks = 0;

  getSnapshot(): Record<string, unknown> {
    const models: Record<string, unknown> = {};
    for (const [id, m] of this.byModel.entries()) {
      const avg = m.requests > 0 ? m.latencySumMs / m.requests : 0;
      const rate =
        m.successes + m.failures > 0
          ? m.successes / (m.successes + m.failures)
          : 1;
      models[id] = {
        requests: m.requests,
        successes: m.successes,
        failures: m.failures,
        successRate: rate,
        avgLatencyMs: Math.round(avg),
      };
    }
    return { models, fallbacks: this.fallbacks };
  }

  async recordRequest(modelId: string, ok: boolean, latencyMs: number): Promise<void> {
    const cur = this.byModel.get(modelId) ?? {
      requests: 0,
      successes: 0,
      failures: 0,
      latencySumMs: 0,
    };
    cur.requests += 1;
    cur.latencySumMs += latencyMs;
    if (ok) cur.successes += 1;
    else cur.failures += 1;
    this.byModel.set(modelId, cur);
  }

  async recordFallback(): Promise<void> {
    this.fallbacks += 1;
  }
}
