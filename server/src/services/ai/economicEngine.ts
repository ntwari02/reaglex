/**
 * economicEngine.ts — supply/demand simulator (statistical, no ML).
 *
 * Periodically aggregates raw activity + inventory into a per-category
 * health profile saved on the global `MarketHealth` document. The
 * orchestrator + ranking engine read these health rows to:
 *
 *  - boost categories with demand > supply (scarcity → urgency)
 *  - throttle saturated categories (too many sellers competing)
 *  - decay slow-moving listings (or boost discounting heuristics)
 *  - balance exposure between hot and cold categories
 *
 * The formulas:
 *
 *   demand        = views7d + 3·cartAdds7d + 8·conversions7d
 *   supply        = activeProducts + 0.5·activeSellers
 *   saturation    = min(1, activeSellers / max(20, sqrt(demand)))
 *   sd_ratio      = demand / max(supply, 1)
 *   elasticity    = |Δqty/Δprice|  (approximated from price spread)
 */

import mongoose from 'mongoose';
import { Product } from '../../models/Product';
import { Order } from '../../models/Order';
import { RecommendationActivity } from '../../models/RecommendationActivity';
import { MarketHealth, type ICategoryHealth, getMarketHealth } from '../../models/MarketHealth';

const DAYS = 86_400_000;

interface RawCategoryAgg {
  category: string;
  views7d: number;
  cartAdds7d: number;
  conversions7d: number;
  activeSellers: number;
  activeProducts: number;
  meanPrice: number;
  priceSpread: number;
}

/** Aggregate raw signal into a per-category snapshot. */
async function aggregateCategorySignals(): Promise<RawCategoryAgg[]> {
  const since = new Date(Date.now() - 7 * DAYS);

  const [activityAgg, productsAgg] = await Promise.all([
    RecommendationActivity.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$category',
          views: { $sum: { $cond: [{ $eq: ['$eventType', 'product_view'] }, 1, 0] } },
          carts: { $sum: { $cond: [{ $eq: ['$eventType', 'cart_add'] }, 1, 0] } },
          purchases: { $sum: { $cond: [{ $eq: ['$eventType', 'purchase'] }, 1, 0] } },
        },
      },
    ] as any),
    Product.aggregate([
      { $match: { status: { $ne: 'archived' } } },
      {
        $group: {
          _id: '$category',
          activeProducts: { $sum: 1 },
          activeSellers: { $addToSet: '$sellerId' },
          meanPrice: { $avg: '$price' },
          maxPrice: { $max: '$price' },
          minPrice: { $min: '$price' },
        },
      },
    ] as any),
  ]);

  const byCategory = new Map<string, RawCategoryAgg>();
  for (const row of productsAgg as any[]) {
    const cat = String(row._id || 'uncategorised');
    byCategory.set(cat, {
      category: cat,
      views7d: 0,
      cartAdds7d: 0,
      conversions7d: 0,
      activeSellers: Array.isArray(row.activeSellers) ? row.activeSellers.length : 0,
      activeProducts: Number(row.activeProducts) || 0,
      meanPrice: Number(row.meanPrice) || 0,
      priceSpread: Math.max(0, Number(row.maxPrice) - Number(row.minPrice)),
    });
  }
  for (const row of activityAgg as any[]) {
    const cat = String(row._id || 'uncategorised');
    const cur = byCategory.get(cat) || {
      category: cat,
      views7d: 0,
      cartAdds7d: 0,
      conversions7d: 0,
      activeSellers: 0,
      activeProducts: 0,
      meanPrice: 0,
      priceSpread: 0,
    };
    cur.views7d = Number(row.views) || 0;
    cur.cartAdds7d = Number(row.carts) || 0;
    cur.conversions7d = Number(row.purchases) || 0;
    byCategory.set(cat, cur);
  }
  return Array.from(byCategory.values());
}

