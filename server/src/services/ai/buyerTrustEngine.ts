/**
 * buyerTrustEngine.ts — symmetric to the seller trust engine but for
 * buyers. Pure deterministic scoring used by:
 *
 *  - the orchestrator (gate "free returns" badges for chronic returners,
 *    reward consistent shoppers with VIP perks)
 *  - the fraud graph engine (flag low-trust accounts in tight IP clusters)
 *  - the marketing automation system (skip aggressive promos for users
 *    with high refund rates — they will likely just return again)
 *
 * Scoring formula (max 100):
 *
 *   + paid order volume   ............... up to +30
 *   + account age / consistency .......... up to +20
 *   + review quality ..................... up to +10
 *   + loyalty (same-seller repeats) ...... up to +10
 *   − refund rate ........................ up to −30
 *   − dispute / chargeback rate .......... up to −20
 *   − abuse flags ........................ up to −20
 *   − fraud reports ...................... up to −15
 *
 * The score is clamped to 0..100 and then mapped to a tier.
 */

import mongoose from 'mongoose';
import { BuyerTrustProfile, type BuyerTrustTier, type IBuyerTrustProfile } from '../../models/BuyerTrustProfile';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { RefundRequest } from '../../models/RefundRequest';

const DAYS = 86_400_000;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface TrustEvaluation {
  trustScore: number;
  tier: BuyerTrustTier;
  reasons: string[];
}

/** Pure: compute a trust score from raw signals. */
export function scoreBuyerTrust(input: {
  totalOrders: number;
  paidOrders: number;
  refundRate: number;
  disputeRate: number;
  abuseFlags: number;
  chargebackCount: number;
  fraudReports: number;
  accountAgeDays: number;
  loyaltyScore: number;
  reviewQualityScore: number;
  consistencyScore: number;
  suspiciousActivityScore: number;
}): TrustEvaluation {
  let score = 50; // start in the middle
  const reasons: string[] = [];

  // Positive contributions
  const volumeBoost = Math.min(30, Math.log10(1 + input.paidOrders) * 18);
  score += volumeBoost;
  if (volumeBoost > 5) reasons.push(`+${volumeBoost.toFixed(0)} from purchase volume`);

  const ageBoost = clamp(input.accountAgeDays / 365, 0, 1) * 12;
  score += ageBoost;
  if (ageBoost > 4) reasons.push(`+${ageBoost.toFixed(0)} account age`);

  const consistency = clamp01(input.consistencyScore) * 8;
  score += consistency;
  const loyalty = clamp01(input.loyaltyScore) * 10;
  score += loyalty;
  const reviewBoost = clamp01(input.reviewQualityScore) * 10;
  score += reviewBoost;
  if (loyalty > 2) reasons.push(`+${loyalty.toFixed(0)} loyalty`);
  if (reviewBoost > 2) reasons.push(`+${reviewBoost.toFixed(0)} review quality`);

  // Negative contributions
  const refundPenalty = clamp01(input.refundRate) * 30;
  score -= refundPenalty;
  if (refundPenalty > 5) reasons.push(`-${refundPenalty.toFixed(0)} refund rate`);

  const disputePenalty = clamp01(input.disputeRate) * 12 + input.chargebackCount * 5;
  score -= Math.min(20, disputePenalty);
  if (disputePenalty > 4) reasons.push(`-${Math.min(20, disputePenalty).toFixed(0)} disputes/chargebacks`);

  const abusePenalty = Math.min(20, input.abuseFlags * 4);
  score -= abusePenalty;
  if (abusePenalty) reasons.push(`-${abusePenalty.toFixed(0)} abuse flags`);

  const fraudPenalty = Math.min(15, input.fraudReports * 5);
  score -= fraudPenalty;
  if (fraudPenalty) reasons.push(`-${fraudPenalty.toFixed(0)} fraud reports`);

  const suspicious = clamp01(input.suspiciousActivityScore) * 10;
  score -= suspicious;
  if (suspicious > 3) reasons.push(`-${suspicious.toFixed(0)} suspicious activity`);

  score = Math.round(clamp(score, 0, 100));

  let tier: BuyerTrustTier;
  if (fraudPenalty >= 10 || abusePenalty >= 12) tier = 'flagged';
  else if (score >= 90) tier = 'platinum';
  else if (score >= 75) tier = 'gold';
  else if (score >= 60) tier = 'verified';
  else if (score >= 40) tier = 'trusted';
  else tier = input.paidOrders === 0 ? 'new' : 'flagged';

  return { trustScore: score, tier, reasons };
}

