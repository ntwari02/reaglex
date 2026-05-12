/**
 * coldStartEngine.ts — defaults for entities with no historical signals.
 *
 *   • NEW USER     → segment derived from country + device + hour
 *   • NEW PRODUCT  → inherits category median for trend/quality/conversion
 *   • NEW SELLER   → trust score bootstrapped from verification + category
 *
 * Every output is deterministic and inspectable. No ML — only rules.
 */

import mongoose from 'mongoose';
import type {
  BuyerIntentMode,
  EngagementLevel,
  IBuyerSessionIntent,
  PriceBucket,
} from '../../models/BuyerSessionIntent';
import { Product } from '../../models/Product';
import { ProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import { SellerTrustProfile } from '../../models/SellerTrustProfile';
import { BuyerSessionIntent } from '../../models/BuyerSessionIntent';
import { computeTrustScore } from './sellerTrustEngine';

export interface ColdStartUserDefaults {
  mode: BuyerIntentMode;
  engagementLevel: EngagementLevel;
  priceBucket: PriceBucket;
  recommendedCategories: string[];
  reasons: string[];
}

const HOUR_BUCKETS: Record<string, BuyerIntentMode> = {
  morning_commute: 'discovery', // 6-9
  workday_lunch:   'discovery', // 11-14
  evening_browse:  'research',  // 18-22
  late_night:      'impulse',   // 22-3
  early_morning:   'discovery',
};

function hourBucket(hour: number): keyof typeof HOUR_BUCKETS {
  if (hour >= 6 && hour < 10) return 'morning_commute';
  if (hour >= 11 && hour < 14) return 'workday_lunch';
  if (hour >= 18 && hour < 22) return 'evening_browse';
  if (hour >= 22 || hour < 3) return 'late_night';
  return 'early_morning';
}

const DEVICE_TO_BUCKET: Record<string, PriceBucket> = {
  mobile: 'value',
  tablet: 'mid',
  desktop: 'mid',
  unknown: 'unknown',
};

/**
 * Compute a default segment + suggested starter categories for an
 * anonymous (or freshly-created) buyer based on lightweight context.
 */
export function defaultsForNewUser(input: {
  country?: string;
  device?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  localHour?: number;
  /** Optional: globally trending categories the orchestrator wants to recommend. */
  globalTopCategories?: string[];
}): ColdStartUserDefaults {
  const reasons: string[] = [];
  const hour = typeof input.localHour === 'number' ? input.localHour : new Date().getUTCHours();
  const bucket = hourBucket(hour);
  let mode: BuyerIntentMode = HOUR_BUCKETS[bucket];
  reasons.push(`hourBucket=${bucket}→${mode}`);

  // Late-night mobile = impulse mode (TikTok-shop pattern).
  if (input.device === 'mobile' && (hour >= 22 || hour < 3)) {
    mode = 'impulse';
    reasons.push('mobile+late-night→impulse');
  }

  const priceBucket: PriceBucket = DEVICE_TO_BUCKET[input.device || 'unknown'];
  reasons.push(`device=${input.device || 'unknown'}→priceBucket=${priceBucket}`);

  // Engagement: brand-new user starts cold.
  const engagementLevel: EngagementLevel = 'cold';

  // Starter categories: trending categories + any region-specific defaults.
  const recommendedCategories = Array.from(
    new Set((input.globalTopCategories || []).slice(0, 6)),
  );

  if (input.country) reasons.push(`country=${input.country}`);

  return { mode, engagementLevel, priceBucket, recommendedCategories, reasons };
}

/**
 * For a brand-new product (no signals yet), seed its snapshot with the
 * category median so the ranking engine doesn't drop it to zero on day 1.
 */
export async function bootstrapNewProductSignals(productId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(productId)) return false;
  const existing = await ProductSignalSnapshot.findOne({ productId });
  if (existing) return false;

  const product: any = await Product.findById(productId)
    .select('_id sellerId category categorySlug createdAt')
    .lean();
  if (!product) return false;

  const cat = product.category || product.categorySlug;
  let median = {
    qualityScore: 55,
    trendScore: 30,
    ctr: 0.05,
    conversion: 0.02,
    engagementRate: 0.08,
  };
  if (cat) {
    const rows = await ProductSignalSnapshot.aggregate([
      { $match: { category: cat } },
      {
        $group: {
          _id: null,
          quality: { $avg: '$qualityScore' },
          trend: { $avg: '$trendScore' },
          ctr: { $avg: '$ctr' },
          conv: { $avg: '$conversion' },
          eng: { $avg: '$engagementRate' },
        },
      },
    ]).catch(() => []);
    if ((rows as any[])[0]) {
      const r = (rows as any[])[0];
      median = {
        qualityScore: Number(r.quality) || median.qualityScore,
        trendScore: Number(r.trend) || median.trendScore,
        ctr: Number(r.ctr) || median.ctr,
        conversion: Number(r.conv) || median.conversion,
        engagementRate: Number(r.eng) || median.engagementRate,
      };
    }
  }

  await ProductSignalSnapshot.create({
    productId: new mongoose.Types.ObjectId(productId),
    sellerId: product.sellerId,
    category: cat,
    views7d: 0,
    clicks7d: 0,
    cartAdds7d: 0,
    purchases7d: 0,
    wishlistAdds7d: 0,
    uniqueUsers7d: 0,
    views24h: 0,
    clicks24h: 0,
    cartAdds24h: 0,
    purchases24h: 0,
    ctr: median.ctr,
    conversion: median.conversion,
    engagementRate: median.engagementRate,
    trendScore: Math.round(median.trendScore * 0.6), // discount: it's brand new
    qualityScore: Math.round(median.qualityScore * 0.9),
    fraudRisk: 0,
    recomputedAt: new Date(),
  });
  return true;
}

