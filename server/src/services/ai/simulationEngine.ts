/**
 * simulationEngine.ts — sandbox for admins.
 *
 * Lets admins preview how a proposed `MarketplaceAIConfig` would change
 * the home feed ranking *before* committing the change in production.
 *
 * The simulation:
 *  1) Clones the current config
 *  2) Patches the requested fields (weights, sliders, sponsored)
 *  3) Runs the deterministic ranking engine on a fixed sample of products
 *     against a synthetic profile + session
 *  4) Returns the before/after ranked lists + summary deltas
 *
 * Nothing is written. No persistence. The admin reviews the diff and
 * decides whether to apply.
 */

import mongoose from 'mongoose';
import { Product } from '../../models/Product';
import { ProductSignalSnapshot } from '../../models/ProductSignalSnapshot';
import { SellerTrustProfile } from '../../models/SellerTrustProfile';
import { SellerSubscription } from '../../models/SellerSubscription';
import {
  getMarketplaceAIConfig,
  type IMarketplaceAIConfig,
  type IRankingWeights,
  type ISliders,
  type ISponsoredConfig,
} from '../../models/MarketplaceAIConfig';
import {
  rankProducts,
  type RankingContext,
  type RankedProduct,
} from './rankingEngine';

export interface SimulationInput {
  /** Optional partial overrides. */
  weights?: Partial<IRankingWeights>;
  sliders?: Partial<ISliders>;
  sponsored?: Partial<ISponsoredConfig>;
  /** Sample size. Defaults to 60. Larger sizes take longer. */
  sampleSize?: number;
  /** Sample category, if provided we draw products from this category. */
  category?: string;
  /** Optional synthetic buyer profile to test personalisation. */
  syntheticBuyer?: {
    categoryAffinity?: Record<string, number>;
    pricePreferenceUsd?: { min: number; max: number; median: number };
    mode?: string;
  };
}

export interface SimulationDelta {
  productId: string;
  name: string;
  before: { rank: number; score: number };
  after: { rank: number; score: number };
  movement: number; // positive = moved up
}

export interface SimulationResult {
  sampleSize: number;
  before: Array<{ productId: string; name: string; score: number; reasons: string[] }>;
  after: Array<{ productId: string; name: string; score: number; reasons: string[] }>;
  deltas: SimulationDelta[];
  summary: {
    avgRankDelta: number;
    biggestRiser?: { productId: string; movement: number };
    biggestFaller?: { productId: string; movement: number };
    diversitySellerCountBefore: number;
    diversitySellerCountAfter: number;
  };
  warnings: string[];
}

function cloneConfig(cfg: IMarketplaceAIConfig): IMarketplaceAIConfig {
  // Strip mongoose proxy + return a deep plain copy.
  const plain = JSON.parse(JSON.stringify(cfg.toObject ? cfg.toObject() : cfg)) as IMarketplaceAIConfig;
  return plain;
}

function applyPatches(cfg: IMarketplaceAIConfig, input: SimulationInput): IMarketplaceAIConfig {
  if (input.weights) Object.assign(cfg.weights, input.weights);
  if (input.sliders) Object.assign(cfg.sliders, input.sliders);
  if (input.sponsored) Object.assign(cfg.sponsored, input.sponsored);
  return cfg;
}

function summariseRanked(
  ranked: RankedProduct[],
): Array<{ productId: string; name: string; score: number; reasons: string[] }> {
  return ranked.map((r) => ({
    productId: String((r.product as any)._id),
    name: String((r.product as any).name || ''),
    score: Math.round(r.score),
    reasons: r.reasons.slice(0, 4),
  }));
}

