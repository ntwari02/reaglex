/**
 * coOccurrenceEngine.ts — deterministic "bought together / viewed together"
 * recommendations powered by a sparse graph of product↔product edges.
 *
 * Algorithm:
 *   1. On every paid order, the engine increments the `co_purchase` counter
 *      on every product pair in the basket.
 *   2. On co-views (two products viewed in the same session within 15min),
 *      the engine increments `co_view` with a smaller weight.
 *   3. Each edge has a composite `weight` = co_purchase*4 + co_cart*2 + co_view*1 + co_wishlist*2,
 *      with time decay applied on read.
 *
 * Read path: `getRelated(productId, limit)` returns the top-K neighbours
 * sorted by decayed weight. Used by the home feed, PDP "Frequently bought
 * together", and the recommendation engine.
 */

import mongoose from 'mongoose';
import { CoOccurrenceEdge, type CoOccurrenceSource } from '../../models/CoOccurrenceEdge';
import { Product } from '../../models/Product';
import { CategoryAdjacency } from '../../models/CategoryAdjacency';

const HALF_LIFE_DAYS = 60; // decay constant — edges lose half their weight every 60 days
const SOURCE_WEIGHTS: Record<CoOccurrenceSource, number> = {
  co_purchase: 4,
  co_cart: 2,
  co_wishlist: 2,
  co_view: 1,
};

function normalisePair(
  a: mongoose.Types.ObjectId | string,
  b: mongoose.Types.ObjectId | string,
): { productA: mongoose.Types.ObjectId; productB: mongoose.Types.ObjectId } | null {
  const sa = String(a);
  const sb = String(b);
  if (sa === sb) return null;
  if (!mongoose.Types.ObjectId.isValid(sa) || !mongoose.Types.ObjectId.isValid(sb)) return null;
  const [first, second] = sa < sb ? [sa, sb] : [sb, sa];
  return {
    productA: new mongoose.Types.ObjectId(first),
    productB: new mongoose.Types.ObjectId(second),
  };
}

