/**
 * marketplaceOrchestrator.ts — THE MOE (Marketplace Orchestration Engine).
 *
 * This is the meta-controller that sits above every other engine. On
 * every home feed / personalised request it:
 *
 *   1) Reads the current `MarketplaceAIConfig` (admin sliders)
 *   2) Reads live `MarketHealth.damping` (stability controller decisions)
 *   3) Reads lifecycle + buyer trust + intent for the requesting user
 *   4) Reads category-level economic health (supply/demand)
 *   5) Resolves cross-subsystem conflicts using a strict priority ladder:
 *
 *        ① Trust & safety
 *        ② Fraud prevention
 *        ③ User satisfaction
 *        ④ Inventory balancing
 *        ⑤ Monetisation rules
 *        ⑥ Sponsored content
 *
 *   6) Emits a `MarketplaceDirective` that downstream engines consume
 *      (ranking weight overrides, section plan, fairness caps,
 *      sponsored cap, diversity injection ratio, urgency flags).
 *
 * The directive is *fully deterministic* and inspectable — every decision
 * carries a string `reason` so the admin "AI reasoning logs" panel can
 * explain why a feed looks the way it does.
 */

import {
  getMarketplaceAIConfig,
  type IMarketplaceAIConfig,
  type IRankingWeights,
} from '../../models/MarketplaceAIConfig';
import { type IBuyerLifecycle, type LifecycleState } from '../../models/BuyerLifecycle';
import { type IBuyerTrustProfile } from '../../models/BuyerTrustProfile';
import { type BuyerIntentMode, type EngagementLevel } from '../../models/BuyerSessionIntent';
import { planHomepage, type OrchestrationPlan } from './homepageOrchestrator';
import { getDamping } from './stabilityController';
import { getLifecycle, lifecycleEmphasis } from './lifecycleEngine';
import { getBuyerTrust } from './buyerTrustEngine';
import { getEconomicSummary } from './economicEngine';
import type { FeedSectionId } from './homeFeedService';

export interface MarketplaceDirective {
  config: IMarketplaceAIConfig;
  /** Effective per-weight overrides combining sliders + damping + economic state. */
  rankingWeights: IRankingWeights;
  /** Section plan + emphasis multipliers (merge of intent + lifecycle). */
  plan: OrchestrationPlan;
  /** Fairness caps for this request. */
  fairness: {
    perSellerCap: number;
    categoryRatioCap: number;
    diversityInjection: number;
  };
  /** Sponsored caps — can be 0 if stability controller silenced ads. */
  sponsored: {
    enabled: boolean;
    maxRatio: number;
    minQualityScore: number;
  };
  /** Urgency / scarcity flags applied at render time. */
  urgency: {
    showLowStockBadges: boolean;
    showHighDemandBadges: boolean;
  };
  /** Lifecycle + buyer context. */
  context: {
    lifecycle?: LifecycleState;
    buyerTrustTier?: string;
    intentMode?: BuyerIntentMode;
    engagementLevel?: EngagementLevel;
    isHighRiskBuyer: boolean;
    isVip: boolean;
  };
  /** Trace of every rule that fired, for the admin reasoning panel. */
  reasons: string[];
}

