/**
 * trendDetectionEngine.ts — live virality detection.
 *
 * Rolls up `RecommendationActivity` events into per-product 24h-vs-7d
 * velocity. A product whose 24h activity exceeds 1/3 of its 7d activity is
 * considered "trending" and earns a trend boost. The same logic powers:
 *   - Trending Products section on the home feed
 *   - "Trending" psychology badge
 *   - Trend-mode ranking boost
 *
 * Pure local computation — no external paid APIs.
 */

import mongoose from 'mongoose';
import { RecommendationActivity } from '../../models/RecommendationActivity';
import { ProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import { Product } from '../../models/Product';

const TREND_TYPES = ['product_view', 'cart_add', 'purchase', 'wishlist_add'];

interface AggregatedRow {
  _id: mongoose.Types.ObjectId;
  views24h: number;
  views7d: number;
  cart24h: number;
  cart7d: number;
  buy24h: number;
  buy7d: number;
  wish24h: number;
  wish7d: number;
  users7d: number;
}

/**
 * Pure: compute a trend score 0..100 from velocity ratios. Stable: a
 * product needs a real spike (24h ≥ 30% of 7d) to break above 60.
 */
export function computeTrendScore(input: {
  views24h: number;
  views7d: number;
  purchases24h: number;
  purchases7d: number;
  cartAdds24h: number;
  cartAdds7d: number;
}): number {
  const v = input.views24h / Math.max(1, input.views7d);
  const p = input.purchases24h / Math.max(1, input.purchases7d);
  const c = input.cartAdds24h / Math.max(1, input.cartAdds7d);
  const composite = v * 0.4 + p * 0.4 + c * 0.2;
  // Reward absolute velocity slightly so "10 of 10" beats "1 of 1".
  const absoluteBoost = Math.min(0.3, Math.log10(1 + input.views24h + input.purchases24h * 4) / 10);
  return Math.round(Math.min(1, composite + absoluteBoost) * 100);
}

/**
 * Pure: simple anomaly flag. True when the 24h slice exceeds 70% of the
 * 7d slice (signals viral spike) AND has at least 5 events.
 */
export function isViralSpike(views24h: number, views7d: number): boolean {
  if (views24h < 5) return false;
  return views24h / Math.max(1, views7d) >= 0.7;
}

/* ────────────────────────── SMOOTHING / SPIKE VALIDATION ────────────────────────── */

/**
 * Exponentially-weighted moving average smoothing.
 *
 *   ema_t = α · x_t + (1 − α) · ema_{t-1}
 *
 * Use to dampen noisy short-term trend scores. Caller supplies the
 * previous EMA from the snapshot (or the raw value if it's the first
 * sample). α = 0.4 is a sensible default for ~6-window memory.
 */
export function smoothEMA(prev: number | null | undefined, current: number, alpha = 0.4): number {
  if (prev == null || !Number.isFinite(prev)) return current;
  const a = Math.max(0.05, Math.min(0.95, alpha));
  return a * current + (1 - a) * prev;
}

/**
 * Pure: validate a "spike" is real and not fraud-induced.
 *
 *   - too few unique users → likely a bot (return false)
 *   - too few cart adds vs views → likely a bot ring (return false)
 *   - fraud risk >= 0.5 → suppress (return false)
 */
export function validateSpike(input: {
  views24h: number;
  views7d: number;
  uniqueUsers7d: number;
  cartAdds24h: number;
  fraudRisk: number;
}): boolean {
  if (!isViralSpike(input.views24h, input.views7d)) return false;
  if (input.uniqueUsers7d < 5) return false;
  // Realistic viewers add some carts. 0% cart in 50+ views is suspicious.
  if (input.views24h >= 50 && input.cartAdds24h === 0) return false;
  if (input.fraudRisk >= 0.5) return false;
  return true;
}

/**
 * Pure: post-smoothing adjustment. Caps the trend score using the global
 * `trendWeight` damping multiplier published by the stability controller.
 *
 * The stability controller can push trendWeight in (0.4..1.4), so when
 * the trend signal is suspiciously noisy across the marketplace, every
 * product's trend contribution shrinks together — preventing trend
 * inflation feedback loops.
 */
export function applyTrendDamping(score: number, trendWeight: number): number {
  if (!Number.isFinite(trendWeight)) return score;
  return Math.round(Math.max(0, Math.min(100, score * trendWeight)));
}

/**
 * Pure: composite quality score (0..100) used as the floor for ad ranking.
 * Higher CTR + conversion + low fraud risk = higher quality.
 */
export function computeQualityScore(input: {
  ctr: number;
  conversion: number;
  engagementRate: number;
  fraudRisk: number;
  reviewCount: number;
  avgRating: number;
}): number {
  const ctr = Math.min(1, input.ctr * 4); // CTR of 0.25+ ≈ excellent
  const conv = Math.min(1, input.conversion * 5);
  const eng = Math.min(1, input.engagementRate * 3);
  const rating = Math.min(1, Math.max(0, input.avgRating / 5));
  const reviewBonus = Math.min(1, Math.log10(1 + input.reviewCount) / 3);
  const positive = ctr * 22 + conv * 28 + eng * 14 + rating * 22 + reviewBonus * 14;
  const penalty = Math.min(40, input.fraudRisk * 60);
  return Math.max(0, Math.min(100, Math.round(positive - penalty)));
}

/**
 * Recompute signal snapshots for every product that had activity in the
 * past 7 days. Designed to run every ~10 minutes from the worker.
 *
 * Returns the number of snapshots updated.
 */
export async function recomputeAllProductSignals(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const oneDayAgo = new Date(Date.now() - 1 * 86_400_000);

  const rows: AggregatedRow[] = await RecommendationActivity.aggregate([
    {
      $match: {
        productId: { $exists: true, $ne: null },
        createdAt: { $gte: sevenDaysAgo },
        eventType: { $in: TREND_TYPES },
      },
    },
    {
      $group: {
        _id: '$productId',
        views24h: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$eventType', 'product_view'] }, { $gte: ['$createdAt', oneDayAgo] }] },
              1,
              0,
            ],
          },
        },
        views7d: { $sum: { $cond: [{ $eq: ['$eventType', 'product_view'] }, 1, 0] } },
        cart24h: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$eventType', 'cart_add'] }, { $gte: ['$createdAt', oneDayAgo] }] },
              1,
              0,
            ],
          },
        },
        cart7d: { $sum: { $cond: [{ $eq: ['$eventType', 'cart_add'] }, 1, 0] } },
        buy24h: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$eventType', 'purchase'] }, { $gte: ['$createdAt', oneDayAgo] }] },
              1,
              0,
            ],
          },
        },
        buy7d: { $sum: { $cond: [{ $eq: ['$eventType', 'purchase'] }, 1, 0] } },
        wish24h: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$eventType', 'wishlist_add'] }, { $gte: ['$createdAt', oneDayAgo] }] },
              1,
              0,
            ],
          },
        },
        wish7d: { $sum: { $cond: [{ $eq: ['$eventType', 'wishlist_add'] }, 1, 0] } },
        users7d: { $addToSet: '$userId' },
      },
    },
    { $project: { users7d: { $size: '$users7d' }, views24h: 1, views7d: 1, cart24h: 1, cart7d: 1, buy24h: 1, buy7d: 1, wish24h: 1, wish7d: 1 } },
  ]).allowDiskUse(true);

  if (!rows.length) return 0;

  // Pull product metadata + previous signal snapshots (for EMA smoothing).
  const ids = rows.map((r) => r._id);
  const [products, prevSignals] = await Promise.all([
    Product.find({ _id: { $in: ids } })
      .select('_id sellerId category categorySlug')
      .lean(),
    ProductSignalSnapshot.find({ productId: { $in: ids } })
      .select('productId trendScore qualityScore')
      .lean(),
  ]);
  const productById = new Map(products.map((p: any) => [String(p._id), p]));
  const prevByProduct = new Map(
    (prevSignals as any[]).map((s) => [String(s.productId), s]),
  );

  const ops: any[] = [];
  for (const row of rows) {
    const pid = String(row._id);
    const meta = productById.get(pid);

    const ctr = row.views7d > 0 ? row.cart7d / row.views7d : 0; // proxy: carts as engagement signal
    const conversion = row.cart7d > 0 ? row.buy7d / row.cart7d : 0;
    const engagementRate =
      row.views7d > 0 ? (row.cart7d + row.wish7d) / row.views7d : 0;

    const rawTrend = computeTrendScore({
      views24h: row.views24h,
      views7d: row.views7d,
      purchases24h: row.buy24h,
      purchases7d: row.buy7d,
      cartAdds24h: row.cart24h,
      cartAdds7d: row.cart7d,
    });
    // Smooth with the previous trend score so a single noisy interval
    // can't slam the score around. Then suppress unvalidated spikes.
    const prev = prevByProduct.get(pid);
    const smoothed = smoothEMA(prev?.trendScore, rawTrend, 0.4);
    const valid = validateSpike({
      views24h: row.views24h,
      views7d: row.views7d,
      uniqueUsers7d: (row as any).users7d || 0,
      cartAdds24h: row.cart24h,
      fraudRisk: 0,
    });
    const trendScore = valid ? Math.round(smoothed) : Math.round(Math.min(smoothed, 55));

    const qualityScore = computeQualityScore({
      ctr,
      conversion,
      engagementRate,
      fraudRisk: 0, // updated by fraudSignalEngine
      reviewCount: 0,
      avgRating: 0,
    });

    ops.push({
      updateOne: {
        filter: { productId: row._id },
        update: {
          $set: {
            sellerId: (meta as any)?.sellerId,
            category: (meta as any)?.category || (meta as any)?.categorySlug,
            views7d: row.views7d,
            clicks7d: row.cart7d, // best-effort: cart_add ≈ deep click
            cartAdds7d: row.cart7d,
            purchases7d: row.buy7d,
            wishlistAdds7d: row.wish7d,
            uniqueUsers7d: (row as any).users7d || 0,
            views24h: row.views24h,
            clicks24h: row.cart24h,
            cartAdds24h: row.cart24h,
            purchases24h: row.buy24h,
            ctr,
            conversion,
            engagementRate,
            trendScore,
            qualityScore,
            recomputedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) await ProductSignalSnapshot.bulkWrite(ops, { ordered: false });
  return ops.length;
}

/**
 * Returns the top trending product IDs across the marketplace, optionally
 * restricted to a category. Read path for the home feed.
 */
export async function getTrendingProductIds(opts: { limit?: number; category?: string } = {}): Promise<string[]> {
  const limit = Math.max(1, Math.min(200, opts.limit || 24));
  const query: any = { trendScore: { $gte: 40 } };
  if (opts.category) query.category = opts.category;
  const rows = await ProductSignalSnapshot.find(query)
    .sort({ trendScore: -1, recomputedAt: -1 })
    .limit(limit)
    .select('productId')
    .lean();
  return rows.map((r: any) => String(r.productId));
}
