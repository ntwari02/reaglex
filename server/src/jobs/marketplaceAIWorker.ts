/**
 * marketplaceAIWorker.ts — heartbeat of the autonomous marketplace.
 *
 *  • Recomputes product signal snapshots from RecommendationActivity
 *  • Refreshes fraud risk for snapshots showing review anomalies
 *  • Refreshes top sellers' trust profiles
 *  • Updates `lastRecomputeAt` on the config doc so the admin dashboard
 *    can show "Last AI tick: 4 minutes ago"
 *
 * Designed to run in-process via `setInterval`. Multiple replicas will all
 * try to run but every write is idempotent (upsert) so duplicate work
 * only wastes CPU — never corrupts data. For production add a lightweight
 * distributed lock (`active-recompute-lock` document) if you scale beyond
 * 2 replicas.
 */

import {
  getMarketplaceAIConfig,
  MarketplaceAIConfig,
} from '../models/MarketplaceAIConfig';
import { recomputeAllProductSignals } from '../services/ai/trendDetectionEngine';
import { recomputeAllFraudRisks } from '../services/ai/fraudSignalEngine';
import { refreshSellerTrust } from '../services/ai/sellerTrustEngine';
import { recomputeCategoryAdjacency } from '../services/ai/coOccurrenceEngine';
import { invalidateAdjacencyCache } from '../services/ai/categoryAdjacencyEngine';
import { runStabilityTick, invalidateDampingCache } from '../services/ai/stabilityController';
import { recomputeEconomicHealth } from '../services/ai/economicEngine';
import { refreshActiveLifecycles } from '../services/ai/lifecycleEngine';
import { refreshActiveBuyerTrust } from '../services/ai/buyerTrustEngine';
import { recomputeRuleEffectiveness } from '../services/ai/ruleEffectivenessTracker';
import { SellerTrustProfile } from '../models/SellerTrustProfile';

const TICK_MS = Math.max(60_000, Number(process.env.MARKETPLACE_AI_TICK_MS) || 10 * 60_000);
const TRUST_TICK_MS = Math.max(5 * 60_000, Number(process.env.MARKETPLACE_AI_TRUST_TICK_MS) || 30 * 60_000);
const ADJACENCY_TICK_MS = Math.max(15 * 60_000, Number(process.env.MARKETPLACE_AI_ADJACENCY_TICK_MS) || 60 * 60_000);
const STABILITY_TICK_MS = Math.max(2 * 60_000, Number(process.env.MARKETPLACE_AI_STABILITY_TICK_MS) || 15 * 60_000);
const ECONOMY_TICK_MS = Math.max(5 * 60_000, Number(process.env.MARKETPLACE_AI_ECONOMY_TICK_MS) || 30 * 60_000);
const LIFECYCLE_TICK_MS = Math.max(5 * 60_000, Number(process.env.MARKETPLACE_AI_LIFECYCLE_TICK_MS) || 20 * 60_000);
const RULE_EFFECTIVENESS_TICK_MS = Math.max(5 * 60_000, Number(process.env.MARKETPLACE_AI_RULES_TICK_MS) || 30 * 60_000);

let started = false;
let runningTick = false;

async function tickSignals(): Promise<void> {
  if (runningTick) return;
  runningTick = true;
  try {
    const cfg = await getMarketplaceAIConfig();
    if (!cfg.enabled) return;

    const signals = await recomputeAllProductSignals();
    const fraud = await recomputeAllFraudRisks();
    await MarketplaceAIConfig.updateOne(
      { _id: cfg._id },
      { $set: { lastRecomputeAt: new Date() } },
    );
    if (process.env.LOG_MARKETPLACE_AI === '1') {
      console.log(`[marketplace-ai] recomputed signals=${signals} fraud=${fraud}`);
    }
  } catch (e) {
    console.error('[marketplace-ai] signals tick failed', e);
  } finally {
    runningTick = false;
  }
}

async function tickCategoryAdjacency(): Promise<void> {
  try {
    const updated = await recomputeCategoryAdjacency();
    if (updated > 0) invalidateAdjacencyCache();
    if (process.env.LOG_MARKETPLACE_AI === '1') {
      console.log(`[marketplace-ai] adjacency rebuilt for ${updated} categories`);
    }
  } catch (e) {
    console.error('[marketplace-ai] adjacency tick failed', e);
  }
}

