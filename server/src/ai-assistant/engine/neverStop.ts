import type { ModelTier } from '../types';
import { ModelBlacklist } from './blacklist';
import { ModelScorer } from './scorer';
import type { MetricsRegistry } from '../observability/metrics';
import { getModelsForTier } from '../config/models';
import { logger } from '../observability/logger';
import { GeminiClientError } from '../services/geminiClient';

function classifyError(err: unknown): {
  is429: boolean;
  is5xx: boolean;
  isTimeout: boolean;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const s = msg.toLowerCase();
  const isTimeout =
    s.includes('timeout') || (err instanceof Error && err.message.includes('TIMEOUT'));
  const is429 =
    s.includes('429') || s.includes('resource exhausted') || s.includes('quota');
  const is5xx =
    s.includes('500') ||
    s.includes('502') ||
    s.includes('503') ||
    s.includes('504') ||
    /[^0-9]5\d\d[^0-9]/.test(msg);
  return { is429, is5xx, isTimeout };
}

function tierTryOrder(assigned: ModelTier): ModelTier[] {
  if (assigned === 1) return [1, 2, 3];
  if (assigned === 2) return [2, 3, 1];
  return [3, 1, 2];
}

export interface NeverStopSuccess<T> {
  ok: true;
  value: T;
  model: string;
  tier: ModelTier;
  fallbackOccurred: boolean;
}

export interface NeverStopFailure {
  ok: false;
  error: unknown;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Try models across tiers with 429 blacklist, 5xx retries (up to 2), timeout retry (once).
 */
export async function neverStopExecute<T>(params: {
  assignedTier: ModelTier;
  blacklist: ModelBlacklist;
  scorer: ModelScorer;
  metrics: MetricsRegistry;
  run: (modelId: string) => Promise<T>;
}): Promise<NeverStopSuccess<T> | NeverStopFailure> {
  const { assignedTier, blacklist, scorer, metrics, run } = params;

  const tiersToTry = tierTryOrder(assignedTier);
  let fallbackOccurred = false;

  for (const tier of tiersToTry) {
    if (tier !== assignedTier) {
      fallbackOccurred = true;
      await metrics.recordFallback();
      logger.warn({ fromTier: assignedTier, toTier: tier }, 'ai_router_tier_fallback');
    }

    const models = getModelsForTier(tier);
    const ranked = [...models].sort((a, b) => {
      const sa = scorer.score(a, assignedTier, tier);
      const sb = scorer.score(b, assignedTier, tier);
      return sb - sa;
    });

    for (const modelId of ranked) {
      if (await blacklist.isBlocked(modelId)) continue;

      let fivexxRetries = 0;
      let timeoutRetries = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const start = Date.now();
        try {
          const value = await run(modelId);
          const latency = Date.now() - start;
          scorer.recordLatency(modelId, latency);
          await metrics.recordRequest(modelId, true, latency);
          logger.info(
            { model: modelId, tier, latencyMs: latency, fallbackOccurred },
            'ai_router_success',
          );
          return {
            ok: true,
            value,
            model: modelId,
            tier,
            fallbackOccurred,
          };
        } catch (err) {
          const latency = Date.now() - start;
          await metrics.recordRequest(modelId, false, latency);
          scorer.recordFailure(modelId);

          const c = classifyError(err);

          logger.warn(
            {
              model: modelId,
              tier,
              err: err instanceof Error ? err.message : String(err),
              ...c,
            },
            'ai_router_model_error',
          );

          if (c.is429) {
            await blacklist.blockForRateLimit(modelId);
            break;
          }

          if (c.is5xx && fivexxRetries < 2) {
            fivexxRetries += 1;
            await sleep(350 * fivexxRetries);
            continue;
          }

          if (c.isTimeout && timeoutRetries < 1) {
            timeoutRetries += 1;
            continue;
          }

          if (err instanceof GeminiClientError && err.code === 'EMPTY' && timeoutRetries < 1) {
            timeoutRetries += 1;
            continue;
          }

          break;
        }
      }
    }
  }

  return { ok: false, error: new Error('all_models_failed') };
}