/**
 * Bootstrap a new seller's trust profile. Without any orders we cannot
 * compute deliveryRate; we set a baseline 50 score and boost slightly if
 * the seller has any kind of KYC verification done.
 */
export async function bootstrapNewSellerTrust(
  sellerId: string,
  ctx: { verificationLevel?: number; subscriptionTier?: string; categoryAvg?: number } = {},
): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(sellerId)) return 0;
  const existing = await SellerTrustProfile.findOne({ sellerId });
  if (existing) return existing.trustScore;

  const tierBoost = ((): number => {
    const t = String(ctx.subscriptionTier || '').toLowerCase();
    if (t.includes('enterprise')) return 12;
    if (t.includes('business')) return 8;
    if (t.includes('pro')) return 4;
    return 0;
  })();

  const score = computeTrustScore({
    deliveryRate: 0.5,
    refundRate: 0,
    disputeRate: 0,
    avgRating: ctx.categoryAvg ?? 4.4,
    fraudCount: 0,
    accountAgeDays: 1,
    salesConsistency: 0.4,
    suspiciousReviewCount: 0,
    verificationLevel: ctx.verificationLevel ?? 1,
    subscriptionBoost: tierBoost,
  });

  await SellerTrustProfile.create({
    sellerId: new mongoose.Types.ObjectId(sellerId),
    trustScore: score,
    badge: score >= 60 ? 'trusted' : 'new',
    stats: {
      verifiedListings: 0,
      suspiciousListings: 0,
      successfulOrders: 0,
      disputesOpened: 0,
      confirmedFraudCases: 0,
      returnsCount: 0,
      avgImageVideoConfidence: 0,
    },
  });
  return score;
}

/**
 * Mark a session as bootstrapped — used during the first request to set
 * a sensible default state so the orchestrator has something to work with.
 */
export async function bootstrapSessionIfNew(
  sessionId: string,
  ctx: {
    userId?: string;
    country?: string;
    device?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    localHour?: number;
  },
): Promise<{ created: boolean; defaults?: ColdStartUserDefaults }> {
  const existing = await BuyerSessionIntent.findOne({ sessionId });
  if (existing) return { created: false };

  const defaults = defaultsForNewUser({
    country: ctx.country,
    device: ctx.device,
    localHour: ctx.localHour,
  });

  await BuyerSessionIntent.create({
    sessionId,
    userId: ctx.userId && mongoose.Types.ObjectId.isValid(ctx.userId)
      ? new mongoose.Types.ObjectId(ctx.userId)
      : undefined,
    device: ctx.device || 'unknown',
    country: ctx.country,
    localHour: ctx.localHour,
    mode: defaults.mode,
    engagementLevel: defaults.engagementLevel,
    priceBucket: defaults.priceBucket,
    engagementScore: 0,
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
  });

  return { created: true, defaults };
}
