/**
 * homeFeedService.ts — composes the per-buyer personalized home feed.
 *
 * Output shape is intentionally close to what the existing home page
 * components already consume (an array of `products`), so the UI does not
 * need to change. The single new field is an optional `aiMeta` block on
 * each product carrying the ranking reasons + psychology badges; the UI
 * can ignore it and still render correctly.
 *
 * Sections:
 *   - hero        : top 3-6 high-confidence picks (or "Welcome back" curation)
 *   - trending    : trend-detected viral list
 *   - foryou      : personalised recommendations
 *   - deals       : discount-heavy items biased to dealMood / lower price
 *   - fresh       : brand-new arrivals
 *   - bestsellers : conversion + soldCount champions
 *   - near_you    : products matching buyer country (when known)
 *   - inspired    : exploration list (avoid echo chamber)
 */

import mongoose from 'mongoose';
import { Product, type IProduct } from '../../models/Product';
import { buyerUpcomingProductFilter } from '../../utils/publicProductQuery';
import { BuyerInsightProfile } from '../../models/BuyerInsightProfile';
import { BuyerSessionIntent } from '../../models/BuyerSessionIntent';
import { ProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import { SellerTrustProfile } from '../../models/SellerTrustProfile';
import { SellerSubscription } from '../../models/SellerSubscription';
import {
  getMarketplaceAIConfig,
  type IMarketplaceAIConfig,
} from '../../models/MarketplaceAIConfig';
import {
  rankProducts,
  diversifyRanked,
  computePsychologyBadges,
  type RankingContext,
  type RankedProduct,
} from './rankingEngine';
import { getTrendingProductIds } from './trendDetectionEngine';
import { getSponsoredCandidates, planSponsoredSlots } from './sponsoredAdEngine';
import { applyFairness, commitImpressionCounters } from './fairnessEngine';
import { expandCategories } from './categoryAdjacencyEngine';
import { bootstrapSessionIfNew } from './coldStartEngine';
import { resolveCanonicalProductPriceUsd } from '../../utils/productPricing';
import { decideMarketplaceDirective, type MarketplaceDirective } from './marketplaceOrchestrator';

export type FeedSectionId =
  | 'hero'
  | 'trending'
  | 'foryou'
  | 'deals'
  | 'fresh'
  | 'bestsellers'
  | 'near_you'
  | 'inspired'
  | 'upcoming';

export interface FeedProductCard {
  _id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  discount?: number;
  thumbnail?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  category?: string;
  sellerId?: string;
  stock?: number;
  listingMode?: string;
  launchAt?: string;
  /** All marketplace-AI metadata. UI can ignore safely. */
  aiMeta?: {
    score: number;
    reasons: string[];
    topReason: string;
    sponsored?: boolean;
    badges?: ReturnType<typeof computePsychologyBadges>;
    trustTier?: string;
    launchAt?: string;
  };
}

export interface FeedSection {
  id: FeedSectionId;
  title: string;
  subtitle?: string;
  layout: 'grid' | 'carousel' | 'hero';
  products: FeedProductCard[];
}

export interface HomeFeedInput {
  userId?: string;
  sessionId?: string;
  country?: string;
  city?: string;
  device?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  /** Override section limit (defaults vary per section). */
  limitPerSection?: number;
}

export interface HomeFeedResult {
  config: {
    mode: IMarketplaceAIConfig['mode'];
    confidence: number;
  };
  sections: FeedSection[];
  generatedAt: string;
}

const DEFAULT_LIMITS: Record<FeedSectionId, number> = {
  hero: 6,
  trending: 12,
  foryou: 12,
  deals: 12,
  fresh: 12,
  bestsellers: 12,
  near_you: 10,
  inspired: 10,
  upcoming: 8,
};

/**
 * Apply marketplace fairness rules (per-seller cap, category rotation,
 * exposure debt) to a ranked list, honouring the live directive from the
 * marketplace orchestrator (more diversity when the stability controller
 * detects ranking collapse). Pure function — call once per section.
 */
function applyFairnessForSection(
  ranked: RankedProduct[],
  ctx: RankingContext,
  limit: number,
  directive?: MarketplaceDirective,
): RankedProduct[] {
  const fair = applyFairness(ranked as any, ctx.session as any, {
    perSellerCap: directive?.fairness.perSellerCap ?? 2,
    categoryRatioCap: directive?.fairness.categoryRatioCap ?? 0.45,
    exposureDebtStrength: directive?.fairness.diversityInjection ?? 0.3,
  });
  return fair.slice(0, limit) as any;
}

function toCard(rp: RankedProduct, extra?: Partial<FeedProductCard['aiMeta']>): FeedProductCard {
  const p = rp.product as any;
  const card: FeedProductCard = {
    _id: String(p._id),
    name: String(p.name || 'Product'),
    price: resolveCanonicalProductPriceUsd(p),
    compareAtPrice: p.compareAtPrice,
    discount: p.discount,
    thumbnail: p.thumbnail || p.images?.[0] || p.image,
    images: Array.isArray(p.images) ? p.images.slice(0, 4) : undefined,
    rating: p.rating ?? p.avgRating,
    reviewCount: p.reviewCount,
    category: p.category || p.categorySlug,
    sellerId: p.sellerId ? String(p.sellerId) : undefined,
    stock: p.stock,
    listingMode: p.listingMode,
    launchAt: p.launchAt ? new Date(p.launchAt).toISOString() : undefined,
    aiMeta: {
      score: Math.round(rp.score),
      reasons: rp.reasons,
      topReason: rp.topReason,
      badges: computePsychologyBadges(p),
      ...(extra || {}),
    },
  };
  return card;
}

/**
 * Single optimised query batch: fetch every per-seller / per-product side
 * doc the ranking engine needs in O(1) DB round-trips instead of N+1.
 *
 * When a `directive` is supplied the orchestrator's resolved
 * `rankingWeights` shadow the raw config weights — this is how
 * trust/fraud/lifecycle decisions reach the ranker.
 */
async function buildContext(
  candidates: IProduct[],
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  directive?: MarketplaceDirective,
): Promise<RankingContext> {
  const productIds = candidates.map((p: any) => p._id);
  const sellerIds = Array.from(
    new Set(candidates.map((p: any) => String(p.sellerId)).filter(Boolean)),
  );

  const [signals, trusts, subs, profile, session] = await Promise.all([
    productIds.length
      ? ProductSignalSnapshot.find({ productId: { $in: productIds } }).lean()
      : Promise.resolve([]),
    sellerIds.length
      ? SellerTrustProfile.find({ sellerId: { $in: sellerIds } }).lean()
      : Promise.resolve([]),
    sellerIds.length
      ? SellerSubscription.find({ seller_id: { $in: sellerIds } }).lean()
      : Promise.resolve([]),
    input.userId && mongoose.Types.ObjectId.isValid(input.userId)
      ? BuyerInsightProfile.findOne({ userId: input.userId }).lean()
      : Promise.resolve(null),
    input.sessionId
      ? BuyerSessionIntent.findOne({ sessionId: input.sessionId }).lean()
      : Promise.resolve(null),
  ]);

  const signalsByProduct = new Map<string, any>(
    (signals as any[]).map((s) => [String(s.productId), s]),
  );
  const trustBySeller = new Map<string, any>(
    (trusts as any[]).map((t) => [String(t.sellerId), t]),
  );
  const subscriptionBySeller = new Map<string, any>(
    (subs as any[]).map((s) => [String(s.seller_id), s]),
  );

  // Effective config = base cfg with orchestrator-resolved weights when
  // a directive is supplied. We shallow-clone so we never mutate the
  // cached singleton.
  const effectiveCfg: IMarketplaceAIConfig = directive
    ? ({ ...cfg.toObject?.() ?? cfg, weights: directive.rankingWeights } as any)
    : cfg;

  return {
    config: effectiveCfg,
    profile: profile as any,
    session: session as any,
    signalsByProduct,
    trustBySeller,
    subscriptionBySeller,
    country: input.country,
    localHour: typeof (session as any)?.localHour === 'number' ? (session as any).localHour : new Date().getUTCHours(),
  };
}

/* ────────────────────────── SECTION BUILDERS ────────────────────────── */

async function loadCandidatePool(filter: any, sort: any, limit: number): Promise<IProduct[]> {
  // Only "published / in stock" products are candidates. We over-fetch by 3x
  // so the diversifier has room to reshuffle without running out of items.
  const docs = await Product.find({
    ...filter,
    status: { $ne: 'out_of_stock' },
    stock: { $gt: 0 },
  } as any)
    .sort(sort)
    .limit(Math.max(limit * 3, 30))
    .lean();
  return docs as any;
}

async function buildForYouSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  const profile = input.userId && mongoose.Types.ObjectId.isValid(input.userId)
    ? await BuyerInsightProfile.findOne({ userId: input.userId }).lean()
    : null;
  const session = input.sessionId
    ? await BuyerSessionIntent.findOne({ sessionId: input.sessionId }).lean()
    : null;

  // Build a search pool around the user's strongest categories + tags.
  const cats = Object.entries((profile as any)?.categoryAffinity || {})
    .sort(([, a]: any, [, b]: any) => Number(b) - Number(a))
    .slice(0, 6)
    .map(([k]) => k);
  const sessionCats = ((session as any)?.recentCategories || []).slice(0, 4);
  const sessionTags = ((session as any)?.recentTags || []).slice(0, 6);

  // Rule-based: expand into adjacent categories so we don't trap the buyer
  // in an echo chamber of the exact categories they've already clicked.
  let adjacentCats: string[] = [];
  try {
    const seed = Array.from(new Set([...cats, ...sessionCats].filter(Boolean)));
    if (seed.length) {
      const expanded = await expandCategories(seed.slice(0, 6), 1);
      adjacentCats = expanded.filter((e) => e.depth === 1).map((e) => e.category);
    }
  } catch {
    /* ignore adjacency failures */
  }

  const filter: any = { status: { $ne: 'out_of_stock' } };
  const or: any[] = [];
  if (cats.length) or.push({ category: { $in: cats } }, { categorySlug: { $in: cats } });
  if (sessionCats.length) or.push({ category: { $in: sessionCats } });
  if (sessionTags.length) or.push({ tags: { $in: sessionTags } });
  if (adjacentCats.length) or.push({ category: { $in: adjacentCats } });
  if (or.length) filter.$or = or;

  const pool = await loadCandidatePool(filter, { soldCount: -1, createdAt: -1 }, limit);

  // Fallback: if signed-out / no signals → seed with marketplace bestsellers.
  if (!pool.length) {
    const fallback = await loadCandidatePool({}, { soldCount: -1, wishlistCount: -1 }, limit);
    pool.push(...fallback);
  }

  const ctx = await buildContext(pool, cfg, input, directive);
  const ranked = rankProducts(pool, ctx, { limit: limit * 2 });
  const diversified = diversifyRanked(ranked).slice(0, limit * 2);
  const fair = applyFairnessForSection(diversified as any, ctx, limit, directive);
  return {
    id: 'foryou',
    title: profile ? 'Picked for you' : 'Popular right now',
    subtitle: profile
      ? 'Based on what you’ve looked at, saved, and bought'
      : 'A curated mix updated every few minutes',
    layout: 'grid',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildTrendingSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  const trendingIds = await getTrendingProductIds({ limit: limit * 2 });
  let pool: IProduct[] = [];
  if (trendingIds.length) {
    pool = (await Product.find({ _id: { $in: trendingIds }, stock: { $gt: 0 } } as any).lean()) as any;
  }
  if (!pool.length) {
    pool = await loadCandidatePool({}, { views: -1, createdAt: -1 }, limit);
  }
  const ctx = await buildContext(pool, cfg, input, directive);
  const ranked = rankProducts(pool, ctx, { limit: limit * 2 });
  const fair = applyFairnessForSection(ranked, ctx, limit, directive);
  return {
    id: 'trending',
    title: 'Trending now',
    subtitle: 'Selling fast across the marketplace',
    layout: 'carousel',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildDealsSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  const pool = await loadCandidatePool(
    {
      $or: [
        { discount: { $gte: 10 } },
        { $expr: { $and: [{ $gt: ['$compareAtPrice', 0] }, { $lt: ['$price', '$compareAtPrice'] }] } },
      ],
    },
    { discount: -1, createdAt: -1 },
    limit,
  );
  const ctx = await buildContext(pool, cfg, input, directive);
  const ranked = rankProducts(pool, ctx, { limit: limit * 2 });
  const fair = applyFairnessForSection(ranked, ctx, limit, directive);
  return {
    id: 'deals',
    title: 'Best deals',
    subtitle: 'Curated discounts that match your taste',
    layout: 'grid',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildUpcomingSection(
  _cfg: IMarketplaceAIConfig,
  _input: HomeFeedInput,
  limit: number,
): Promise<FeedSection | null> {
  const docs = await Product.find(buyerUpcomingProductFilter())
    .sort({ launchAt: 1 })
    .limit(limit)
    .lean();
  if (!docs.length) return null;
  const products: FeedProductCard[] = (docs as IProduct[]).map((p) => ({
    _id: String((p as any)._id),
    name: String(p.name || 'Upcoming drop'),
    price: resolveCanonicalProductPriceUsd(p as any),
    compareAtPrice: (p as any).compareAtPrice,
    discount: (p as any).discount,
    thumbnail: (p as any).images?.[0] || (p as any).image,
    images: Array.isArray((p as any).images) ? (p as any).images.slice(0, 4) : undefined,
    category: (p as any).category,
    sellerId: (p as any).sellerId ? String((p as any).sellerId) : undefined,
    stock: (p as any).stock,
    listingMode: 'upcoming',
    launchAt: (p as any).launchAt ? new Date((p as any).launchAt).toISOString() : undefined,
    aiMeta: {
      score: 80,
      reasons: ['Scheduled drop'],
      topReason: 'Launching soon',
      badges: computePsychologyBadges(p as any),
      launchAt: (p as any).launchAt ? new Date((p as any).launchAt).toISOString() : undefined,
    },
  }));
  return {
    id: 'upcoming',
    title: 'Upcoming drops',
    subtitle: 'Seller-scheduled launches — notify before they go live',
    layout: 'carousel',
    products,
  };
}

async function buildFreshSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const pool = await loadCandidatePool(
    { createdAt: { $gte: sevenDaysAgo } },
    { createdAt: -1 },
    limit,
  );
  const ctx = await buildContext(pool, cfg, input, directive);
  const ranked = rankProducts(pool, ctx, { limit: limit * 2 });
  const fair = applyFairnessForSection(ranked, ctx, limit, directive);
  return {
    id: 'fresh',
    title: 'Just landed',
    subtitle: 'Fresh arrivals from verified sellers',
    layout: 'carousel',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildBestsellersSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  const pool = await loadCandidatePool(
    {},
    { soldCount: -1, wishlistCount: -1 },
    limit,
  );
  const ctx = await buildContext(pool, cfg, input, directive);
  const ranked = rankProducts(pool, ctx, { limit: limit * 2 });
  const fair = applyFairnessForSection(ranked, ctx, limit, directive);
  return {
    id: 'bestsellers',
    title: 'Bestsellers',
    subtitle: 'Loved by thousands of shoppers',
    layout: 'grid',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildNearYouSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection | null> {
  if (!input.country) return null;
  const pool = await loadCandidatePool(
    { location: { $regex: input.country, $options: 'i' } },
    { soldCount: -1 },
    limit,
  );
  if (!pool.length) return null;
  const ctx = await buildContext(pool, cfg, input, directive);
  const ranked = rankProducts(pool, ctx, { limit: limit * 2 });
  const fair = applyFairnessForSection(ranked, ctx, limit, directive);
  return {
    id: 'near_you',
    title: `Near you · ${input.country}`,
    subtitle: 'Ships faster from sellers in your region',
    layout: 'carousel',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildInspiredSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  // Exploration: pick products with low view counts but high quality scores.
  const explorationPool: any[] = await ProductSignalSnapshot.find({
    qualityScore: { $gte: 60 },
    views7d: { $lt: 100 },
  })
    .sort({ qualityScore: -1, recomputedAt: -1 })
    .limit(limit * 3)
    .lean();

  let products: IProduct[] = [];
  if (explorationPool.length) {
    const ids = explorationPool.map((s) => s.productId);
    products = (await Product.find({ _id: { $in: ids }, stock: { $gt: 0 } } as any).lean()) as any;
  }
  if (!products.length) {
    products = await loadCandidatePool({}, { createdAt: -1 }, limit);
  }
  const ctx = await buildContext(products, cfg, input, directive);
  const ranked = rankProducts(products, ctx, { limit: limit * 2 });
  const fair = applyFairnessForSection(ranked, ctx, limit, directive);
  return {
    id: 'inspired',
    title: 'Worth a look',
    subtitle: 'Hidden gems we think you’ll like',
    layout: 'carousel',
    products: fair.map((r) => toCard(r)),
  };
}

async function buildHeroSection(
  cfg: IMarketplaceAIConfig,
  input: HomeFeedInput,
  limit: number,
  directive?: MarketplaceDirective,
): Promise<FeedSection> {
  // The hero section blends sponsored × top "for you" picks. Sponsored
  // slots can only appear if they pass the global quality floor.
  const profile = input.userId && mongoose.Types.ObjectId.isValid(input.userId)
    ? await BuyerInsightProfile.findOne({ userId: input.userId }).lean()
    : null;

  const cats = Object.entries((profile as any)?.categoryAffinity || {})
    .sort(([, a]: any, [, b]: any) => Number(b) - Number(a))
    .slice(0, 4)
    .map(([k]) => k);
  const filter: any = {};
  if (cats.length) filter.category = { $in: cats };

  const pool = await loadCandidatePool(filter, { soldCount: -1 }, limit * 2);
  const ctx = await buildContext(pool, cfg, input, directive);
  const organic = rankProducts(pool, ctx, { limit: limit * 2, minQualityScore: 30 });

  // Sponsored injection — gated by the directive's sponsored cap.
  const sponsoredIds = new Set<string>();
  const sponsoredCards: RankedProduct[] = [];
  const { isSystemFeatureEnabled } = await import('../systemFeatureSettings.service');
  const sponsoredFeatureOn = await isSystemFeatureEnabled('marketplace_ai_sponsored');
  const sponsoredEnabled =
    sponsoredFeatureOn && (directive ? directive.sponsored.enabled : cfg.sponsored?.enabled !== false);
  if (sponsoredEnabled) {
    try {
      const candidates = await getSponsoredCandidates(cfg, { surface: 'homepage', limit: 4 });
      if (candidates.length) {
        const ids = candidates.map((c) => c.productId);
        const sponsoredProducts = (await Product.find({
          _id: { $in: ids },
          stock: { $gt: 0 },
        } as any).lean()) as any;
        const sctx = await buildContext(sponsoredProducts, cfg, input, directive);
        const sranked = rankProducts(sponsoredProducts, sctx, {
          sponsoredIds: new Set(ids),
        });
        for (const r of sranked) {
          sponsoredIds.add(String((r.product as any)._id));
          sponsoredCards.push(r);
        }
      }
    } catch {
      /* sponsored failure must never break the home feed */
    }
  }

  const effectiveSponsoredCfg = directive
    ? ({ ...cfg.toObject?.() ?? cfg, sponsored: { ...cfg.sponsored, maxRatio: directive.sponsored.maxRatio } } as any)
    : cfg;
  const sponsoredSlots = planSponsoredSlots(limit, effectiveSponsoredCfg);
  const cards: FeedProductCard[] = [];
  let oi = 0;
  let si = 0;
  for (let i = 0; i < limit; i++) {
    if (sponsoredSlots.includes(i) && sponsoredCards[si]) {
      cards.push(toCard(sponsoredCards[si++], { sponsored: true }));
    } else if (organic[oi]) {
      cards.push(toCard(organic[oi++]));
    }
  }

  return {
    id: 'hero',
    title: profile ? 'Your daily picks' : 'Welcome to Spacilly',
    subtitle: 'Refreshes throughout the day as your taste evolves',
    layout: 'hero',
    products: cards,
  };
}

/* ────────────────────────── PUBLIC API ────────────────────────── */

/**
 * Build the full personalised homepage. The order of sections is decided
 * by the deterministic Homepage Orchestrator using the buyer's current
 * intent mode + engagement level + segment. Every section is then
 * post-processed by the Fairness Engine.
 */
export async function buildHomeFeed(input: HomeFeedInput): Promise<HomeFeedResult> {
  const { isSystemFeatureEnabled } = await import('../systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('marketplace_ai_recommendations'))) {
    return {
      config: { mode: 'balanced', confidence: 0 },
      sections: [],
      generatedAt: new Date().toISOString(),
    };
  }
  const cfg = await getMarketplaceAIConfig();
  if (!cfg.enabled) {
    return {
      config: { mode: cfg.mode, confidence: 0 },
      sections: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const limit = Math.max(6, Math.min(40, input.limitPerSection || 12));

  // Cold-start bootstrap so the orchestrator always has something to work with.
  if (input.sessionId) {
    try {
      await bootstrapSessionIfNew(input.sessionId, {
        userId: input.userId,
        country: input.country,
        device: input.device,
        localHour: new Date().getUTCHours(),
      });
    } catch {
      /* never block the feed on bootstrap failure */
    }
  }

  // Load the session + profile once for orchestration decisions.
  const [session, profile] = await Promise.all([
    input.sessionId
      ? BuyerSessionIntent.findOne({ sessionId: input.sessionId }).lean()
      : Promise.resolve(null),
    input.userId && mongoose.Types.ObjectId.isValid(input.userId)
      ? BuyerInsightProfile.findOne({ userId: input.userId }).lean()
      : Promise.resolve(null),
  ]);

  const localHour = new Date().getUTCHours();
  // Master orchestrator decides every cross-subsystem directive in one
  // call. The homepage plan (section order + emphasis) is part of it.
  const directive = await decideMarketplaceDirective({
    userId: input.userId,
    sessionId: input.sessionId,
    session: {
      mode: (session as any)?.mode,
      engagementLevel: (session as any)?.engagementLevel,
    },
    segment: (profile as any)?.segment,
    isReturningVisitor: Boolean((profile as any)?.orderCount),
    isLateNight: localHour >= 22 || localHour < 4,
  });
  const plan = directive.plan;

  const builders: Record<FeedSectionId, () => Promise<FeedSection | null>> = {
    hero: () => buildHeroSection(cfg, input, Math.min(DEFAULT_LIMITS.hero, limit), directive),
    foryou: () => buildForYouSection(cfg, input, limit, directive),
    trending: () => buildTrendingSection(cfg, input, limit, directive),
    deals: () => buildDealsSection(cfg, input, limit, directive),
    fresh: () => buildFreshSection(cfg, input, limit, directive),
    bestsellers: () => buildBestsellersSection(cfg, input, limit, directive),
    near_you: () => buildNearYouSection(cfg, input, limit, directive),
    inspired: () => buildInspiredSection(cfg, input, limit, directive),
    upcoming: () => buildUpcomingSection(cfg, input, limit),
  };

  // Build sections in the orchestrator's order, in parallel.
  const results = await Promise.all(plan.sections.map((id) => builders[id]().catch(() => null)));
  const sections = results.filter(Boolean) as FeedSection[];

  // Commit impressions back to the session so the fairness engine knows
  // who got airtime today. Fire-and-forget — never block the response.
  if (input.sessionId && session) {
    try {
      const liveSession = await BuyerSessionIntent.findOne({ sessionId: input.sessionId });
      if (liveSession) {
        const shown = sections.flatMap((s) => s.products.map((p) => ({ sellerId: p.sellerId }))) as any[];
        commitImpressionCounters(liveSession as any, shown as any);
        await liveSession.save();
      }
    } catch {
      /* ignore */
    }
  }

  let confidence = 0;
  if (input.userId && mongoose.Types.ObjectId.isValid(input.userId)) {
    confidence = Number((profile as any)?.confidenceScore) || 0;
  }

  return {
    config: { mode: cfg.mode, confidence },
    sections,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Lightweight endpoint helper — returns a single section by id. Used by
 * the existing home components that want to keep their independent
 * progressive loading.
 */
export async function buildHomeSection(
  sectionId: FeedSectionId,
  input: HomeFeedInput,
): Promise<FeedSection | null> {
  const cfg = await getMarketplaceAIConfig();
  const limit = input.limitPerSection || DEFAULT_LIMITS[sectionId] || 12;
  // Always pull a fresh directive so single-section endpoints still
  // respect trust/fraud/lifecycle/economic rules. This is cheap.
  const directive = await decideMarketplaceDirective({
    userId: input.userId,
    sessionId: input.sessionId,
  }).catch(() => undefined);
  switch (sectionId) {
    case 'hero':
      return buildHeroSection(cfg, input, limit, directive);
    case 'foryou':
      return buildForYouSection(cfg, input, limit, directive);
    case 'trending':
      return buildTrendingSection(cfg, input, limit, directive);
    case 'deals':
      return buildDealsSection(cfg, input, limit, directive);
    case 'fresh':
      return buildFreshSection(cfg, input, limit, directive);
    case 'bestsellers':
      return buildBestsellersSection(cfg, input, limit, directive);
    case 'near_you':
      return buildNearYouSection(cfg, input, limit, directive);
    case 'inspired':
      return buildInspiredSection(cfg, input, limit, directive);
    case 'upcoming':
      return buildUpcomingSection(cfg, input, limit);
    default:
      return null;
  }
}