function toCategoryHealth(raw: RawCategoryAgg): ICategoryHealth {
  const demand = raw.views7d + 3 * raw.cartAdds7d + 8 * raw.conversions7d;
  const supply = raw.activeProducts + 0.5 * raw.activeSellers;
  const saturation = Math.min(1, raw.activeSellers / Math.max(20, Math.sqrt(Math.max(1, demand))));
  const supplyDemandRatio = demand / Math.max(supply, 1);
  const elasticity = raw.meanPrice > 0
    ? Math.min(5, raw.priceSpread / raw.meanPrice)
    : 1;
  return {
    category: raw.category,
    views7d: raw.views7d,
    conversions7d: raw.conversions7d,
    activeSellers: raw.activeSellers,
    activeProducts: raw.activeProducts,
    saturationScore: Number(saturation.toFixed(3)),
    supply,
    demand,
    supplyDemandRatio: Number(supplyDemandRatio.toFixed(3)),
    priceElasticity: Number(elasticity.toFixed(3)),
    updatedAt: new Date(),
  };
}

/** Periodic worker: recompute and persist category-level economic data. */
export async function recomputeEconomicHealth(): Promise<number> {
  const raw = await aggregateCategorySignals();
  const categories = raw.map(toCategoryHealth);

  const doc = await getMarketHealth();
  doc.categories = categories;
  await doc.save();
  return categories.length;
}

/** Read a category's health row (read-only, cached for one minute). */
let cache: { at: number; map: Map<string, ICategoryHealth> } | null = null;
const CACHE_MS = 60_000;

export async function getCategoryHealth(category?: string | null): Promise<ICategoryHealth | null> {
  if (!category) return null;
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    const doc = await MarketHealth.findOne({ key: 'global' }).lean();
    cache = {
      at: Date.now(),
      map: new Map((doc?.categories || []).map((c: any) => [String(c.category), c])),
    };
  }
  return cache.map.get(category) || null;
}

/** Pure: compute a 0..1 economic boost for a product based on its category's pressure. */
export function economicBoost(catHealth: ICategoryHealth | null | undefined): {
  multiplier: number;
  reason: string;
} {
  if (!catHealth) return { multiplier: 1, reason: 'no-economic-data' };
  // Strong demand vs supply → urgency multiplier (max +20%).
  if (catHealth.supplyDemandRatio > 5) {
    return { multiplier: 1.2, reason: 'category-high-demand' };
  }
  if (catHealth.supplyDemandRatio > 2) {
    return { multiplier: 1.1, reason: 'category-demand-rising' };
  }
  // Heavily saturated → soft throttle (-10%).
  if (catHealth.saturationScore > 0.8) {
    return { multiplier: 0.9, reason: 'category-saturated' };
  }
  // Oversupply with low demand → mild promotion (+8%) to clear stock.
  if (catHealth.supplyDemandRatio < 0.4 && catHealth.activeProducts > 50) {
    return { multiplier: 1.08, reason: 'category-oversupply' };
  }
  return { multiplier: 1, reason: 'economic-neutral' };
}

/**
 * Returns "urgency tier" for a product based on category demand pressure.
 * Used to drive UI badges like "High demand" or "Selling fast".
 */
export function urgencyTier(catHealth: ICategoryHealth | null | undefined): 'none' | 'rising' | 'high' | 'scarce' {
  if (!catHealth) return 'none';
  if (catHealth.supplyDemandRatio > 6 && catHealth.demand > 200) return 'scarce';
  if (catHealth.supplyDemandRatio > 4) return 'high';
  if (catHealth.supplyDemandRatio > 2) return 'rising';
  return 'none';
}

/** Average economic pressure across the marketplace — used by the global orchestrator. */
export async function getEconomicSummary(): Promise<{
  totalCategories: number;
  highDemandCategories: number;
  saturatedCategories: number;
  oversupplyCategories: number;
}> {
  const doc = await MarketHealth.findOne({ key: 'global' }).lean();
  const cats = (doc?.categories || []) as ICategoryHealth[];
  return {
    totalCategories: cats.length,
    highDemandCategories: cats.filter((c) => c.supplyDemandRatio > 4).length,
    saturatedCategories: cats.filter((c) => c.saturationScore > 0.7).length,
    oversupplyCategories: cats.filter((c) => c.supplyDemandRatio < 0.4 && c.activeProducts > 50).length,
  };
}
