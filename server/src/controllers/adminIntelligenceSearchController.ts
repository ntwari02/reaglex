import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getEntityPreview, runIntelligenceSearch } from '../services/adminIntelligenceSearch.service';
import { syncIntelligenceIndex } from '../search/intelligenceIndex.service';
import { isMeilisearchEnabled } from '../search/meilisearchClient';
import { isRedisEnabled } from '../search/redisClient';
import type { IntelligenceEntityType } from '../search/intelligenceSearch.types';

export async function adminIntelligenceSearch(req: AuthenticatedRequest, res: Response) {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 24));

    if (q.length < 2) {
      return res.json({
        query: q,
        intent: 'general',
        intentLabel: 'Type at least 2 characters',
        groups: [],
        total: 0,
        tookMs: 0,
        engine: isMeilisearchEnabled() ? 'meilisearch' : 'mongodb',
        cached: false,
      });
    }

    const result = await runIntelligenceSearch(q, limit, req.user?.id, req.ip);
    return res.json(result);
  } catch (e: unknown) {
    console.error('[adminIntelligenceSearch]', e);
    return res.status(500).json({ message: 'Search failed' });
  }
}

export async function adminIntelligencePreview(req: AuthenticatedRequest, res: Response) {
  try {
    const { entityType, entityId } = req.params;
    const allowed: IntelligenceEntityType[] = [
      'user',
      'seller',
      'order',
      'payment',
      'product',
      'vehicle',
      'support',
      'subscription',
    ];
    if (!allowed.includes(entityType as IntelligenceEntityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const preview = await getEntityPreview(entityType as IntelligenceEntityType, entityId);
    if (!preview) return res.status(404).json({ message: 'Entity not found' });
    return res.json({ preview });
  } catch (e: unknown) {
    console.error('[adminIntelligencePreview]', e);
    return res.status(500).json({ message: 'Preview failed' });
  }
}

export async function adminIntelligenceReindex(req: AuthenticatedRequest, res: Response) {
  try {
    const perType = Math.min(500, Math.max(50, Number(req.body?.perType) || 200));
    const result = await syncIntelligenceIndex({ perType });
    return res.json({
      message: 'Index sync started',
      indexed: result.indexed,
      meilisearch: isMeilisearchEnabled(),
    });
  } catch (e: unknown) {
    console.error('[adminIntelligenceReindex]', e);
    return res.status(500).json({ message: 'Reindex failed' });
  }
}

export async function adminIntelligenceStatus(_req: AuthenticatedRequest, res: Response) {
  return res.json({
    meilisearch: isMeilisearchEnabled(),
    redis: isRedisEnabled(),
    bullmq: isRedisEnabled(),
    engine: isMeilisearchEnabled() ? 'meilisearch' : 'mongodb',
    cache: isRedisEnabled() ? 'redis+memory' : 'memory',
    liveSocket: 'admin:intelligence',
  });
}
