import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getEntityPreview, runIntelligenceSearch } from '../services/adminIntelligenceSearch.service';
import { explainQuery, INTELLIGENCE_EXAMPLE_QUERIES } from '../search/intelligenceQueryUnderstanding';
import { buildTypingAssistantBrief } from '../search/intelligenceAssistantBrief.service';
import {
  assertSuperAdmin,
  filterIntelligenceHitsByAccess,
  getAdminAccessForUserId,
  canAccessIntelligenceEntity,
} from '../services/adminAccess.service';
import { sanitizeIntelligenceQuery, withSearchTimeout } from '../search/intelligenceGuard';
import {
  buildTypingAiHint,
  getIntelligenceAiConfig,
  setPlatformIntelligenceAiEnabled,
  setUserIntelligenceAiAssist,
  isGeminiConfigured,
} from '../services/intelligenceAiAssist.service';
import { syncIntelligenceIndex } from '../search/intelligenceIndex.service';
import { isMeilisearchEnabled } from '../search/meilisearchClient';
import { isRedisEnabled } from '../search/redisClient';
import type { IntelligenceEntityType } from '../search/intelligenceSearch.types';

export async function adminIntelligenceConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
    const canManage = await assertSuperAdmin(adminId);
    const cfg = await getIntelligenceAiConfig(adminId, { canManagePlatformAi: canManage });
    return res.json(cfg);
  } catch (e: unknown) {
    console.error('[adminIntelligenceConfig]', e);
    return res.status(500).json({ message: 'Failed to load config' });
  }
}

export async function adminIntelligenceSetPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
    if (!isGeminiConfigured()) {
      return res.status(400).json({ message: 'Gemini API key is not configured on the server' });
    }
    const enabled = Boolean(req.body?.aiAssistEnabled);
    const result = await setUserIntelligenceAiAssist(adminId, enabled);
    const cfg = await getIntelligenceAiConfig(adminId);
    return res.json({ ...cfg, ...result });
  } catch (e: unknown) {
    console.error('[adminIntelligenceSetPreferences]', e);
    return res.status(500).json({ message: 'Failed to save preference' });
  }
}

export async function adminIntelligenceSetPlatformAi(req: AuthenticatedRequest, res: Response) {
  try {
    const enabled = Boolean(req.body?.platformAiEnabled);
    const result = await setPlatformIntelligenceAiEnabled(enabled);
    const cfg = await getIntelligenceAiConfig(req.user!.id, {
      canManagePlatformAi: true,
    });
    return res.json({ ...cfg, ...result });
  } catch (e: unknown) {
    console.error('[adminIntelligenceSetPlatformAi]', e);
    return res.status(500).json({ message: 'Failed to update platform setting' });
  }
}

export async function adminIntelligenceSuggest(req: AuthenticatedRequest, res: Response) {
  try {
    const raw = String(req.query.q || '');
    const sanitized = sanitizeIntelligenceQuery(raw);
    const understanding = explainQuery(sanitized.ok ? sanitized.query : raw.trim());

    let aiTypingHint: string | undefined;
    const adminId = req.user?.id;
    if (adminId && sanitized.ok && (await getIntelligenceAiConfig(adminId)).aiAvailable) {
      const hint = await buildTypingAiHint(sanitized.query, {
        intent: understanding.intent,
        intentLabel: understanding.intentLabel,
        summary: understanding.summary,
        searchScope: understanding.searchScope,
        tips: understanding.tips,
        keywords: understanding.keywords,
      });
      if (hint) aiTypingHint = hint.hint;
    }

    const assistant = buildTypingAssistantBrief(
      sanitized.ok ? sanitized.query : raw.trim(),
      understanding,
      aiTypingHint,
    );

    return res.json({
      understanding: {
        intent: understanding.intent,
        intentLabel: understanding.intentLabel,
        summary: understanding.summary,
        searchScope: understanding.searchScope,
        tips: understanding.tips,
        keywords: understanding.keywords,
      },
      assistant,
      ready: sanitized.ok,
      examples: INTELLIGENCE_EXAMPLE_QUERIES,
      aiTypingHint,
    });
  } catch (e: unknown) {
    console.error('[adminIntelligenceSuggest]', e);
    return res.status(500).json({ message: 'Suggest failed' });
  }
}

export async function adminIntelligenceSearch(req: AuthenticatedRequest, res: Response) {
  try {
    const raw = String(req.query.q || '');
    const sanitized = sanitizeIntelligenceQuery(raw);
    const limit = Math.min(32, Math.max(1, Number(req.query.limit) || 24));

    if (!sanitized.ok) {
      const understanding = explainQuery(raw.trim());
      return res.json({
        query: raw.trim().slice(0, 100),
        intent: understanding.intent,
        intentLabel: sanitized.message,
        groups: [],
        total: 0,
        tookMs: 0,
        engine: isMeilisearchEnabled() ? 'meilisearch' : 'mongodb',
        cached: false,
        understanding: {
          intent: understanding.intent,
          intentLabel: understanding.intentLabel,
          summary: understanding.summary,
          searchScope: understanding.searchScope,
          tips: understanding.tips,
          keywords: understanding.keywords,
        },
      });
    }

    const result = await withSearchTimeout(
      runIntelligenceSearch(sanitized.query, limit, req.user?.id, req.ip),
    );
    const access = req.user?.id ? await getAdminAccessForUserId(req.user.id) : null;
    const filteredHits = filterIntelligenceHitsByAccess(
      access,
      result.groups.flatMap((g) => g.hits),
    );
    const allowedIds = new Set(filteredHits.map((h) => h.id));
    const groups = result.groups
      .map((g) => ({
        ...g,
        hits: g.hits.filter((h) => allowedIds.has(h.id)),
      }))
      .filter((g) => g.hits.length > 0);
    const total = groups.reduce((n, g) => n + g.hits.length, 0);
    return res.json({ ...result, groups, total });
  } catch (e: unknown) {
    console.error('[adminIntelligenceSearch]', e);
    const msg = e instanceof Error ? e.message : 'Search failed';
    return res.status(msg.includes('timed out') ? 503 : 500).json({ message: msg });
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
      'dispute',
    ];
    if (!allowed.includes(entityType as IntelligenceEntityType)) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const access = req.user?.id ? await getAdminAccessForUserId(req.user.id) : null;
    if (!canAccessIntelligenceEntity(access, entityType as IntelligenceEntityType)) {
      return res.status(403).json({
        message: 'You do not have permission to view this record.',
        code: 'ADMIN_SCOPE_DENIED',
      });
    }

    const depth = String(req.query.depth || 'lite') === 'full' ? 'full' : 'lite';
    const preview = await getEntityPreview(
      entityType as IntelligenceEntityType,
      entityId,
      depth,
    );
    if (!preview) return res.status(404).json({ message: 'Entity not found' });
    return res.json({ preview, depth });
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
    geminiConfigured: isGeminiConfigured(),
  });
}
