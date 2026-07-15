/**
 * marketplaceAIController.ts — both buyer + admin endpoints for the
 * autonomous marketplace AI.
 *
 *   PUBLIC / buyer:
 *     GET  /api/home/feed         — full personalised feed
 *     GET  /api/home/section/:id  — single section
 *     POST /api/home/track        — behaviour beacon
 *
 *   ADMIN (admin only):
 *     GET  /api/admin/marketplace-ai/config
 *     PUT  /api/admin/marketplace-ai/config
 *     POST /api/admin/marketplace-ai/preset
 *     POST /api/admin/marketplace-ai/recompute
 *     GET  /api/admin/marketplace-ai/diagnostics
 */

import { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthenticatedRequest } from '../middleware/auth';
import {
  MarketplaceAIConfig,
  applyPreset,
  getMarketplaceAIConfig,
  invalidateMarketplaceAIConfigCache,
  type MarketplaceMode,
} from '../models/MarketplaceAIConfig';
import { buildHomeFeed, buildHomeSection, type FeedSectionId } from '../services/ai/homeFeedService';
import { trackBehavior, type BehaviorEvent } from '../services/ai/sessionIntentService';
import { recomputeAllProductSignals } from '../services/ai/trendDetectionEngine';
import { recomputeAllFraudRisks } from '../services/ai/fraudSignalEngine';
import { refreshSellerTrust } from '../services/ai/sellerTrustEngine';
import { ProductSignalSnapshot } from '../models/ProductSignalSnapshot';
import { SellerTrustProfile } from '../models/SellerTrustProfile';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { BuyerSessionIntent } from '../models/BuyerSessionIntent';
import { CoOccurrenceEdge } from '../models/CoOccurrenceEdge';
import { CategoryAdjacency } from '../models/CategoryAdjacency';
import { ProductIntelligence } from '../models/ProductIntelligence';
import { listRules } from '../services/ai/eventRuleEngine';
import { recomputeCategoryAdjacency, getRelated } from '../services/ai/coOccurrenceEngine';
import { bootstrapManual } from '../services/ai/categoryAdjacencyEngine';
import { planHomepage } from '../services/ai/homepageOrchestrator';
import { decideMarketplaceDirective } from '../services/ai/marketplaceOrchestrator';
import { getMarketHealth } from '../models/MarketHealth';
import { runStabilityTick, invalidateDampingCache } from '../services/ai/stabilityController';
import { recomputeEconomicHealth, getEconomicSummary } from '../services/ai/economicEngine';
import { refreshLifecycle, refreshActiveLifecycles } from '../services/ai/lifecycleEngine';
import { refreshBuyerTrust, refreshActiveBuyerTrust } from '../services/ai/buyerTrustEngine';
import {
  recomputeRuleEffectiveness,
  listTroubledRules,
  resetRule,
} from '../services/ai/ruleEffectivenessTracker';
import { runSimulation } from '../services/ai/simulationEngine';
import {
  getProductNeighbours,
  recommendForUser,
  findCollusionClusters,
  getGraphStats,
} from '../services/ai/marketGraphService';
import { BuyerLifecycle } from '../models/BuyerLifecycle';
import { BuyerTrustProfile } from '../models/BuyerTrustProfile';
import { RuleEffectiveness } from '../models/RuleEffectiveness';

/* ─────────────────────── BUYER ENDPOINTS ─────────────────────── */

function ensureSessionId(req: AuthenticatedRequest): string {
  const candidate =
    (req.headers['x-spacilly-session'] as string) ||
    (req.headers['x-session-id'] as string) ||
    (req.query?.sessionId as string) ||
    (req.body?.sessionId as string);
  if (candidate && typeof candidate === 'string' && candidate.length <= 120) return candidate;
  return `anon-${new mongoose.Types.ObjectId().toHexString()}`;
}

function detectDevice(req: AuthenticatedRequest): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  const ua = String(req.headers['user-agent'] || '').toLowerCase();
  if (!ua) return 'unknown';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  return 'desktop';
}

function detectCountry(req: AuthenticatedRequest): string | undefined {
  const h =
    (req.headers['cf-ipcountry'] as string) ||
    (req.headers['x-vercel-ip-country'] as string) ||
    (req.headers['x-country'] as string);
  if (h && typeof h === 'string' && h.length >= 2 && h.length <= 4) return h.toUpperCase();
  return undefined;
}