export async function runSimulation(input: SimulationInput = {}): Promise<SimulationResult> {
  const warnings: string[] = [];

  const liveCfg = await getMarketplaceAIConfig();
  const beforeCfg = cloneConfig(liveCfg);
  const afterCfg = applyPatches(cloneConfig(liveCfg), input);

  const sampleSize = Math.max(10, Math.min(200, input.sampleSize || 60));
  const productFilter: any = { stock: { $gt: 0 } };
  if (input.category) productFilter.category = input.category;

  const products = await Product.find(productFilter)
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(sampleSize)
    .lean();

  if (!products.length) {
    warnings.push('no-products-found');
    return {
      sampleSize: 0,
      before: [],
      after: [],
      deltas: [],
      summary: {
        avgRankDelta: 0,
        diversitySellerCountBefore: 0,
        diversitySellerCountAfter: 0,
      },
      warnings,
    };
  }

  // Pre-fetch ranking dependencies once (shared across before/after).
  const productIds = products.map((p: any) => p._id);
  const sellerIds = Array.from(new Set(products.map((p: any) => String(p.sellerId)).filter(Boolean)));

  const [signals, trusts, subs] = await Promise.all([
    ProductSignalSnapshot.find({ productId: { $in: productIds } } as any).lean(),
    sellerIds.length
      ? SellerTrustProfile.find({ sellerId: { $in: sellerIds } } as any).lean()
      : Promise.resolve([]),
    sellerIds.length
      ? SellerSubscription.find({ seller_id: { $in: sellerIds } } as any).lean()
      : Promise.resolve([]),
  ]);

  const ctxBase: Omit<RankingContext, 'config'> = {
    profile: input.syntheticBuyer
      ? ({
          categoryAffinity: input.syntheticBuyer.categoryAffinity || {},
          pricePreferenceUsd: input.syntheticBuyer.pricePreferenceUsd,
        } as any)
      : null,
    session: input.syntheticBuyer?.mode
      ? ({ mode: input.syntheticBuyer.mode } as any)
      : null,
    signalsByProduct: new Map(
      (signals as any[]).map((s) => [String(s.productId), s as any]),
    ),
    trustBySeller: new Map((trusts as any[]).map((t) => [String(t.sellerId), t as any])),
    subscriptionBySeller: new Map(
      (subs as any[]).map((s) => [String(s.seller_id), s as any]),
    ),
    localHour: new Date().getUTCHours(),
  };

  const rankedBefore = rankProducts(products as any, { ...ctxBase, config: beforeCfg }, { limit: sampleSize });
  const rankedAfter = rankProducts(products as any, { ...ctxBase, config: afterCfg }, { limit: sampleSize });

  const beforeRanks = new Map<string, number>();
  rankedBefore.forEach((r, idx) => beforeRanks.set(String((r.product as any)._id), idx));
  const afterRanks = new Map<string, number>();
  rankedAfter.forEach((r, idx) => afterRanks.set(String((r.product as any)._id), idx));

  const deltas: SimulationDelta[] = [];
  for (const r of rankedBefore) {
    const pid = String((r.product as any)._id);
    const bIdx = beforeRanks.get(pid)!;
    const aIdx = afterRanks.get(pid);
    if (aIdx == null) continue;
    const afterRow = rankedAfter[aIdx];
    deltas.push({
      productId: pid,
      name: String((r.product as any).name || ''),
      before: { rank: bIdx + 1, score: Math.round(r.score) },
      after: { rank: aIdx + 1, score: Math.round(afterRow.score) },
      movement: bIdx - aIdx, // positive = moved up
    });
  }

  deltas.sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));

  const avgRankDelta =
    deltas.length > 0
      ? Number((deltas.reduce((s, d) => s + Math.abs(d.movement), 0) / deltas.length).toFixed(2))
      : 0;
  const biggestRiser = deltas.find((d) => d.movement > 0);
  const biggestFaller = [...deltas].reverse().find((d) => d.movement < 0);

  const sellersBefore = new Set(rankedBefore.slice(0, 20).map((r) => String((r.product as any).sellerId)));
  const sellersAfter = new Set(rankedAfter.slice(0, 20).map((r) => String((r.product as any).sellerId)));

  if (Math.abs(avgRankDelta) > 10) {
    warnings.push(`large-avg-rank-delta:${avgRankDelta}`);
  }
  if (sellersAfter.size < 3) {
    warnings.push('low-seller-diversity-after:risk-of-ranking-collapse');
  }

  return {
    sampleSize: products.length,
    before: summariseRanked(rankedBefore),
    after: summariseRanked(rankedAfter),
    deltas: deltas.slice(0, 25),
    summary: {
      avgRankDelta,
      biggestRiser: biggestRiser
        ? { productId: biggestRiser.productId, movement: biggestRiser.movement }
        : undefined,
      biggestFaller: biggestFaller
        ? { productId: biggestFaller.productId, movement: biggestFaller.movement }
        : undefined,
      diversitySellerCountBefore: sellersBefore.size,
      diversitySellerCountAfter: sellersAfter.size,
    },
    warnings,
  };
}

/* Suppress unused-import lints for symbols kept around for future extension. */
void mongoose;