function decayFactor(lastSeenAt: Date): number {
  const ageDays = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
  if (ageDays <= 0) return 1;
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function weightFromCounters(counters: { co_view: number; co_cart: number; co_purchase: number; co_wishlist: number }): number {
  return (
    (counters.co_view || 0) * SOURCE_WEIGHTS.co_view +
    (counters.co_cart || 0) * SOURCE_WEIGHTS.co_cart +
    (counters.co_purchase || 0) * SOURCE_WEIGHTS.co_purchase +
    (counters.co_wishlist || 0) * SOURCE_WEIGHTS.co_wishlist
  );
}

/**
 * Record a co-occurrence between every pair in the given product list.
 * Idempotent — call from `recordCoPurchase`, `recordCoView`, etc.
 */
export async function recordCoOccurrence(
  productIds: Array<string | mongoose.Types.ObjectId>,
  source: CoOccurrenceSource,
): Promise<number> {
  const uniqueIds = Array.from(
    new Set(productIds.map((p) => String(p)).filter((s) => mongoose.Types.ObjectId.isValid(s))),
  );
  if (uniqueIds.length < 2) return 0;

  const ops: any[] = [];
  for (let i = 0; i < uniqueIds.length; i++) {
    for (let j = i + 1; j < uniqueIds.length; j++) {
      const pair = normalisePair(uniqueIds[i], uniqueIds[j]);
      if (!pair) continue;
      ops.push({
        updateOne: {
          filter: { productA: pair.productA, productB: pair.productB },
          update: {
            $inc: { [`counters.${source}`]: 1, weight: SOURCE_WEIGHTS[source] },
            $set: { lastSeenAt: new Date() },
            $setOnInsert: { productA: pair.productA, productB: pair.productB },
          },
          upsert: true,
        },
      });
    }
  }
  if (!ops.length) return 0;
  try {
    await CoOccurrenceEdge.bulkWrite(ops, { ordered: false });
  } catch (e: any) {
    // Duplicate-key races are expected under concurrency — bulkWrite
    // suppresses individual errors when ordered:false, so we only log.
    if (e?.writeErrors?.length) {
      console.warn(`[co-occurrence] ${e.writeErrors.length} write conflicts ignored`);
    } else {
      console.error('[co-occurrence] bulkWrite failed', e);
    }
  }
  return ops.length;
}

/**
 * Convenience: record the entire basket as a co-purchase event.
 */
export async function recordBasketPurchase(productIds: string[]): Promise<void> {
  await recordCoOccurrence(productIds, 'co_purchase');
}

/**
 * Pure: returns the strongest neighbours of a product. Uses time-decayed
 * weight. Filters out the product itself.
 */
export async function getRelated(
  productId: string,
  opts: { limit?: number; minWeight?: number } = {},
): Promise<Array<{ productId: string; weight: number; reason: CoOccurrenceSource }>> {
  if (!mongoose.Types.ObjectId.isValid(productId)) return [];
  const limit = Math.min(40, Math.max(1, opts.limit || 12));
  const minWeight = opts.minWeight ?? 1;

  const pid = new mongoose.Types.ObjectId(productId);
  const docs = await CoOccurrenceEdge.find({
    $or: [{ productA: pid }, { productB: pid }],
  })
    .sort({ weight: -1 })
    .limit(limit * 3)
    .lean();

  const scored = docs
    .map((d: any) => {
      const other = String(d.productA) === productId ? d.productB : d.productA;
      const baseWeight = weightFromCounters(d.counters || {});
      const decayed = baseWeight * decayFactor(d.lastSeenAt || d.updatedAt);
      const cm = d.counters || {};
      const top = (Object.entries(cm) as Array<[CoOccurrenceSource, number]>).sort(
        (a, b) => b[1] - a[1],
      )[0];
      return {
        productId: String(other),
        weight: decayed,
        reason: (top?.[0] || 'co_view') as CoOccurrenceSource,
      };
    })
    .filter((r) => r.weight >= minWeight);

  scored.sort((a, b) => b.weight - a.weight);
  return scored.slice(0, limit);
}

/**
 * Rebuild the category adjacency graph from co-purchase edges. Runs
 * periodically (every few hours). For every pair (catA, catB) we sum the
 * decayed weights of all product pairs where productA is in catA and
 * productB is in catB, then keep the top-K neighbours per category.
 */
export async function recomputeCategoryAdjacency(): Promise<number> {
  const sinceDate = new Date(Date.now() - 365 * 86_400_000);
  const edges = await CoOccurrenceEdge.find({ lastSeenAt: { $gte: sinceDate } })
    .select('productA productB counters lastSeenAt')
    .lean();
  if (!edges.length) return 0;

  const ids = new Set<string>();
  for (const e of edges as any[]) {
    ids.add(String(e.productA));
    ids.add(String(e.productB));
  }
  const products = await Product.find({ _id: { $in: Array.from(ids) } })
    .select('_id category categorySlug')
    .lean();
  const catByProduct = new Map<string, string>();
  for (const p of products as any[]) {
    const c = String(p.category || p.categorySlug || '').toLowerCase().trim();
    if (c) catByProduct.set(String(p._id), c);
  }

  const matrix = new Map<string, Map<string, number>>();
  for (const e of edges as any[]) {
    const ca = catByProduct.get(String(e.productA));
    const cb = catByProduct.get(String(e.productB));
    if (!ca || !cb || ca === cb) continue;
    const w = weightFromCounters(e.counters || {}) * decayFactor(e.lastSeenAt || e.updatedAt);
    if (w <= 0) continue;
    if (!matrix.has(ca)) matrix.set(ca, new Map());
    if (!matrix.has(cb)) matrix.set(cb, new Map());
    matrix.get(ca)!.set(cb, (matrix.get(ca)!.get(cb) || 0) + w);
    matrix.get(cb)!.set(ca, (matrix.get(cb)!.get(ca) || 0) + w);
  }

  const ops: any[] = [];
  for (const [cat, neighboursMap] of matrix.entries()) {
    const sorted = Array.from(neighboursMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, weight]) => ({
        category,
        weight: Math.round(weight * 1000) / 1000,
        source: 'auto' as const,
      }));
    ops.push({
      updateOne: {
        filter: { category: cat },
        update: {
          $set: {
            neighbours: sorted,
            recomputedAt: new Date(),
          },
          $setOnInsert: { category: cat },
        },
        upsert: true,
      },
    });
  }
  if (ops.length) await CategoryAdjacency.bulkWrite(ops, { ordered: false });
  return ops.length;
}
