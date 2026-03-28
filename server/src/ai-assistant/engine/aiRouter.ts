import { determineTaskComplexity } from './complexity';
import { ModelBlacklist } from './blacklist';
import { ModelScorer } from './scorer';
import { neverStopExecute } from './neverStop';
import {
  generateText,
  generateWithSystemInstruction,
  embedText,
} from '../services/geminiClient';
import { SemanticCache } from '../cache/semanticCache';
import { normalizePromptForCache } from '../cache/normalize';
import { logger } from '../observability/logger';
import type { MetricsRegistry } from '../observability/metrics';
import type { ModelTier, TaskComplexityResult } from '../types';

const BUSY_MESSAGE =
  'All AI models are currently busy. Please try again shortly.';

export interface RouterResult {
  text: string;
  model: string;
  tier: ModelTier;
  complexity: TaskComplexityResult;
  cacheHit: 'exact' | 'semantic' | false;
  fallbackOccurred: boolean;
}

export class AIRouter {
  constructor(
    private apiKey: string,
    private cache: SemanticCache,
    private blacklist: ModelBlacklist,
    private scorer: ModelScorer,
    private metrics: MetricsRegistry,
    private timeoutMs: number,
    private embeddingModel: string,
  ) {}

  /** Plain user prompt (no system instruction) — uses exact + semantic cache. */
  async route(prompt: string): Promise<RouterResult> {
    const normalized = normalizePromptForCache(prompt);

    const exact = await this.cache.getExact(normalized);
    if (exact) {
      logger.info({ cache: 'exact' }, 'ai_cache_hit');
      return {
        text: exact.response,
        model: 'cache',
        tier: 2,
        complexity: determineTaskComplexity(prompt),
        cacheHit: 'exact',
        fallbackOccurred: false,
      };
    }

    let embedding: number[] | undefined;
    try {
      embedding = await embedText(
        this.apiKey,
        this.embeddingModel,
        prompt.slice(0, 8000),
        Math.min(15000, this.timeoutMs * 2),
      );
      if (embedding.length) {
        const sem = await this.cache.findSemantic(embedding, normalized);
        if (sem) {
          logger.info({ cache: 'semantic' }, 'ai_cache_hit');
          return {
            text: sem.response,
            model: 'cache',
            tier: 2,
            complexity: determineTaskComplexity(prompt),
            cacheHit: 'semantic',
            fallbackOccurred: false,
          };
        }
      }
    } catch (e) {
      logger.warn({ err: e }, 'ai_embedding_skipped');
    }

    const complexity = determineTaskComplexity(prompt);

    const run = async (modelId: string) =>
      generateText(this.apiKey, modelId, prompt, { timeoutMs: this.timeoutMs });

    const outcome = await neverStopExecute({
      assignedTier: complexity.tier,
      blacklist: this.blacklist,
      scorer: this.scorer,
      metrics: this.metrics,
      run,
    });

    if (!outcome.ok) {
      return {
        text: BUSY_MESSAGE,
        model: 'none',
        tier: complexity.tier,
        complexity,
        cacheHit: false,
        fallbackOccurred: true,
      };
    }

    let embForStore = embedding;
    if (!embForStore?.length) {
      try {
        embForStore = await embedText(
          this.apiKey,
          this.embeddingModel,
          prompt.slice(0, 8000),
          Math.min(15000, this.timeoutMs * 2),
        );
      } catch {
        embForStore = undefined;
      }
    }

    await this.cache.set(normalized, {
      prompt,
      response: outcome.value,
      embedding: embForStore,
    });

    return {
      text: outcome.value,
      model: outcome.model,
      tier: outcome.tier,
      complexity,
      cacheHit: false,
      fallbackOccurred: outcome.fallbackOccurred,
    };
  }

  /** Docs assistant: system + user; cache key = role + user message. */
  async routeAssistant(
    systemInstruction: string,
    userMessage: string,
    cacheKeyExtra: string,
  ): Promise<RouterResult> {
    const prompt = `${cacheKeyExtra}\n${userMessage}`;
    const normalized = normalizePromptForCache(prompt);

    const exact = await this.cache.getExact(normalized);
    if (exact) {
      logger.info({ cache: 'exact' }, 'ai_cache_hit');
      return {
        text: exact.response,
        model: 'cache',
        tier: 2,
        complexity: determineTaskComplexity(userMessage),
        cacheHit: 'exact',
        fallbackOccurred: false,
      };
    }

    let embedding: number[] | undefined;
    try {
      embedding = await embedText(
        this.apiKey,
        this.embeddingModel,
        prompt.slice(0, 8000),
        Math.min(15000, this.timeoutMs * 2),
      );
      if (embedding.length) {
        const sem = await this.cache.findSemantic(embedding, normalized);
        if (sem) {
          logger.info({ cache: 'semantic' }, 'ai_cache_hit');
          return {
            text: sem.response,
            model: 'cache',
            tier: 2,
            complexity: determineTaskComplexity(userMessage),
            cacheHit: 'semantic',
            fallbackOccurred: false,
          };
        }
      }
    } catch (e) {
      logger.warn({ err: e }, 'ai_embedding_skipped');
    }

    const complexity = determineTaskComplexity(userMessage);

    const run = async (modelId: string) =>
      generateWithSystemInstruction(
        this.apiKey,
        modelId,
        systemInstruction,
        userMessage,
        { timeoutMs: this.timeoutMs },
      );

    const outcome = await neverStopExecute({
      assignedTier: complexity.tier,
      blacklist: this.blacklist,
      scorer: this.scorer,
      metrics: this.metrics,
      run,
    });

    if (!outcome.ok) {
      return {
        text: BUSY_MESSAGE,
        model: 'none',
        tier: complexity.tier,
        complexity,
        cacheHit: false,
        fallbackOccurred: true,
      };
    }

    let embForStore = embedding;
    if (!embForStore?.length) {
      try {
        embForStore = await embedText(
          this.apiKey,
          this.embeddingModel,
          prompt.slice(0, 8000),
          Math.min(15000, this.timeoutMs * 2),
        );
      } catch {
        embForStore = undefined;
      }
    }

    await this.cache.set(normalized, {
      prompt,
      response: outcome.value,
      embedding: embForStore,
    });

    return {
      text: outcome.value,
      model: outcome.model,
      tier: outcome.tier,
      complexity,
      cacheHit: false,
      fallbackOccurred: outcome.fallbackOccurred,
    };
  }
}
