/**
 * marketGraphService.ts — unified read API across all marketplace graphs.
 *
 * The platform already maintains several specialised graphs:
 *   - `CoOccurrenceEdge`   (product ↔ product)
 *   - `CategoryAdjacency`  (category ↔ category)
 *   - `RecommendationActivity` (user → product events; implicit edges)
 *   - `SellerTrustProfile` (seller trust nodes)
 *
 * This service offers a single, denormalised facade so recommendation
 * pipelines, the orchestrator, and admin tooling don't all need to know
 * how the underlying collections are structured.
 *
 * Everything is pure graph traversal + numeric scoring — no ML.
 */

import mongoose from 'mongoose';
import { CoOccurrenceEdge } from '../../models/CoOccurrenceEdge';
import { CategoryAdjacency } from '../../models/CategoryAdjacency';
import { RecommendationActivity } from '../../models/RecommendationActivity';
import { Product } from '../../models/Product';
import { SellerTrustProfile } from '../../models/SellerTrustProfile';

export type NodeType = 'user' | 'product' | 'seller' | 'category' | 'session';
export type EdgeType =
  | 'co_view'
  | 'co_cart'
  | 'co_purchase'
  | 'co_wishlist'
  | 'category_adjacent'
  | 'user_viewed'
  | 'user_cart'
  | 'user_purchase'
  | 'seller_owns';

export interface GraphNode {
  type: NodeType;
  id: string;
  label?: string;
  weight?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  weight: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/* ────────────────────────── PRODUCT NEIGHBOURS ────────────────────────── */

export interface ProductNeighbour {
  productId: string;
  weight: number;
  edgeType: EdgeType;
  reason: string;
}

/**
 * Return the strongest product-product edges from the co-occurrence
 * matrix. Used as the backbone of "Frequently bought together" and
 * "Customers also viewed".
 */
export async function getProductNeighbours(
  productId: string,
  opts: { limit?: number; minWeight?: number; edgeBias?: EdgeType[] } = {},
): Promise<ProductNeighbour[]> {
  if (!mongoose.Types.ObjectId.isValid(productId)) return [];
  const limit = Math.max(1, Math.min(50, opts.limit || 12));
  const minWeight = opts.minWeight ?? 0.05;
  const pid = new mongoose.Types.ObjectId(productId);

  const edges = await CoOccurrenceEdge.find({
    $or: [{ productA: pid }, { productB: pid }],
    weight: { $gte: minWeight },
  })
    .sort({ weight: -1 })
    .limit(limit * 3)
    .lean();

  const seen = new Set<string>();
  const out: ProductNeighbour[] = [];
  for (const e of edges as any[]) {
    const otherId = String(e.productA) === productId ? String(e.productB) : String(e.productA);
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    // Pick the strongest underlying counter as the edge type "reason".
    const counters = e.counters || {};
    const ordered = ['co_purchase', 'co_cart', 'co_wishlist', 'co_view'] as EdgeType[];
    let dominant: EdgeType = 'co_view';
    let best = -1;
    for (const c of ordered) {
      const v = Number(counters[c] || 0);
      if (v > best) {
        dominant = c;
        best = v;
      }
    }
    out.push({
      productId: otherId,
      weight: Number(e.weight),
      edgeType: dominant,
      reason:
        dominant === 'co_purchase'
          ? 'frequently-bought-together'
          : dominant === 'co_cart'
            ? 'often-added-together'
            : dominant === 'co_wishlist'
              ? 'often-wishlisted-together'
              : 'often-viewed-together',
    });
    if (out.length >= limit) break;
  }
  return out;
}

/* ────────────────────────── USER NEIGHBOURHOOD ────────────────────────── */

export interface UserBehaviorWindow {
  productIds: string[];
  categoryIds: string[];
}

/**
 * Build a lightweight user → product graph window from raw event logs.
 * The returned `productIds` are recent products the user has interacted
 * with; `categoryIds` is their top-N category footprint.
 */
export async function getUserWindow(userId: string, daysBack = 30): Promise<UserBehaviorWindow> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return { productIds: [], categoryIds: [] };
  const since = new Date(Date.now() - daysBack * 86_400_000);
  const events = await RecommendationActivity.find({
    userId,
    createdAt: { $gte: since },
  })
    .select('productId category')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const productIds: string[] = [];
  const seen = new Set<string>();
  const catCounts = new Map<string, number>();
  for (const e of events as any[]) {
    if (e.productId) {
      const id = String(e.productId);
      if (!seen.has(id)) {
        seen.add(id);
        productIds.push(id);
      }
    }
    if (e.category) {
      catCounts.set(e.category, (catCounts.get(e.category) || 0) + 1);
    }
  }
  const categoryIds = [...catCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([k]) => k);
  return { productIds: productIds.slice(0, 50), categoryIds };
}

/* ────────────────────────── COMBINED RECOMMENDATIONS ────────────────────────── */

export interface ScoredProduct {
  productId: string;
  score: number;
  reasons: string[];
}

/**
 * Combine multiple graph signals into a deterministic ranked recommendation.
 *
 * For each candidate product P:
 *   score =
 *      Σ (coOccurrenceWeight from seed-products)          × 1.0
 *    + Σ (categoryAdjacencyWeight from seed-categories)   × 0.6
 *    + (alreadyInUserWindow ? 0 : exploration_bonus)      × 0.3
 *
 * This is the canonical "no-ML recommender" — every contribution is
 * inspectable and admins can re-tune the multipliers from the AI config.
 */