/** Refresh the trust profile for one buyer. */
export async function refreshBuyerTrust(
  userId: string | mongoose.Types.ObjectId,
): Promise<IBuyerTrustProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(userId as any)) return null;
  const uid = new mongoose.Types.ObjectId(userId as any);

  const [user, paidAgg, refundsAgg, totalOrders] = await Promise.all([
    User.findById(uid).select('createdAt').lean(),
    Order.aggregate([
      {
        $match: {
          buyerId: uid,
          status: { $nin: ['pending', 'cancelled'] },
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
    ] as any),
    RefundRequest.aggregate([
      { $match: { buyerId: uid } },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        },
      },
    ] as any),
    Order.countDocuments({ buyerId: uid } as any),
  ]);

  const paidOrders = (paidAgg[0]?.count as number) || 0;
  const refundsCompleted = (refundsAgg[0]?.completed as number) || 0;
  const refundRate = paidOrders > 0 ? Math.min(1, refundsCompleted / paidOrders) : 0;
  const accountAgeDays = user ? Math.max(0, (Date.now() - new Date((user as any).createdAt).getTime()) / DAYS) : 0;

  // Loyalty proxy: number of distinct sellers / total orders. Higher
  // share of repeat sellers ⇒ higher loyalty.
  const distinctSellerAgg = await Order.aggregate([
    { $match: { buyerId: uid, sellerId: { $exists: true, $ne: null } } },
    { $group: { _id: '$sellerId' } },
  ] as any);
  const distinctSellerCount = distinctSellerAgg.filter((r) => r?._id != null).length;
  const loyaltyScore = paidOrders > 0
    ? clamp01(1 - distinctSellerCount / Math.max(paidOrders, 1))
    : 0;

  // Consistency: did the user purchase across multiple months?
  const months = await Order.aggregate([
    { $match: { buyerId: uid, status: { $nin: ['pending', 'cancelled'] } } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
      },
    },
  ] as any);
  const consistencyScore = clamp01(months.length / 12);

  const existing = await BuyerTrustProfile.findOne({ userId: uid });
  const baseline = existing || ({} as Partial<IBuyerTrustProfile>);

  const evaluation = scoreBuyerTrust({
    totalOrders,
    paidOrders,
    refundRate,
    disputeRate: Number(baseline.disputeRate || 0),
    abuseFlags: Number(baseline.abuseFlags || 0),
    chargebackCount: Number(baseline.chargebackCount || 0),
    fraudReports: Number(baseline.fraudReports || 0),
    accountAgeDays,
    loyaltyScore,
    reviewQualityScore: Number(baseline.reviewQualityScore || 0.5),
    consistencyScore,
    suspiciousActivityScore: Number(baseline.suspiciousActivityScore || 0),
  });

  const update = {
    userId: uid,
    trustScore: evaluation.trustScore,
    tier: evaluation.tier,
    totalOrders,
    paidOrders,
    consistencyScore,
    loyaltyScore,
    refundRate,
    accountAgeDays,
    recomputedAt: new Date(),
    reasons: evaluation.reasons,
    tierSetAt: !existing || existing.tier !== evaluation.tier ? new Date() : existing.tierSetAt,
  };

  const doc = await BuyerTrustProfile.findOneAndUpdate(
    { userId: uid },
    { $set: update, $setOnInsert: { createdAt: new Date() } },
    { new: true, upsert: true },
  );
  return doc;
}

/** Worker hook: refresh up to N buyers with recent activity. */
export async function refreshActiveBuyerTrust(limit = 150): Promise<number> {
  const cutoff = new Date(Date.now() - 14 * DAYS);
  const recentlyActive = await Order.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    { $group: { _id: '$buyerId' } },
    { $limit: limit },
  ] as any);
  let n = 0;
  for (const row of recentlyActive) {
    try {
      await refreshBuyerTrust(String((row as any)._id));
      n++;
    } catch {
      /* skip individual failures */
    }
  }
  return n;
}

/** Quick read helper for the orchestrator. */
export async function getBuyerTrust(userId?: string | null): Promise<IBuyerTrustProfile | null> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return BuyerTrustProfile.findOne({ userId }).lean() as any;
}