export async function getHomeFeed(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const sessionId = ensureSessionId(req);
    const limit = Number(req.query?.limit) || 12;
    const country = (req.query?.country as string) || detectCountry(req);
    const device = (req.query?.device as any) || detectDevice(req);

    const feed = await buildHomeFeed({
      userId,
      sessionId,
      country,
      device,
      limitPerSection: limit,
    });

    // Send sessionId back so anonymous users can persist it on the client.
    res.setHeader('X-Spacilly-Session', sessionId);
    return res.json(feed);
  } catch (err: any) {
    console.error('[marketplace-ai] feed failed', err);
    return res.status(500).json({ message: 'Failed to build home feed.' });
  }
}

export async function getHomeFeedSection(req: AuthenticatedRequest, res: Response) {
  try {
    const id = String(req.params.section || '') as FeedSectionId;
    const allowed: FeedSectionId[] = [
      'hero', 'foryou', 'trending', 'deals', 'fresh', 'bestsellers', 'near_you', 'inspired', 'upcoming',
    ];
    if (!allowed.includes(id)) return res.status(400).json({ message: 'Unknown section.' });

    const userId = req.user?.id;
    const sessionId = ensureSessionId(req);
    const limit = Number(req.query?.limit) || undefined;
    const country = (req.query?.country as string) || detectCountry(req);
    const device = (req.query?.device as any) || detectDevice(req);

    const section = await buildHomeSection(id, {
      userId,
      sessionId,
      country,
      device,
      limitPerSection: limit,
    });
    if (!section) return res.json({ id, products: [] });
    res.setHeader('X-Spacilly-Session', sessionId);
    return res.json(section);
  } catch (err: any) {
    console.error('[marketplace-ai] section failed', err);
    return res.status(500).json({ message: 'Failed to build section.' });
  }
}

export async function postBehaviorTrack(req: AuthenticatedRequest, res: Response) {
  try {
    const sessionId = ensureSessionId(req);
    const userId = req.user?.id;
    const event = (req.body || {}).event as BehaviorEvent;
    if (!event || typeof event !== 'object' || !event.type) {
      return res.status(400).json({ message: 'event is required.' });
    }
    await trackBehavior({
      sessionId,
      userId,
      event,
      context: {
        device: detectDevice(req),
        country: detectCountry(req),
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
        userAgent: String(req.headers['user-agent'] || ''),
        localHour: Number(req.body?.localHour),
        timezoneOffsetMin: Number(req.body?.timezoneOffsetMin),
      },
    });
    res.setHeader('X-Spacilly-Session', sessionId);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[marketplace-ai] track failed', err);
    return res.status(500).json({ message: 'Failed to track.' });
  }
}

/* ─────────────────────── ADMIN ENDPOINTS ─────────────────────── */

export async function getAIConfig(_req: AuthenticatedRequest, res: Response) {
  try {
    const cfg = await getMarketplaceAIConfig();
    return res.json(cfg);
  } catch (err: any) {
    console.error('[marketplace-ai] getConfig failed', err);
    return res.status(500).json({ message: 'Failed to load config.' });
  }
}

const ALLOWED_TOP_FIELDS = new Set([
  'enabled',
  'modeLocked',
  'weights',
  'sliders',
  'trustTierBoosts',
  'subscriptionBoosts',
  'sponsored',
]);

export async function updateAIConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const body = req.body || {};
    const cfg = await getMarketplaceAIConfig();
    for (const key of Object.keys(body)) {
      if (!ALLOWED_TOP_FIELDS.has(key)) continue;
      if (typeof (cfg as any)[key] === 'object' && (cfg as any)[key] !== null) {
        Object.assign((cfg as any)[key], body[key] || {});
        cfg.markModified(key);
      } else {
        (cfg as any)[key] = body[key];
      }
    }
    await cfg.save();
    invalidateMarketplaceAIConfigCache();
    return res.json(cfg);
  } catch (err: any) {
    console.error('[marketplace-ai] updateConfig failed', err);
    return res.status(500).json({ message: 'Failed to update config.' });
  }
}

export async function applyAIPreset(req: AuthenticatedRequest, res: Response) {
  try {
    const mode = String(req.body?.mode || '') as MarketplaceMode;
    if (!mode) return res.status(400).json({ message: 'mode is required.' });
    const cfg = await getMarketplaceAIConfig();
    applyPreset(cfg, mode);
    await cfg.save();
    invalidateMarketplaceAIConfigCache();
    return res.json(cfg);
  } catch (err: any) {
    console.error('[marketplace-ai] preset failed', err);
    return res.status(500).json({ message: 'Failed to apply preset.' });
  }
}