export async function recommendForUser(opts: {
  userId?: string;
  seedProductIds?: string[];
  seedCategories?: string[];
  limit?: number;
}): Promise<ScoredProduct[]> {
  const limit = Math.max(1, Math.min(50, opts.limit || 20));
  const seedProducts = new Set<string>(opts.seedProductIds || []);
  const seedCats = new Set<string>(opts.seedCategories || []);

  // Pull the user's history window if provided.
  if (opts.userId) {
    const win = await getUserWindow(opts.userId);
    win.productIds.forEach((p) => seedProducts.add(p));
    win.categoryIds.forEach((c) => seedCats.add(c));
  }

  // 1) Aggregate co-occurrence neighbours of seed products.
  const scoresByProduct = new Map<string, { score: number; reasons: string[] }>();
  for (const seed of seedProducts) {
    if (!mongoose.Types.ObjectId.isValid(seed)) continue;
    const neighbours = await getProductNeighbours(seed, { limit: 20 });
    for (const n of neighbours) {
      if (seedProducts.has(n.productId)) continue;
      const cur = scoresByProduct.get(n.productId) || { score: 0, reasons: [] };
      cur.score += n.weight * 1.0;
      cur.reasons.push(`${n.reason} with ${seed.slice(-6)}`);
      scoresByProduct.set(n.productId, cur);
    }
  }

  // 2) Use category adjacency to broaden the seed set.
  const adjacentCats = new Set<string>();
  if (seedCats.size) {
    const adjacencies = await CategoryAdjacency.find({ category: { $in: [...seedCats] } }).lean();
    for (const a of adjacencies as any[]) {
      for (const n of a.neighbours || []) {
        if (n.weight >= 0.05) adjacentCats.add(n.category);
      }
    }
  }
  const allCats = new Set<string>([...seedCats, ...adjacentCats]);
  if (allCats.size) {
    // Pull a small set of high-quality candidates from those categories.
    const cands = await Product.find(
      { category: { $in: [...allCats] }, stock: { $gt: 0 } } as any,
    )
      .select('_id category')
      .sort({ soldCount: -1, wishlistCount: -1 })
      .limit(limit * 4)
      .lean();
    for (const p of cands as any[]) {
      const pid = String(p._id);
      if (seedProducts.has(pid)) continue;
      const inDirect = seedCats.has(p.category);
      const cur = scoresByProduct.get(pid) || { score: 0, reasons: [] };
      cur.score += inDirect ? 0.45 : 0.25;
      cur.reasons.push(inDirect ? `same-category:${p.category}` : `adjacent-category:${p.category}`);
      scoresByProduct.set(pid, cur);
    }
  }

  // 3) Normalise to 0..1 and return top-K.
  const arr = [...scoresByProduct.entries()]
    .map(([productId, v]) => ({ productId, score: v.score, reasons: v.reasons.slice(0, 4) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const max = arr[0]?.score || 1;
  return arr.map((r) => ({ ...r, score: clamp01(r.score / max) }));
}

/* ────────────────────────── FRAUD GRAPH HELPERS ────────────────────────── */

/**
 * Detect product → seller clusters with abnormally high co-purchase
 * weights — a soft hint at "review rings" or seller collusion. Pure
 * graph anomaly: no anomaly-detection algorithms required.
 */
export async function findCollusionClusters(opts: { minWeight?: number; limit?: number } = {}): Promise<
  Array<{ seller: string; products: string[]; totalWeight: number }>
> {
  const minWeight = opts.minWeight ?? 4;
  const limit = opts.limit || 20;
  const heavyEdges = await CoOccurrenceEdge.find({ weight: { $gte: minWeight } })
    .sort({ weight: -1 })
    .limit(limit * 5)
    .lean();
  const productIds = new Set<string>();
  for (const e of heavyEdges as any[]) {
    productIds.add(String(e.productA));
    productIds.add(String(e.productB));
  }
  if (!productIds.size) return [];
  const products = await Product.find({ _id: { $in: [...productIds] } } as any)
    .select('_id sellerId')
    .lean();
  const bySeller = new Map<string, { products: Set<string>; totalWeight: number }>();
  for (const p of products as any[]) {
    const sid = p.sellerId ? String(p.sellerId) : null;
    if (!sid) continue;
    if (!bySeller.has(sid)) bySeller.set(sid, { products: new Set(), totalWeight: 0 });
    bySeller.get(sid)!.products.add(String(p._id));
  }
  for (const e of heavyEdges as any[]) {
    const sa = products.find((p: any) => String(p._id) === String(e.productA))?.sellerId;
    const sb = products.find((p: any) => String(p._id) === String(e.productB))?.sellerId;
    if (sa && String(sa) === String(sb)) {
      const bucket = bySeller.get(String(sa));
      if (bucket) bucket.totalWeight += Number(e.weight) || 0;
    }
  }
  return [...bySeller.entries()]
    .map(([seller, v]) => ({
      seller,
      products: [...v.products],
      totalWeight: Number(v.totalWeight.toFixed(2)),
    }))
    .filter((c) => c.products.length >= 3 && c.totalWeight >= minWeight * 3)
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .slice(0, limit);
}

/* ────────────────────────── GRAPH SUMMARY (admin) ────────────────────────── */

export async function getGraphStats(): Promise<{
  coOccurrenceEdges: number;
  categoryEdges: number;
  trustedSellers: number;
}> {
  const [coCount, catCount, trustedSellers] = await Promise.all([
    CoOccurrenceEdge.estimatedDocumentCount(),
    CategoryAdjacency.estimatedDocumentCount(),
    SellerTrustProfile.countDocuments({ trustScore: { $gte: 70 } } as any),
  ]);
  return { coOccurrenceEdges: coCount, categoryEdges: catCount, trustedSellers };
}
