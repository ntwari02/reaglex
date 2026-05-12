/**
 * sponsoredAdEngine.ts — ad ranking that protects the buyer.
 *
 * Reuses the existing `ProductPromotion` model: every active campaign with
 * a `homepageSponsored` or `searchSponsored` flag becomes a candidate.
 *
 * Final ad position = bid × quality × relevance × trust. Low-quality items
 * can NEVER dominate just because a seller paid more — the global
 * `MarketplaceAIConfig.sponsored.minQualityScore` floor drops them out.
 */

import mongoose from 'mongoose';
import { ProductPromotion } from '../../models/ProductPromotion';
import { ProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import { SellerTrustProfile } from '../../models/SellerTrustProfile';
import { Product } from '../../models/Product';
import type { IMarketplaceAIConfig } from '../../models/MarketplaceAIConfig';

export interface SponsoredCandidate {
  productId: string;
  sellerId?: string;
  bid: number;
  quality: number;
  trust: number;
  finalAdScore: number;
}

interface PromoLike {
  productId?: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId;
  bidUsd?: number;
  bidCpc?: number;
  bidCpm?: number;
  cpcBid?: number;
  cpmBid?: number;
  promotionType?: string;
  type?: string;
  status?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  startDate?: Date;
  endDate?: Date;
  homepageSponsored?: boolean;
  searchSponsored?: boolean;
}

function isActive(p: PromoLike, now = Date.now()): boolean {
  if (p.status && p.status !== 'active' && p.status !== 'running' && p.status !== 'live') return false;
  const start = p.scheduledStart || p.startDate;
  const end = p.scheduledEnd || p.endDate;
  if (start && new Date(start).getTime() > now) return false;
  if (end && new Date(end).getTime() < now) return false;
  return true;
}

function bidValue(p: PromoLike): number {
  return Number(
    p.bidUsd ?? p.bidCpc ?? p.cpcBid ?? p.bidCpm ?? p.cpmBid ?? 0,
  ) || 0;
}

/**
 * Returns a quality-filtered, deterministic-ordered set of sponsored
 * product candidates. Caller blends them into the organic feed at the
 * positions configured by `sponsoredAggressiveness`.
 */
export async function getSponsoredCandidates(
  cfg: IMarketplaceAIConfig,
  opts: { surface?: 'homepage' | 'search' | 'category'; category?: string; limit?: number } = {},
): Promise<SponsoredCandidate[]> {
  if (!cfg.sponsored?.enabled) return [];

  const limit = Math.max(1, Math.min(60, opts.limit || 16));
  const minQuality = Math.max(0, cfg.sponsored.minQualityScore || 0);

  const query: any = {};
  if (opts.surface === 'homepage') query.homepageSponsored = true;
  else if (opts.surface === 'search') query.searchSponsored = true;

  let promos: any[] = [];
  try {
    promos = await ProductPromotion.find(query).limit(limit * 4).lean();
  } catch {
    return [];
  }

  const active = promos.filter((p) => isActive(p));
  if (!active.length) return [];

  const productIds = active
    .map((p) => p.productId)
    .filter(Boolean);
  if (!productIds.length) return [];

  const [signals, products] = await Promise.all([
    ProductSignalSnapshot.find({ productId: { $in: productIds } })
      .select('productId qualityScore trendScore')
      .lean(),
    Product.find({ _id: { $in: productIds }, status: { $ne: 'out_of_stock' } } as any)
      .select('_id sellerId category')
      .lean(),
  ]);
  const signalById = new Map<string, any>(signals.map((s: any) => [String(s.productId), s]));
  const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
  if (!productById.size) return [];

  const sellerIds = Array.from(
    new Set(products.map((p: any) => String(p.sellerId)).filter(Boolean)),
  );
  const trusts = await SellerTrustProfile.find({ sellerId: { $in: sellerIds } })
    .select('sellerId trustScore')
    .lean();
  const trustById = new Map<string, any>(
    trusts.map((t: any) => [String(t.sellerId), t]),
  );

  const cpcW = cfg.sponsored.cpcWeight ?? 0.6;
  const cpmW = cfg.sponsored.cpmWeight ?? 0.4;

  const out: SponsoredCandidate[] = [];
  for (const promo of active) {
    const pid = String(promo.productId);
    const product = productById.get(pid);
    if (!product) continue;
    if (opts.category && product.category && product.category !== opts.category) continue;

    const quality = Number(signalById.get(pid)?.qualityScore ?? 50);
    if (quality < minQuality) continue;

    const trustScore = Number(trustById.get(String(product.sellerId))?.trustScore ?? 50);
    const cpc = Number(promo.bidCpc ?? promo.cpcBid ?? 0);
    const cpm = Number(promo.bidCpm ?? promo.cpmBid ?? 0);
    const bid = bidValue(promo);

    const bidWeight = cpc * cpcW + cpm * cpmW;
    const finalAdScore =
      (bid + bidWeight) * (quality / 100) * (trustScore / 100);

    out.push({
      productId: pid,
      sellerId: String(product.sellerId),
      bid,
      quality,
      trust: trustScore,
      finalAdScore,
    });
  }

  out.sort((a, b) => b.finalAdScore - a.finalAdScore);
  return out.slice(0, limit);
}

/**
 * Decides which positions inside a list of organic results should be
 * replaced by a sponsored slot. Respects `sponsored.maxRatio` so the home
 * page never feels like an ad farm.
 */
export function planSponsoredSlots(
  totalSlots: number,
  cfg: IMarketplaceAIConfig,
): number[] {
  const ratio = Math.max(0, Math.min(100, cfg.sponsored?.maxRatio ?? 20)) / 100;
  const aggressiveness = Math.max(0, Math.min(100, cfg.sliders.sponsoredAggressiveness)) / 100;
  const desired = Math.floor(totalSlots * ratio * aggressiveness);
  if (desired <= 0) return [];

  // Evenly distribute sponsored positions, skipping slot 0 (never let the
  // very first impression on the home feed be an ad — best practice).
  const positions: number[] = [];
  const step = Math.max(2, Math.floor(totalSlots / (desired + 1)));
  let p = step;
  while (positions.length < desired && p < totalSlots) {
    positions.push(p);
    p += step;
  }
  return positions;
}