export async function recomputeAI(_req: AuthenticatedRequest, res: Response) {
  try {
    const [signals, fraud] = await Promise.all([
      recomputeAllProductSignals().catch((e) => {
        console.error('[marketplace-ai] recompute signals', e);
        return 0;
      }),
      recomputeAllFraudRisks().catch((e) => {
        console.error('[marketplace-ai] recompute fraud', e);
        return 0;
      }),
    ]);
    return res.json({ updated: { signals, fraudFlagged: fraud } });
  } catch (err: any) {
    console.error('[marketplace-ai] recompute failed', err);
    return res.status(500).json({ message: 'Recompute failed.' });
  }
}

export async function refreshSellerTrustOne(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = String(req.params.sellerId || '');
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: 'invalid sellerId' });
    }
    const result = await refreshSellerTrust(sellerId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getRulesList(_req: AuthenticatedRequest, res: Response) {
  return res.json({ rules: listRules() });
}

export async function getSessionInspect(req: AuthenticatedRequest, res: Response) {
  try {
    const sessionId = String(req.params.sessionId || '');
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });
    const session = await BuyerSessionIntent.findOne({ sessionId }).lean();
    if (!session) return res.status(404).json({ message: 'session not found' });
    const plan = planHomepage({
      mode: (session as any).mode || 'discovery',
      engagementLevel: (session as any).engagementLevel,
    });
    return res.json({ session, plan });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getRelatedProducts(req: AuthenticatedRequest, res: Response) {
  try {
    const productId = String(req.params.productId || '');
    const limit = Math.min(40, Math.max(1, Number(req.query?.limit) || 12));
    const related = await getRelated(productId, { limit });
    return res.json({ productId, related });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function recomputeAdjacencyMatrix(_req: AuthenticatedRequest, res: Response) {
  try {
    const updated = await recomputeCategoryAdjacency();
    return res.json({ updated });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getAdjacency(req: AuthenticatedRequest, res: Response) {
  try {
    const category = String(req.query?.category || '').toLowerCase().trim();
    if (category) {
      const doc = await CategoryAdjacency.findOne({ category }).lean();
      return res.json(doc || { category, neighbours: [] });
    }
    const list = await CategoryAdjacency.find({}).sort({ category: 1 }).limit(200).lean();
    return res.json({ categories: list });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function putAdjacencyManual(req: AuthenticatedRequest, res: Response) {
  try {
    const category = String(req.body?.category || '').toLowerCase().trim();
    const neighbours = Array.isArray(req.body?.neighbours) ? req.body.neighbours : [];
    if (!category) return res.status(400).json({ message: 'category required' });
    await bootstrapManual(category, neighbours);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getAIDiagnostics(_req: AuthenticatedRequest, res: Response) {
  try {
    const cfg = await getMarketplaceAIConfig();
    const [
      snapshotCount,
      trustCount,
      profileCount,
      sessionCount,
      coEdgeCount,
      adjacencyCount,
      productIntelCount,
      topTrending,
      topQuality,
      modeDistribution,
    ] = await Promise.all([
      ProductSignalSnapshot.estimatedDocumentCount(),
      SellerTrustProfile.estimatedDocumentCount(),
      BuyerInsightProfile.estimatedDocumentCount(),
      BuyerSessionIntent.estimatedDocumentCount(),
      CoOccurrenceEdge.estimatedDocumentCount(),
      CategoryAdjacency.estimatedDocumentCount(),
      ProductIntelligence.estimatedDocumentCount(),
      ProductSignalSnapshot.find({})
        .sort({ trendScore: -1 })
        .limit(5)
        .select('productId trendScore qualityScore views24h purchases24h')
        .lean(),
      ProductSignalSnapshot.find({})
        .sort({ qualityScore: -1 })
        .limit(5)
        .select('productId qualityScore ctr conversion')
        .lean(),
      BuyerSessionIntent.aggregate([
        { $group: { _id: '$mode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
    ]);
    return res.json({
      mode: cfg.mode,
      enabled: cfg.enabled,
      lastRecomputeAt: cfg.lastRecomputeAt,
      totals: {
        snapshotCount,
        trustCount,
        profileCount,
        sessionCount,
        coEdgeCount,
        adjacencyCount,
        productIntelCount,
      },
      topTrending,
      topQuality,
      modeDistribution,
      sliders: cfg.sliders,
      weights: cfg.weights,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

/* ─────────────────────── ORCHESTRATOR + HEALTH ─────────────────────── */

export async function getMarketplaceDirectivePreview(req: AuthenticatedRequest, res: Response) {
  try {
    const directive = await decideMarketplaceDirective({
      userId: req.user?.id,
      sessionId: (req.query?.sessionId as string) || undefined,
    });
    return res.json(directive);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getHealthSnapshot(_req: AuthenticatedRequest, res: Response) {
  try {
    const [doc, econ, graph] = await Promise.all([
      getMarketHealth(),
      getEconomicSummary(),
      getGraphStats(),
    ]);
    return res.json({
      latest: doc.latest,
      damping: doc.damping,
      historyLast24h: doc.history.slice(-24),
      categories: (doc.categories || []).slice(0, 50),
      economy: econ,
      graph,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRunStabilityTick(_req: AuthenticatedRequest, res: Response) {
  try {
    const doc = await runStabilityTick();
    invalidateDampingCache();
    return res.json({ latest: doc.latest, damping: doc.damping });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRecomputeEconomy(_req: AuthenticatedRequest, res: Response) {
  try {
    const n = await recomputeEconomicHealth();
    return res.json({ updated: n });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

/* ─────────────────────── LIFECYCLE + BUYER TRUST ─────────────────────── */

export async function getLifecycleOverview(_req: AuthenticatedRequest, res: Response) {
  try {
    const dist = await BuyerLifecycle.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ] as any);
    const recent = await BuyerLifecycle.find({})
      .sort({ stateSetAt: -1 })
      .limit(20)
      .select('userId email state previousState stateSetAt')
      .lean();
    return res.json({ distribution: dist, recentTransitions: recent });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRefreshLifecycle(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = String(req.params.userId || '');
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const doc = await refreshLifecycle(userId);
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRefreshLifecycleBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.body?.limit) || 150));
    const n = await refreshActiveLifecycles(limit);
    return res.json({ refreshed: n });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getBuyerTrustOverview(_req: AuthenticatedRequest, res: Response) {
  try {
    const [tierAgg, lowTrust] = await Promise.all([
      BuyerTrustProfile.aggregate([
        { $group: { _id: '$tier', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ] as any),
      BuyerTrustProfile.find({})
        .sort({ trustScore: 1 })
        .limit(20)
        .select('userId trustScore tier refundRate reasons')
        .lean(),
    ]);
    return res.json({ tierDistribution: tierAgg, lowTrustBuyers: lowTrust });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRefreshBuyerTrust(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = String(req.params.userId || '');
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const doc = await refreshBuyerTrust(userId);
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRefreshBuyerTrustBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.body?.limit) || 120));
    const n = await refreshActiveBuyerTrust(limit);
    return res.json({ refreshed: n });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

/* ─────────────────────── RULE EFFECTIVENESS ─────────────────────── */

export async function getRuleEffectiveness(_req: AuthenticatedRequest, res: Response) {
  try {
    const [all, troubled] = await Promise.all([
      RuleEffectiveness.find({}).sort({ effectivenessScore: -1 }).limit(100).lean(),
      listTroubledRules(50),
    ]);
    return res.json({ rules: all, troubled });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postRecomputeRuleEffectiveness(_req: AuthenticatedRequest, res: Response) {
  try {
    const n = await recomputeRuleEffectiveness();
    return res.json({ recomputed: n });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function postResetRule(req: AuthenticatedRequest, res: Response) {
  try {
    const ruleId = String(req.params.ruleId || '');
    if (!ruleId) return res.status(400).json({ message: 'ruleId required' });
    await resetRule(ruleId);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

/* ─────────────────────── SIMULATION ─────────────────────── */

export async function postSimulate(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await runSimulation(req.body || {});
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

/* ─────────────────────── GRAPH ENDPOINTS ─────────────────────── */

export async function getProductNeighboursController(req: AuthenticatedRequest, res: Response) {
  try {
    const productId = String(req.params.productId || '');
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 12));
    const neighbours = await getProductNeighbours(productId, { limit });
    return res.json({ productId, neighbours });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getRecommendationsForUser(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = String(req.query?.userId || req.user?.id || '');
    const seedProductIds = String(req.query?.products || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const seedCategories = String(req.query?.categories || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));
    const recs = await recommendForUser({ userId: userId || undefined, seedProductIds, seedCategories, limit });
    return res.json({ recommendations: recs });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}

export async function getCollusionClustersController(_req: AuthenticatedRequest, res: Response) {
  try {
    const clusters = await findCollusionClusters({ minWeight: 4, limit: 30 });
    return res.json({ clusters });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed.' });
  }
}