export interface DecideInput {
  userId?: string;
  sessionId?: string;
  /** Pre-fetched session for performance. */
  session?: {
    mode?: BuyerIntentMode;
    engagementLevel?: EngagementLevel;
  } | null;
  /** Pre-fetched insight profile segment for performance. */
  segment?: 'new' | 'active' | 'at_risk' | 'dormant' | 'vip';
  isReturningVisitor?: boolean;
  isLateNight?: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/* ────────────────────────── PRIORITY-LADDER RESOLVERS ────────────────────────── */

function applyTrustAndSafetyRules(
  weights: IRankingWeights,
  buyerTrust: IBuyerTrustProfile | null,
  reasons: string[],
): IRankingWeights {
  if (!buyerTrust) return weights;
  // Flagged buyers: shrink personalisation, push trust higher, never
  // boost return-risk items for them.
  if (buyerTrust.tier === 'flagged') {
    weights.personalization = Math.max(0, weights.personalization * 0.4);
    weights.sellerTrust = weights.sellerTrust * 1.4;
    weights.returnRiskPenalty = weights.returnRiskPenalty * 1.5;
    weights.fraudPenalty = weights.fraudPenalty * 1.3;
    reasons.push('safety:flagged-buyer-tightened');
  } else if (buyerTrust.refundRate > 0.25) {
    weights.returnRiskPenalty = weights.returnRiskPenalty * 1.3;
    reasons.push(`safety:high-refund-buyer(${buyerTrust.refundRate.toFixed(2)})`);
  }
  return weights;
}

function applyFraudRules(
  weights: IRankingWeights,
  damping: { trendWeight: number; sponsoredWeight: number; reasons: string[] },
  reasons: string[],
): IRankingWeights {
  if (damping.trendWeight < 1) {
    weights.trend = weights.trend * damping.trendWeight;
    reasons.push(`fraud:trend-damped*${damping.trendWeight.toFixed(2)}`);
  }
  if (damping.sponsoredWeight < 1) {
    // Sponsored weight is enforced separately (in sponsored.maxRatio), but
    // we also nudge subscriptionBoost down so paid sellers can't out-rank
    // organic during a fraud period.
    weights.subscriptionBoost = weights.subscriptionBoost * Math.max(0.6, damping.sponsoredWeight);
    reasons.push('fraud:subscription-boost-throttled');
  }
  return weights;
}

function applyUserSatisfactionRules(
  weights: IRankingWeights,
  lifecycle: IBuyerLifecycle | null,
  reasons: string[],
): IRankingWeights {
  if (!lifecycle) return weights;
  switch (lifecycle.state) {
    case 'new':
      // Show the best of the marketplace, not narrow personalisation.
      weights.personalization = weights.personalization * 0.6;
      weights.socialProof = weights.socialProof * 1.3;
      weights.trend = weights.trend * 1.15;
      reasons.push('user-sat:new-buyer-broaden');
      break;
    case 'explorer':
      weights.exploration = weights.exploration * 1.4;
      weights.personalization = weights.personalization * 0.85;
      reasons.push('user-sat:explorer-exploration-tilt');
      break;
    case 'vip':
    case 'loyal':
      weights.personalization = weights.personalization * 1.2;
      weights.freshness = weights.freshness * 1.1;
      reasons.push(`user-sat:${lifecycle.state}-personalised`);
      break;
    case 'dormant':
      weights.trend = weights.trend * 1.2;
      weights.profitMargin = weights.profitMargin * 0.85; // de-prioritise margin for win-back
      reasons.push('user-sat:dormant-winback-mode');
      break;
    case 'returning':
      weights.freshness = weights.freshness * 1.25;
      weights.personalization = weights.personalization * 1.1;
      reasons.push('user-sat:returning-buyer-fresh-boost');
      break;
    case 'buyer':
    default:
      break;
  }
  return weights;
}

function applyInventoryRules(
  weights: IRankingWeights,
  econ: { highDemandCategories: number; saturatedCategories: number; oversupplyCategories: number },
  reasons: string[],
): IRankingWeights {
  if (econ.oversupplyCategories > econ.highDemandCategories + 5) {
    // Globally oversupplied → push inventoryPressure harder to clear stock.
    weights.inventoryPressure = weights.inventoryPressure * 1.3;
    reasons.push('inv:oversupply-globally:boost-stock-clearance');
  }
  if (econ.highDemandCategories > 5) {
    // Demand-heavy market → freshness wins; scarcity drives urgency.
    weights.freshness = weights.freshness * 1.15;
    reasons.push('inv:high-demand-categories:freshness-boost');
  }
  return weights;
}

function applyMonetizationRules(
  weights: IRankingWeights,
  cfg: IMarketplaceAIConfig,
  damping: { sponsoredWeight: number },
  reasons: string[],
): { weights: IRankingWeights; sponsoredEnabled: boolean; sponsoredCap: number } {
  let sponsoredCap = cfg.sponsored?.maxRatio ?? 20;
  let sponsoredEnabled = !!cfg.sponsored?.enabled;

  // Apply damping to sponsored cap.
  if (damping.sponsoredWeight < 1) {
    sponsoredCap = Math.round(sponsoredCap * damping.sponsoredWeight);
    reasons.push(`mon:sponsored-cap*${damping.sponsoredWeight.toFixed(2)}=${sponsoredCap}%`);
  }
  if (sponsoredCap <= 0) {
    sponsoredEnabled = false;
    reasons.push('mon:sponsored-disabled-by-damping');
  }

  // Profit-max mode: nudge profitMargin a bit higher only if user satisfaction rules
  // didn't already over-tighten.
  if (cfg.mode === 'profit_max') {
    weights.profitMargin = weights.profitMargin * 1.1;
    reasons.push('mon:profit-max-mode');
  }
  return { weights, sponsoredEnabled, sponsoredCap };
}

/* ────────────────────────── PUBLIC API ────────────────────────── */

/**
 * Compute the directive for the current request. Heavy reads (lifecycle,
 * trust, economic summary, damping) are all cached so this should add
 * <50ms latency in steady state.
 */
export async function decideMarketplaceDirective(input: DecideInput = {}): Promise<MarketplaceDirective> {
  const reasons: string[] = [];

  const [cfg, damping, econSummary, lifecycle, buyerTrust] = await Promise.all([
    getMarketplaceAIConfig(),
    getDamping().catch(() => ({
      trendWeight: 1,
      sponsoredWeight: 1,
      rankingDiversity: 0.2,
      appliedAt: new Date(),
      reasons: [] as string[],
    })),
    getEconomicSummary().catch(() => ({
      totalCategories: 0,
      highDemandCategories: 0,
      saturatedCategories: 0,
      oversupplyCategories: 0,
    })),
    getLifecycle(input.userId),
    getBuyerTrust(input.userId),
  ]);

  // Clone weights so we never mutate the cached config doc.
  let weights: IRankingWeights = { ...cfg.weights } as IRankingWeights;

  // PRIORITY LADDER — order matters.
  weights = applyTrustAndSafetyRules(weights, buyerTrust, reasons);
  weights = applyFraudRules(weights, damping, reasons);
  weights = applyUserSatisfactionRules(weights, lifecycle, reasons);
  weights = applyInventoryRules(weights, econSummary, reasons);
  const monetisation = applyMonetizationRules(weights, cfg, damping, reasons);
  weights = monetisation.weights;

  // Decide the homepage section plan (intent-driven, then merged with lifecycle hints).
  const plan = planHomepage({
    mode: (input.session?.mode || 'discovery') as BuyerIntentMode,
    engagementLevel: input.session?.engagementLevel,
    segment: input.segment,
    isReturningVisitor: input.isReturningVisitor,
    isLateNight: input.isLateNight,
    cfg,
  });

  // Layer in lifecycle emphasis on top.
  if (lifecycle) {
    const emph = lifecycleEmphasis(lifecycle.state);
    for (const [section, mult] of Object.entries(emph.sectionBoost)) {
      const existing = plan.sectionWeights[section as FeedSectionId] || 1;
      plan.sectionWeights[section as FeedSectionId] = existing * mult;
    }
    plan.reasons.push(...emph.reasons);
  }

  // Per-request fairness caps.
  const diversityInjection = clamp(damping.rankingDiversity, 0.1, 0.7);
  const perSellerCap = damping.rankingDiversity > 0.4 ? 1 : 2;
  const categoryRatioCap = damping.rankingDiversity > 0.4 ? 0.35 : 0.45;
  reasons.push(`fairness:perSeller=${perSellerCap},diversity=${diversityInjection.toFixed(2)}`);

  const directive: MarketplaceDirective = {
    config: cfg,
    rankingWeights: weights,
    plan,
    fairness: {
      perSellerCap,
      categoryRatioCap,
      diversityInjection,
    },
    sponsored: {
      enabled: monetisation.sponsoredEnabled,
      maxRatio: monetisation.sponsoredCap,
      minQualityScore: cfg.sponsored?.minQualityScore ?? 55,
    },
    urgency: {
      showLowStockBadges: true,
      showHighDemandBadges: econSummary.highDemandCategories > 0,
    },
    context: {
      lifecycle: lifecycle?.state,
      buyerTrustTier: buyerTrust?.tier,
      intentMode: input.session?.mode,
      engagementLevel: input.session?.engagementLevel,
      isHighRiskBuyer: buyerTrust?.tier === 'flagged',
      isVip: lifecycle?.state === 'vip' || buyerTrust?.tier === 'platinum',
    },
    reasons: [...damping.reasons, ...reasons],
  };
  return directive;
}
