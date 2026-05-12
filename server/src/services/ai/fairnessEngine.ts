/**
 * fairnessEngine.ts — marketplace exposure balancing (anti-monopoly).
 *
 * Without this engine, top-trusted sellers would naturally dominate every
 * feed (high CTR → high rank → more impressions → more CTR — a runaway).
 * The fairness engine enforces deterministic caps that keep new sellers
 * discoverable, prevent any single store from drowning the homepage, and
 * apply a soft "exposure debt" so brands rotate evenly across sessions.
 *
 * Three layers:
 *   1. PER-SESSION seller cap     — max N products from same seller
 *   2. CATEGORY rotation          — at most 40% of a section from same cat
 *   3. EXPOSURE DEBT              — sellers seen recently pay a penalty
 *
 * All counters live on `BuyerSessionIntent.sellerExposure`, decayed each
 * tick. The engine never blocks an item — it only re-ranks.
 */

import type { IBuyerSessionIntent } from '../../models/BuyerSessionIntent';
import type { RankedProduct } from './rankingEngine';
import type { IProduct } from '../../models/Product';

export interface FairnessOptions {
  /** Max products per seller in a single section (default 2). */
  perSellerCap?: number;
  /** Max ratio of one category in a section (default 0.4). */
  categoryRatioCap?: number;
  /** How strongly to demote sellers with high exposure debt (0..1). */
  exposureDebtStrength?: number;
}

const DEFAULTS: Required<FairnessOptions> = {
  perSellerCap: 2,
  categoryRatioCap: 0.4,
  exposureDebtStrength: 0.35,
};

function sellerOf(p: IProduct): string {
  return String((p as any).sellerId || 'unknown');
}

function categoryOf(p: IProduct): string {
  return String((p as any).category || (p as any).categorySlug || 'misc').toLowerCase();
}

/**
 * Pure: given the previous exposure counters on the session and a ranked
 * list of candidates, returns a new ordering that respects fairness caps.
 *
 * Does NOT mutate the session counters — caller updates them after the
 * page is rendered via `commitImpressions`.
 */
export function applyFairness(
  ranked: RankedProduct[],
  session: IBuyerSessionIntent | null | undefined,
  opts: FairnessOptions = {},
): RankedProduct[] {
  const cfg = { ...DEFAULTS, ...opts };
  const total = ranked.length;
  if (total <= 1) return ranked;

  const exposureBySeller = new Map<string, number>();
  if (session?.sellerExposure?.length) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h decay window
    for (const b of session.sellerExposure) {
      const last = b.lastShownAt ? new Date(b.lastShownAt).getTime() : 0;
      if (last < cutoff) continue;
      exposureBySeller.set(String(b.sellerId), Number(b.impressions) || 0);
    }
  }

  // Build seller debt: previous impressions in last 24h → demote.
  const sellerDebt = new Map<string, number>();
  for (const [sid, n] of exposureBySeller.entries()) {
    // 8+ impressions = max debt; scale 0..1.
    sellerDebt.set(sid, Math.min(1, n / 8) * cfg.exposureDebtStrength);
  }

  // Apply debt penalty to scores (non-destructively).
  const adjusted = ranked.map((r) => {
    const sid = sellerOf(r.product as any);
    const debt = sellerDebt.get(sid) || 0;
    return debt > 0
      ? {
          ...r,
          score: r.score * (1 - debt),
          reasons: [...r.reasons, `fairness:debt-${(debt * 100).toFixed(0)}%`],
        }
      : r;
  });
  adjusted.sort((a, b) => b.score - a.score);

  const maxFromCategory = Math.max(1, Math.floor(total * cfg.categoryRatioCap));
  const sellerCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  const out: RankedProduct[] = [];
  const overflow: RankedProduct[] = [];

  for (const r of adjusted) {
    const sid = sellerOf(r.product as any);
    const cat = categoryOf(r.product as any);
    const sc = sellerCount.get(sid) || 0;
    const cc = categoryCount.get(cat) || 0;
    if (sc < cfg.perSellerCap && cc < maxFromCategory) {
      sellerCount.set(sid, sc + 1);
      categoryCount.set(cat, cc + 1);
      out.push(r);
    } else {
      overflow.push(r);
    }
  }

  // Overflow can still appear once the page is mostly full so we don't
  // run out of items on a thin catalog. They go to the end.
  return [...out, ...overflow];
}

/**
 * After a feed is rendered, persist the per-seller impression counters
 * back to the session document. Bounded growth: at most 200 buckets.
 */
export function commitImpressionCounters(
  session: IBuyerSessionIntent,
  shownProducts: IProduct[],
): void {
  if (!session || !shownProducts?.length) return;
  const now = new Date();
  const exposure = new Map<string, { impressions: number; lastShownAt: Date }>();
  for (const b of session.sellerExposure || []) {
    exposure.set(String(b.sellerId), {
      impressions: Number(b.impressions) || 0,
      lastShownAt: b.lastShownAt || now,
    });
  }
  for (const p of shownProducts) {
    const sid = sellerOf(p);
    const prev = exposure.get(sid) || { impressions: 0, lastShownAt: now };
    exposure.set(sid, {
      impressions: prev.impressions + 1,
      lastShownAt: now,
    });
  }
  const buckets = Array.from(exposure.entries())
    .sort((a, b) => b[1].lastShownAt.getTime() - a[1].lastShownAt.getTime())
    .slice(0, 200)
    .map(([sellerId, v]) => ({
      sellerId,
      impressions: v.impressions,
      lastShownAt: v.lastShownAt,
    }));
  session.sellerExposure = buckets as any;
  session.totalImpressions = Number(session.totalImpressions || 0) + shownProducts.length;
}
