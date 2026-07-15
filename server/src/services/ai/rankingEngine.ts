/**
 * rankingEngine.ts — the autonomous marketplace brain.
 *
 * Given a list of candidate products, a buyer profile, the live session
 * intent, and the current `MarketplaceAIConfig`, produces a deterministic
 * 0..1000 score per product and returns a sorted result.
 *
 * Inputs are read locally from MongoDB; NO external paid AI APIs are used.
 * The math is pure heuristic + statistical scoring — fast, explainable,
 * and inspectable. Every signal contribution is preserved on the result so
 * the admin "AI reasoning logs" panel can show *why* something ranked.
 */

import type { IProduct } from '../../models/Product';
import type { IBuyerInsightProfile } from '../../models/BuyerInsightProfile';
import type { IBuyerSessionIntent } from '../../models/BuyerSessionIntent';
import type { IProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import type { ISellerTrustProfile } from '../../models/SellerTrustProfile';
import type { ISellerSubscription } from '../../models/SellerSubscription';
import type {
  IMarketplaceAIConfig,
  ITrustTierBoosts,
  ISubscriptionBoosts,
} from '../../models/MarketplaceAIConfig';

export interface RankingContext {
  config: IMarketplaceAIConfig;
  profile?: IBuyerInsightProfile | null;
  session?: IBuyerSessionIntent | null;
  /** Pre-fetched signals keyed by product id (string). */
  signalsByProduct?: Map<string, IProductSignalSnapshot>;
  /** Pre-fetched trust profiles keyed by seller id (string). */
  trustBySeller?: Map<string, ISellerTrustProfile>;
  /** Pre-fetched subscription docs keyed by seller id (string). */
  subscriptionBySeller?: Map<string, ISellerSubscription>;
  /** Current ISO hour (0..23) in user's local time. */
  localHour?: number;
  /** Buyer country for location relevance. */
  country?: string;
}

export interface RankingBreakdown {
  ctr: number;
  conversion: number;
  personalization: number;
  sellerTrust: number;
  subscriptionBoost: number;
  profitMargin: number;
  freshness: number;
  inventoryPressure: number;
  trend: number;
  engagement: number;
  socialProof: number;
  freeDelivery: number;
  brandAffinity: number;
  exploration: number;
  returnRiskPenalty: number;
  fraudPenalty: number;
  locationBonus: number;
  timeOfDayBonus: number;
  sessionIntentBonus: number;
}

export interface RankedProduct<T = IProduct> {
  product: T;
  score: number;
  /** Multiplicative tier × subscription boost. */
  multiplier: number;
  breakdown: RankingBreakdown;
  /** Human-readable explanation for "Why am I seeing this?". */
  reasons: string[];
  /** Strongest single reason for inline badge. */
  topReason: string;
}

const EPS = 1e-6;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function daysSince(d?: Date | string | null): number {
  if (!d) return 365;
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return 365;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

function safeNumber(n: any, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function tierBoost(boosts: ITrustTierBoosts | undefined, badge?: string): number {
  if (!boosts) return 1;
  switch (String(badge || '').toLowerCase()) {
    case 'diamond':
    case 'elite':
      return boosts.diamond ?? 1.4;
    case 'platinum':
      return boosts.platinum ?? 1.25;
    case 'gold':
    case 'trusted':
      return boosts.gold ?? 1.1;
    case 'silver':
    case 'improving':
      return boosts.silver ?? 1.0;
    case 'bronze':
    case 'new':
    default:
      return boosts.bronze ?? 0.95;
  }
}

function subscriptionBoost(boosts: ISubscriptionBoosts | undefined, tier?: string): number {
  if (!boosts) return 1;
  const t = String(tier || '').toLowerCase();
  if (t.includes('enterprise')) return boosts.enterprise ?? 1.32;
  if (t.includes('business')) return boosts.business ?? 1.18;
  if (t.includes('pro')) return boosts.pro ?? 1.08;
  return boosts.free ?? 1.0;
}

function categoryAffinity(profile: IBuyerInsightProfile | null | undefined, product: IProduct): number {
  if (!profile) return 0;
  const map = (profile.categoryAffinity || {}) as Record<string, number>;
  const tagMap = (profile.tagAffinity || {}) as Record<string, number>;
  let score = 0;
  if (product.category && map[product.category]) score += Math.min(map[product.category], 30);
  if (product.categorySlug && map[product.categorySlug]) score += Math.min(map[product.categorySlug], 30);
  const tags = Array.isArray(product.tags) ? product.tags : [];
  for (const t of tags) {
    if (tagMap[t]) score += Math.min(tagMap[t], 10);
  }
  return clamp01(score / 80);
}

function pricePreferenceMatch(profile: IBuyerInsightProfile | null | undefined, product: IProduct): number {
  if (!profile?.pricePreferenceUsd) return 0.5;
  const { min = 0, max = 999_999, median = 0 } = profile.pricePreferenceUsd;
  const p = safeNumber(product.price);
  if (p <= 0) return 0.5;
  if (p < min * 0.4 || p > max * 1.6) return 0;
  if (median <= 0) return 0.6;
  const distance = Math.abs(p - median) / Math.max(median, 1);
  return clamp01(1 - distance);
}

function sessionRelevance(session: IBuyerSessionIntent | null | undefined, product: IProduct): number {
  if (!session) return 0;
  let score = 0;
  const tags = Array.isArray(product.tags) ? product.tags : [];
  for (const cat of session.recentCategories || []) {
    if (product.category === cat || product.categorySlug === cat) score += 0.45;
  }
  for (const tg of session.recentTags || []) {
    if (tags.includes(tg)) score += 0.2;
  }
  const name = String(product.name || '').toLowerCase();
  for (const q of session.recentSearches || []) {
    const norm = String(q || '').toLowerCase().trim();
    if (norm && norm.length >= 3 && name.includes(norm)) {
      score += 0.6;
      break;
    }
  }
  // Mood modifiers
  const discountPct = product.compareAtPrice && product.compareAtPrice > 0
    ? Math.max(0, 1 - safeNumber(product.price) / safeNumber(product.compareAtPrice))
    : safeNumber((product as any).discount, 0) / 100;
  if (session.dealMood > 0.4 && discountPct >= 0.1) score += 0.2;
  if (session.premiumMood > 0.4 && safeNumber(product.price) >= 50) score += 0.15;
  return clamp01(score);
}

function inventoryPressureScore(product: IProduct, slidersHighPressure: number): number {
  const stock = safeNumber(product.stock, 0);
  // Low stock → urgency boost (helps "Only 2 left")
  if (stock > 0 && stock <= 3) return 1;
  if (stock > 0 && stock <= 8) return 0.6;
  // High stock → mild auto-promote, scaled by admin priority slider (0..1)
  if (stock >= 80) return Math.min(1, slidersHighPressure / 100) * 0.7;
  if (stock >= 30) return Math.min(1, slidersHighPressure / 100) * 0.4;
  return 0.2;
}

function freshnessScore(product: IProduct): number {
  const days = daysSince(product.createdAt);
  if (days <= 1) return 1;
  if (days <= 7) return 0.85;
  if (days <= 30) return 0.55;
  if (days <= 90) return 0.25;
  return 0.05;
}

function socialProofScore(product: IProduct): number {
  const rating = clamp(safeNumber((product as any).rating ?? (product as any).avgRating, 0), 0, 5);
  const reviews = safeNumber((product as any).reviewCount, 0);
  const wishlists = safeNumber(product.wishlistCount, 0);
  // Logarithmic — diminishing returns past 100 reviews.
  const reviewWeight = Math.log10(1 + reviews) / 3;
  const wishWeight = Math.log10(1 + wishlists) / 4;
  return clamp01((rating / 5) * 0.6 + reviewWeight + wishWeight);
}

function profitMarginScore(product: IProduct): number {
  // Heuristic proxy — wider discount = lower margin contribution to platform.
  // We invert it so full-price items get a small profit-mode boost.
  const cmp = safeNumber(product.compareAtPrice);
  const price = safeNumber(product.price);
  if (cmp <= 0 || price <= 0) return 0.5;
  const discount = clamp01(1 - price / cmp);
  return clamp01(1 - discount);
}

function freeDeliveryScore(product: IProduct): number {
  const flag =
    Boolean((product as any).freeShipping) ||
    Boolean((product as any).fastDelivery) ||
    Boolean((product as any).spacillyShipping?.enabled);
  return flag ? 1 : 0;
}

function brandAffinityScore(profile: IBuyerInsightProfile | null | undefined, product: IProduct): number {
  if (!profile) return 0;
  const brand = String((product as any).brand || '').trim().toLowerCase();
  if (!brand) return 0;
  // Reuse tagAffinity by storing brand under tag namespace `brand:<name>`.
  const v = (profile.tagAffinity || {})[`brand:${brand}`];
  return v ? clamp01(safeNumber(v) / 30) : 0;
}

function returnRiskPenalty(
  signals: IProductSignalSnapshot | undefined,
  trust: ISellerTrustProfile | undefined,
): number {
  let risk = 0;
  if (trust?.stats) {
    const orders = safeNumber(trust.stats.successfulOrders, 1) + 1;
    const returns = safeNumber(trust.stats.returnsCount);
    risk = clamp01(returns / orders);
  }
  // Slight bump if the product has historical refund signals.
  if (signals) {
    risk = Math.max(risk, clamp01(safeNumber(signals.fraudRisk) * 0.5));
  }
  return risk;
}

function fraudPenalty(
  signals: IProductSignalSnapshot | undefined,
  trust: ISellerTrustProfile | undefined,
  strictness: number,
): number {
  const sigRisk = clamp01(safeNumber(signals?.fraudRisk));
  const trustHit = trust?.stats?.confirmedFraudCases
    ? clamp01(trust.stats.confirmedFraudCases / 5)
    : 0;
  const raw = Math.max(sigRisk, trustHit);
  return raw * clamp01(strictness / 100);
}

function timeOfDayBonus(localHour: number | undefined, profile: IBuyerInsightProfile | null | undefined): number {
  if (typeof localHour !== 'number' || !profile) return 0;
  const arr = profile.activeHoursUtc || [];
  if (!arr.length) return 0;
  const total = arr.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
  const ratio = (arr[localHour] || 0) / total;
  return clamp01(ratio * 24); // ~1 when this hour dominates
}

function locationBonus(country: string | undefined, product: IProduct): number {
  if (!country) return 0;
  const ploc = String(product.location || '').toLowerCase();
  if (!ploc) return 0;
  return ploc.includes(country.toLowerCase()) ? 1 : 0;
}

/**
 * Multi-armed bandit ε-greedy: with probability `epsilon`, surface a random
 * exploration value to break personalization echo chambers. The randomness
 * is seeded by `productId + day` so the same product gets a stable bonus
 * for the day (avoids feed jitter inside a session).
 */
function explorationScore(productId: string, epsilon: number): number {
  if (epsilon <= 0) return 0;
  // Deterministic pseudo-random based on date + id (stable for a day).
  const today = new Date();
  const seed = `${productId}-${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  return r < epsilon ? r : 0;
}

function pickTopReason(b: RankingBreakdown): string {
  const entries: Array<[string, number, string]> = [
    ['personalization', b.personalization, 'Matches what you like'],
    ['sessionIntentBonus', b.sessionIntentBonus, 'Matches your recent activity'],
    ['trend', b.trend, 'Trending right now'],
    ['sellerTrust', b.sellerTrust, 'From a top-trusted seller'],
    ['socialProof', b.socialProof, 'Loved by many shoppers'],
    ['freshness', b.freshness, 'Just listed'],
    ['conversion', b.conversion, 'Sells quickly'],
    ['inventoryPressure', b.inventoryPressure, 'Selling fast'],
    ['exploration', b.exploration, 'New for you to discover'],
    ['freeDelivery', b.freeDelivery, 'Fast / free shipping'],
    ['locationBonus', b.locationBonus, 'Ships from near you'],
    ['brandAffinity', b.brandAffinity, 'From a brand you like'],
  ];
  entries.sort((a, b2) => b2[1] - a[1]);
  return entries[0]?.[2] || 'Recommended for you';
}

export interface RankProductsOptions {
  /** Mark these IDs as sponsored (will receive sponsored-aggressiveness bonus). */
  sponsoredIds?: Set<string>;
  /** Hard floor on quality (0..100) — drops below this. */
  minQualityScore?: number;
  /** Limit returned array. */
  limit?: number;
}

/**
 * Apply the full ranking formula to a candidate list and return them
 * sorted by descending score with diagnostic breakdowns attached.
 */
export function rankProducts(
  candidates: IProduct[],
  ctx: RankingContext,
  opts: RankProductsOptions = {},
): RankedProduct[] {
  const cfg = ctx.config;
  const W = cfg.weights;
  const S = cfg.sliders;
  const epsilon = clamp01(S.explorationVsExploitation / 100);
  const personalizationScale = clamp01(S.personalizationStrength / 100);
  const sponsoredScale = clamp01(S.sponsoredAggressiveness / 100);
  const trustScale = clamp01(S.sellerTrustImportance / 100);
  const trendScale = clamp01(S.trendBoostStrength / 100);
  const freshScale = clamp01(S.freshnessPriority / 100);
  const profitScale = clamp01(S.profitOptimization / 100);
  const fraudScale = clamp01(S.fraudDetectionStrictness / 100);
  const inventoryScale = clamp01(S.inventoryPressurePriority / 100);

  const results: RankedProduct[] = [];

  for (const product of candidates) {
    const pid = String((product as any)._id || (product as any).id);
    const sellerId = String(product.sellerId || '');
    const signals = ctx.signalsByProduct?.get(pid);
    const trust = ctx.trustBySeller?.get(sellerId);
    const subscription = ctx.subscriptionBySeller?.get(sellerId);

    // 1. Quality floor (skip junk)
    if (signals && opts.minQualityScore != null && signals.qualityScore < opts.minQualityScore) {
      continue;
    }

    const ctr = clamp01(safeNumber(signals?.ctr));
    const conv = clamp01(safeNumber(signals?.conversion));
    const trend = clamp01(safeNumber(signals?.trendScore) / 100);
    const engage = clamp01(safeNumber(signals?.engagementRate));
    const trustScore = clamp01(safeNumber(trust?.trustScore, 50) / 100);
    const subBoostFactor = subscriptionBoost(cfg.subscriptionBoosts, subscription?.current_plan?.tier_name);
    const tierBoostFactor = tierBoost(cfg.trustTierBoosts, trust?.badge);

    const breakdown: RankingBreakdown = {
      ctr: ctr * W.ctr,
      conversion: conv * W.conversion,
      personalization: categoryAffinity(ctx.profile, product) * personalizationScale * W.personalization,
      sellerTrust: trustScore * trustScale * W.sellerTrust,
      subscriptionBoost: (subBoostFactor - 1) * 100 * (W.subscriptionBoost / 100),
      profitMargin: profitMarginScore(product) * profitScale * W.profitMargin,
      freshness: freshnessScore(product) * freshScale * W.freshness,
      inventoryPressure: inventoryPressureScore(product, S.inventoryPressurePriority) * inventoryScale * W.inventoryPressure,
      trend: trend * trendScale * W.trend,
      engagement: engage * W.engagement,
      socialProof: socialProofScore(product) * W.socialProof,
      freeDelivery: freeDeliveryScore(product) * W.freeDelivery,
      brandAffinity: brandAffinityScore(ctx.profile, product) * personalizationScale * W.brandAffinity,
      exploration: explorationScore(pid, epsilon) * W.exploration,
      returnRiskPenalty: returnRiskPenalty(signals, trust) * W.returnRiskPenalty,
      fraudPenalty: fraudPenalty(signals, trust, S.fraudDetectionStrictness) * W.fraudPenalty,
      locationBonus: locationBonus(ctx.country, product) * 4,
      timeOfDayBonus: timeOfDayBonus(ctx.localHour, ctx.profile) * 3,
      sessionIntentBonus: sessionRelevance(ctx.session, product) * 14,
    };

    // Price match adds a tiny boost to personalization, never penalty.
    breakdown.personalization +=
      pricePreferenceMatch(ctx.profile, product) * personalizationScale * 4;

    // Sponsored CPC/CPM contribution (always gated by quality floor).
    if (opts.sponsoredIds?.has(pid)) {
      breakdown.subscriptionBoost += sponsoredScale * 8;
    }

    const positive =
      breakdown.ctr +
      breakdown.conversion +
      breakdown.personalization +
      breakdown.sellerTrust +
      Math.max(0, breakdown.subscriptionBoost) +
      breakdown.profitMargin +
      breakdown.freshness +
      breakdown.inventoryPressure +
      breakdown.trend +
      breakdown.engagement +
      breakdown.socialProof +
      breakdown.freeDelivery +
      breakdown.brandAffinity +
      breakdown.exploration +
      breakdown.locationBonus +
      breakdown.timeOfDayBonus +
      breakdown.sessionIntentBonus;

    const penalties = breakdown.returnRiskPenalty + breakdown.fraudPenalty * fraudScale;
    const raw = positive - penalties;

    const multiplier = tierBoostFactor * subBoostFactor;
    const finalScore = Math.max(0, raw * multiplier);

    const reasons: string[] = [];
    if (breakdown.personalization > 4) reasons.push('Matches what you like');
    if (breakdown.sessionIntentBonus > 2) reasons.push('Matches what you just searched');
    if (breakdown.trend > 3) reasons.push('Trending');
    if (breakdown.sellerTrust > 4) reasons.push('Top-trusted seller');
    if (breakdown.socialProof > 3) reasons.push('Loved by many');
    if (breakdown.freshness > 3) reasons.push('Just listed');
    if (breakdown.inventoryPressure > 2 && safeNumber(product.stock, 0) <= 8) reasons.push('Almost gone');
    if (breakdown.freeDelivery > 1) reasons.push('Free / fast shipping');
    if (multiplier > 1.2) reasons.push('Premium seller');

    results.push({
      product,
      score: finalScore,
      multiplier,
      breakdown,
      reasons,
      topReason: pickTopReason(breakdown),
    });
  }

  results.sort((a, b) => b.score - a.score);
  if (opts.limit && results.length > opts.limit) return results.slice(0, opts.limit);
  return results;
}

/**
 * Diversification — avoid stacking the feed with 8 items from the same
 * seller. Keeps a per-seller cap and round-robins picked sellers, so the
 * feed feels like a curated mall instead of a single-vendor catalog.
 */
export function diversifyRanked<T = IProduct>(
  ranked: RankedProduct<T>[],
  perSellerCap = 2,
): RankedProduct<T>[] {
  const seen = new Map<string, number>();
  const out: RankedProduct<T>[] = [];
  const leftovers: RankedProduct<T>[] = [];
  for (const r of ranked) {
    const sid = String((r.product as any).sellerId || 'unknown');
    const count = seen.get(sid) || 0;
    if (count < perSellerCap) {
      seen.set(sid, count + 1);
      out.push(r);
    } else {
      leftovers.push(r);
    }
  }
  return [...out, ...leftovers];
}

/**
 * Compute a per-product "psychology" badge dictionary for the UI. Pure
 * read-only — the home feed merges it into each product card. No UI change
 * is needed beyond reading the optional field if present.
 */
export interface PsychologyBadges {
  almostGone?: number;          // stock left
  sellingFast?: boolean;        // 24h purchase velocity above baseline
  viewersNow?: number;          // simulated viewers count for FOMO
  socialProof?: string;         // e.g. "324 shoppers liked this"
  dealEndsInMin?: number;       // if offerEndsAt is set
  trendingBadge?: boolean;      // trendScore > 70
  freshArrival?: boolean;       // < 3 days old
}

export function computePsychologyBadges(
  product: IProduct,
  signals?: IProductSignalSnapshot,
): PsychologyBadges {
  const badges: PsychologyBadges = {};
  const stock = safeNumber(product.stock, 0);
  if (stock > 0 && stock <= 8) badges.almostGone = stock;
  if (signals && signals.purchases24h >= 3) badges.sellingFast = true;
  // "people viewing now" — seeded by hourly bucket so it's stable for 1h.
  const wishlistCount = safeNumber(product.wishlistCount);
  if (wishlistCount > 50) badges.socialProof = `${wishlistCount} shoppers saved this`;
  if (product.offerEndsAt) {
    const remaining = (new Date(product.offerEndsAt).getTime() - Date.now()) / 60000;
    if (remaining > 0 && remaining < 24 * 60 * 7) badges.dealEndsInMin = Math.round(remaining);
  }
  if (signals && signals.trendScore >= 70) badges.trendingBadge = true;
  if (daysSince(product.createdAt) <= 3) badges.freshArrival = true;
  if (badges.sellingFast || badges.trendingBadge) {
    // Seed viewer count from product views7d so it feels alive but credible.
    const base = signals?.views24h ?? 0;
    if (base > 0) badges.viewersNow = clamp(Math.round(base / 8) + 3, 4, 120);
  }
  return badges;
}

export { EPS };
