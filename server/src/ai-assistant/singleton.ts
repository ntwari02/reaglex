import { SemanticCache } from './cache/semanticCache';
import { ModelBlacklist } from './engine/blacklist';
import { ModelScorer } from './engine/scorer';
import { AIRouter } from './engine/aiRouter';
import { MetricsRegistry } from './observability/metrics';

const cache = new SemanticCache();
const blacklist = new ModelBlacklist();
const scorer = new ModelScorer();
const metrics = new MetricsRegistry();

function timeoutMs(): number {
  const n = Number(process.env.GEMINI_TIMEOUT_MS);
  if (Number.isFinite(n) && n >= 5000 && n <= 15000) return n;
  return 12000;
}

function embeddingModel(): string {
  return (process.env.EMBEDDING_MODEL || 'text-embedding-004').trim();
}

let router: AIRouter | null = null;

export function getAIRouter(): AIRouter | null {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return null;
  if (!router) {
    router = new AIRouter(
      key,
      cache,
      blacklist,
      scorer,
      metrics,
      timeoutMs(),
      embeddingModel(),
    );
  }
  return router;
}

export function getAiMetrics(): MetricsRegistry {
  return metrics;
}

export function getModelBlacklist(): ModelBlacklist {
  return blacklist;
}

export function getModelScorer(): ModelScorer {
  return scorer;
}

export function disposeAiAssistantCache(): void {
  cache.dispose();
}
