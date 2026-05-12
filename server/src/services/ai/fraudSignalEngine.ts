/**
 * fraudSignalEngine.ts — heuristic anomaly + fake-review detection.
 *
 * The system relies on three local detectors:
 *   1) Review velocity anomalies (sudden 5-star spike for a low-traffic product)
 *   2) Account/device clustering (multiple reviewers sharing identical UA/IP)
 *   3) Inventory + sales mismatch (impossible 1000 sales in 1h)
 *
 * Every flagged product/seller gets a `fraudRisk` in `ProductSignalSnapshot`
 * that the ranking engine penalises via the `fraudPenalty` weight.
 *
 * The detection is intentionally conservative: false positives cost more
 * than false negatives in marketplaces, so we only set a high fraudRisk
 * when at least two independent signals trip simultaneously.
 */

import { ProductReview } from '../../models/ProductReview';
import { ProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import { Product } from '../../models/Product';
import { RecommendationActivity } from '../../models/RecommendationActivity';
import type { Types } from 'mongoose';

interface ReviewRow {
  rating: number;
  createdAt: Date;
  ip?: string;
  userAgent?: string;
  userId?: Types.ObjectId;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Pure: returns 0..1 review fakeness probability based on rolling stats.
 * - >70% 5-star reviews in 7d AND <50 7d-views ⇒ suspicious
 * - identical IP/UA on 3+ reviews ⇒ suspicious
 */
export function computeReviewFakeness(reviews: ReviewRow[], views7d: number): number {
  if (!reviews.length) return 0;
  const cutoff = Date.now() - 7 * 86_400_000;
  const recent = reviews.filter((r) => +new Date(r.createdAt) >= cutoff);
  if (!recent.length) return 0;

  const fiveStar = recent.filter((r) => Number(r.rating) >= 5).length;
  const fiveStarRatio = fiveStar / recent.length;
  let suspicion = 0;

  if (fiveStarRatio >= 0.7 && views7d <= 50) suspicion += 0.35;

  // Group by IP
  const ipCounts = new Map<string, number>();
  const uaCounts = new Map<string, number>();
  for (const r of recent) {
    if (r.ip) ipCounts.set(r.ip, (ipCounts.get(r.ip) || 0) + 1);
    if (r.userAgent) uaCounts.set(r.userAgent, (uaCounts.get(r.userAgent) || 0) + 1);
  }
  const ipMax = Array.from(ipCounts.values()).reduce((a, b) => Math.max(a, b), 0);
  const uaMax = Array.from(uaCounts.values()).reduce((a, b) => Math.max(a, b), 0);
  if (ipMax >= 3) suspicion += 0.3;
  if (uaMax >= 4) suspicion += 0.2;

  return clamp(suspicion, 0, 1);
}

/**
 * Pure: detects bot-like view burst (e.g. 1k product views from same IP in
 * a few minutes). Returns 0..1 risk.
 */
export function computeBotViewRisk(viewIps: Map<string, number>): number {
  if (!viewIps.size) return 0;
  const counts = Array.from(viewIps.values()).sort((a, b) => b - a);
  const top = counts[0] || 0;
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const dominance = top / total;
  if (top >= 200 && dominance >= 0.5) return 1;
  if (top >= 50 && dominance >= 0.7) return 0.7;
  if (top >= 20 && dominance >= 0.85) return 0.4;
  return 0;
}

/**
 * Batch worker — recompute fraud risk for every product that has a
 * snapshot. Writes `fraudRisk` back into the snapshot.
 */
export async function recomputeAllFraudRisks(): Promise<number> {
  const snapshots = await ProductSignalSnapshot.find({})
    .select('productId views7d')
    .lean();
  if (!snapshots.length) return 0;

  const ids = snapshots.map((s: any) => s.productId);
  const reviewsByProduct: Map<string, ReviewRow[]> = new Map();
  try {
    const reviews = await ProductReview.find({ productId: { $in: ids } })
      .select('productId rating createdAt ip userAgent userId')
      .lean();
    for (const r of reviews as any[]) {
      const key = String(r.productId);
      const list = reviewsByProduct.get(key) || [];
      list.push({
        rating: r.rating,
        createdAt: r.createdAt,
        ip: r.ip,
        userAgent: r.userAgent,
        userId: r.userId,
      });
      reviewsByProduct.set(key, list);
    }
  } catch {
    /* ignore — model may not exist in all deployments */
  }

  const ops: any[] = [];
  for (const snap of snapshots as any[]) {
    const pid = String(snap.productId);
    const reviews = reviewsByProduct.get(pid) || [];
    const reviewRisk = computeReviewFakeness(reviews, Number(snap.views7d) || 0);
    // For bot views we'd need raw IP-level activity; rely on review signals
    // as the primary heuristic here. The view-burst path runs in real-time
    // hooks in the future.
    const fraudRisk = clamp(reviewRisk, 0, 1);
    if (fraudRisk > 0) {
      ops.push({
        updateOne: {
          filter: { productId: snap.productId },
          update: { $set: { fraudRisk } },
        },
      });
    }
  }
  if (ops.length) await ProductSignalSnapshot.bulkWrite(ops, { ordered: false });
  return ops.length;
}

/**
 * Realtime helper — call from product view tracking to estimate live bot
 * risk for a single product. Returns 0..1.
 */
export async function liveBotRiskForProduct(productId: string): Promise<number> {
  try {
    const since = new Date(Date.now() - 60 * 60_000);
    const rows = await RecommendationActivity.find({
      productId,
      eventType: 'product_view',
      createdAt: { $gte: since },
    })
      .select('meta')
      .lean();
    const ipCounts = new Map<string, number>();
    for (const r of rows as any[]) {
      const ip = String(r.meta?.ip || '');
      if (!ip) continue;
      ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    }
    return computeBotViewRisk(ipCounts);
  } catch {
    return 0;
  }
}

/**
 * Pure detection helper for duplicate-account suspicion. Caller passes a
 * list of recent registrations; we look for >3 accounts created in the
 * same hour from the same IP / device fingerprint.
 */
export function detectDuplicateAccounts(
  registrations: Array<{ ip?: string; deviceFingerprint?: string; createdAt: Date }>,
): boolean {
  if (registrations.length < 3) return false;
  const buckets = new Map<string, number>();
  for (const r of registrations) {
    const hour = Math.floor(+new Date(r.createdAt) / (60 * 60 * 1000));
    const key = `${r.ip || ''}-${r.deviceFingerprint || ''}-${hour}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  for (const v of buckets.values()) if (v >= 3) return true;
  return false;
}