async function tickSellerTrust(): Promise<void> {
  try {
    // Pick the 20 lowest-updated trust profiles + any seller whose stats
    // look stale (lastUpdated > 7d). We refresh in a small batch so the
    // worker never causes load spikes.
    const stale = await SellerTrustProfile.find({})
      .sort({ updatedAt: 1 })
      .limit(20)
      .select('sellerId')
      .lean();
    for (const s of stale as any[]) {
      await refreshSellerTrust(String(s.sellerId)).catch(() => undefined);
    }
  } catch (e) {
    console.error('[marketplace-ai] trust tick failed', e);
  }
}

async function tickStability(): Promise<void> {
  try {
    const doc = await runStabilityTick();
    invalidateDampingCache();
    if (process.env.LOG_MARKETPLACE_AI === '1') {
      console.log(
        `[marketplace-ai] stability ctr=${doc.latest.ctr} conv=${doc.latest.conversionRate} damping=${JSON.stringify(doc.damping.reasons)}`,
      );
    }
  } catch (e) {
    console.error('[marketplace-ai] stability tick failed', e);
  }
}

async function tickEconomy(): Promise<void> {
  try {
    const n = await recomputeEconomicHealth();
    if (process.env.LOG_MARKETPLACE_AI === '1') {
      console.log(`[marketplace-ai] economy recomputed for ${n} categories`);
    }
  } catch (e) {
    console.error('[marketplace-ai] economy tick failed', e);
  }
}

async function tickLifecycles(): Promise<void> {
  try {
    const lifecycleCount = await refreshActiveLifecycles(150);
    const trustCount = await refreshActiveBuyerTrust(120);
    if (process.env.LOG_MARKETPLACE_AI === '1') {
      console.log(`[marketplace-ai] lifecycle=${lifecycleCount} buyer-trust=${trustCount}`);
    }
  } catch (e) {
    console.error('[marketplace-ai] lifecycle tick failed', e);
  }
}

async function tickRuleEffectiveness(): Promise<void> {
  try {
    const n = await recomputeRuleEffectiveness();
    if (process.env.LOG_MARKETPLACE_AI === '1') {
      console.log(`[marketplace-ai] rule-effectiveness recomputed for ${n} rules`);
    }
  } catch (e) {
    console.error('[marketplace-ai] rule-effectiveness tick failed', e);
  }
}

export function startMarketplaceAIWorker(): void {
  if (started) return;
  started = true;
  console.log(
    `[marketplace-ai] worker started (tick=${TICK_MS}ms, trust=${TRUST_TICK_MS}ms, stability=${STABILITY_TICK_MS}ms, economy=${ECONOMY_TICK_MS}ms, lifecycle=${LIFECYCLE_TICK_MS}ms, rules=${RULE_EFFECTIVENESS_TICK_MS}ms)`,
  );

  // Stagger initial run so it doesn't block boot.
  setTimeout(() => void tickSignals(), 15_000);
  setTimeout(() => void tickSellerTrust(), 45_000);
  setTimeout(() => void tickCategoryAdjacency(), 90_000);
  setTimeout(() => void tickStability(), 60_000);
  setTimeout(() => void tickEconomy(), 120_000);
  setTimeout(() => void tickLifecycles(), 150_000);
  setTimeout(() => void tickRuleEffectiveness(), 180_000);

  setInterval(() => void tickSignals(), TICK_MS);
  setInterval(() => void tickSellerTrust(), TRUST_TICK_MS);
  setInterval(() => void tickCategoryAdjacency(), ADJACENCY_TICK_MS);
  setInterval(() => void tickStability(), STABILITY_TICK_MS);
  setInterval(() => void tickEconomy(), ECONOMY_TICK_MS);
  setInterval(() => void tickLifecycles(), LIFECYCLE_TICK_MS);
  setInterval(() => void tickRuleEffectiveness(), RULE_EFFECTIVENESS_TICK_MS);
}
