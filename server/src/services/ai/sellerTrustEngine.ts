/**
 * sellerTrustEngine.ts — autonomous seller reputation system.
 *
 * Aggregates dispute history, return rate, response time, fraud cases,
 * verification level and product authenticity flags into a single 0..100
 * trust score and assigns a Bronze → Diamond badge tier.
 *
 * Existing `SellerTrustProfile` doc is reused; we only extend the badge
 * vocabulary by mapping its 4-step enum onto the 5-tier UX (Bronze /
 * Silver / Gold / Platinum / Diamond) returned to callers.
 *
 * Runs as a batch job (see `marketplaceAIWorker`) every N minutes.
 */

import mongoose from 'mongoose';
import { SellerTrustProfile } from '../../models/SellerTrustProfile';
import { Order } from '../../models/Order';
import { ProductReview } from '../../models/ProductReview';
import { FraudAlert } from '../../models/FraudAlert';
import { SuspiciousReview } from '../../models/SuspiciousReview';
import { RefundRequest } from '../../models/RefundRequest';
import { Dispute } from '../../models/Dispute';

export type TrustTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface SellerTrustEvaluation {
  sellerId: string;
  trustScore: number;
  tier: TrustTier;
  badge: 'new' | 'improving' | 'trusted' | 'elite';
  factors: {
    deliveryRate: number;
    returnRate: number;
    avgRating: number;
    fraudCases: number;
    disputeRate: number;
    refundFrequency: number;
    accountAgeDays: number;
    salesConsistency: number;
    suspiciousReviews: number;
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function tierForScore(score: number): TrustTier {
  if (score >= 90) return 'diamond';
  if (score >= 78) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  return 'bronze';
}

function badgeForTier(tier: TrustTier): 'new' | 'improving' | 'trusted' | 'elite' {
  if (tier === 'diamond' || tier === 'platinum') return 'elite';
  if (tier === 'gold') return 'trusted';
  if (tier === 'silver') return 'improving';
  return 'new';
}

async function fetchSellerSignals(sellerId: mongoose.Types.ObjectId) {
  const sid = sellerId;
  const since = new Date(Date.now() - 90 * 86_400_000);
  const [
    totalOrders,
    deliveredOrders,
    refundCount,
    disputeCount,
    avgRatingAgg,
    fraudCount,
    suspiciousReviewCount,
  ] = await Promise.all([
    Order.countDocuments({ sellerId: sid } as any).catch(() => 0),
    Order.countDocuments({ sellerId: sid, status: { $in: ['delivered', 'completed'] } } as any).catch(() => 0),
    RefundRequest.countDocuments({ sellerId: sid, createdAt: { $gte: since } } as any).catch(() => 0),
    Dispute.countDocuments({ sellerId: sid, createdAt: { $gte: since } } as any).catch(() => 0),
    ProductReview.aggregate([
      { $match: { sellerId: sid } },
      { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
    ]).catch(() => []),
    FraudAlert.countDocuments({ sellerId: sid, status: 'confirmed' } as any).catch(() => 0),
    SuspiciousReview.countDocuments({ sellerId: sid } as any).catch(() => 0),
  ]);

  const avgRating = (avgRatingAgg as any[])[0]?.avg ?? 4.4;
  return {
    totalOrders: Number(totalOrders) || 0,
    deliveredOrders: Number(deliveredOrders) || 0,
    refundCount: Number(refundCount) || 0,
    disputeCount: Number(disputeCount) || 0,
    avgRating: Number(avgRating) || 4.4,
    fraudCount: Number(fraudCount) || 0,
    suspiciousReviewCount: Number(suspiciousReviewCount) || 0,
  };
}

/**
 * Compute the seller trust score from raw signals. Pure function so it's
 * easy to test/inspect and can be re-run by the admin panel on demand.
 */
export function computeTrustScore(input: {
  deliveryRate: number;
  refundRate: number;
  disputeRate: number;
  avgRating: number;
  fraudCount: number;
  accountAgeDays: number;
  salesConsistency: number;
  suspiciousReviewCount: number;
  verificationLevel: number; // 0..3
  subscriptionBoost: number; // 0..15
}): number {
  // Each contributor is 0..1; we then weight.
  const delivery = clamp(input.deliveryRate, 0, 1);
  const refundsBad = clamp(input.refundRate, 0, 1);
  const disputeBad = clamp(input.disputeRate, 0, 1);
  const rating = clamp(input.avgRating / 5, 0, 1);
  const fraud = clamp(input.fraudCount / 5, 0, 1);
  const age = clamp(input.accountAgeDays / 365, 0, 1);
  const consistency = clamp(input.salesConsistency, 0, 1);
  const suspicious = clamp(input.suspiciousReviewCount / 20, 0, 1);
  const verification = clamp(input.verificationLevel / 3, 0, 1);

  const positive =
    delivery * 25 +
    rating * 22 +
    consistency * 8 +
    age * 6 +
    verification * 9 +
    Math.min(input.subscriptionBoost, 15);
  const negative = refundsBad * 14 + disputeBad * 14 + fraud * 30 + suspicious * 10;

  // Map to 0..100 around a 50 baseline.
  const score = 50 + positive - negative;
  return clamp(Math.round(score), 0, 100);
}

export async function evaluateSeller(
  sellerObjectId: mongoose.Types.ObjectId,
): Promise<SellerTrustEvaluation> {
  const sig = await fetchSellerSignals(sellerObjectId);

  const deliveryRate = sig.totalOrders > 0 ? sig.deliveredOrders / sig.totalOrders : 0.6;
  const refundRate = sig.totalOrders > 0 ? sig.refundCount / sig.totalOrders : 0;
  const disputeRate = sig.totalOrders > 0 ? sig.disputeCount / sig.totalOrders : 0;

  // Sales consistency = 1 - normalised stddev over 4 quarters. Approximate
  // using count distribution by month.
  let salesConsistency = 0.6;
  try {
    const recent = await Order.aggregate([
      { $match: { sellerId: sellerObjectId } as any },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          n: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': -1, '_id.m': -1 } },
      { $limit: 6 },
    ]);
    const counts = recent.map((r: any) => Number(r.n) || 0);
    if (counts.length >= 2) {
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance =
        counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
      const std = Math.sqrt(variance);
      salesConsistency = mean > 0 ? 1 - clamp(std / mean, 0, 1) : 0.4;
    }
  } catch {
    /* keep default */
  }

  // Account age — try `User.createdAt`; default to 90 days when missing.
  let accountAgeDays = 90;
  try {
    const User = (await import('../../models/User')).User;
    const u = await User.findById(sellerObjectId).select('createdAt').lean();
    if ((u as any)?.createdAt) {
      accountAgeDays = (Date.now() - new Date((u as any).createdAt).getTime()) / 86_400_000;
    }
  } catch {
    /* ignore */
  }

  const trustScore = computeTrustScore({
    deliveryRate,
    refundRate,
    disputeRate,
    avgRating: sig.avgRating,
    fraudCount: sig.fraudCount,
    accountAgeDays,
    salesConsistency,
    suspiciousReviewCount: sig.suspiciousReviewCount,
    verificationLevel: 1, // TODO: pull from KYC if exposed
    subscriptionBoost: 0,
  });
  const tier = tierForScore(trustScore);
  const badge = badgeForTier(tier);

  return {
    sellerId: String(sellerObjectId),
    trustScore,
    tier,
    badge,
    factors: {
      deliveryRate,
      returnRate: refundRate,
      avgRating: sig.avgRating,
      fraudCases: sig.fraudCount,
      disputeRate,
      refundFrequency: refundRate,
      accountAgeDays,
      salesConsistency,
      suspiciousReviews: sig.suspiciousReviewCount,
    },
  };
}

export async function refreshSellerTrust(sellerId: string | mongoose.Types.ObjectId): Promise<SellerTrustEvaluation | null> {
  const sid = typeof sellerId === 'string' ? new mongoose.Types.ObjectId(sellerId) : sellerId;
  if (!mongoose.Types.ObjectId.isValid(sid)) return null;
  const evaluation = await evaluateSeller(sid);

  await SellerTrustProfile.findOneAndUpdate(
    { sellerId: sid },
    {
      $set: {
        trustScore: evaluation.trustScore,
        badge: evaluation.badge,
        'stats.successfulOrders': Math.round(evaluation.factors.deliveryRate * 100),
        'stats.returnsCount': Math.round(evaluation.factors.returnRate * 100),
        'stats.disputesOpened': Math.round(evaluation.factors.disputeRate * 100),
        'stats.confirmedFraudCases': evaluation.factors.fraudCases,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return evaluation;
}

/**
 * Map an existing-stored `badge` (4-step) to the 5-tier UX label.
 */
export function badgeToTier(badge?: string): TrustTier {
  switch (String(badge || '').toLowerCase()) {
    case 'elite':
      return 'diamond';
    case 'trusted':
      return 'gold';
    case 'improving':
      return 'silver';
    case 'new':
    default:
      return 'bronze';
  }
}
