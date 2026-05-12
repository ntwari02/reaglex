/**
 * ruleEffectivenessTracker.ts — closed-loop feedback for rules.
 *
 * Every time a rule (event rule, orchestrator boost, sponsored, fairness)
 * "fires" on the user-facing path, callers can record:
 *
 *   - rule fired (impression)
 *   - downstream click attributed to that rule
 *   - downstream conversion attributed to that rule
 *   - downstream refund attributed to that rule
 *
 * The tracker maintains rolling totals on the `RuleEffectiveness` doc,
 * periodically recomputes derived metrics (CTR, conversion, effectiveness
 * score vs marketplace baseline), and **dampens or silences** rules that
 * consistently produce negative outcomes.
 *
 * Pure deterministic: no model training, just averages.
 */

import { RuleEffectiveness, type IRuleEffectiveness, type RuleSource } from '../../models/RuleEffectiveness';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Fast in-memory cache of dampening multipliers. */
let dampingMap: Map<string, { dampening: number; silenced: boolean }> | null = null;
let dampingCachedAt = 0;
const DAMPING_CACHE_MS = 30_000;

async function loadDampingMap(): Promise<Map<string, { dampening: number; silenced: boolean }>> {
  if (dampingMap && Date.now() - dampingCachedAt < DAMPING_CACHE_MS) return dampingMap;
  const docs = await RuleEffectiveness.find({}, 'ruleId dampening silenced').lean();
  dampingMap = new Map(
    docs.map((d: any) => [String(d.ruleId), { dampening: Number(d.dampening) || 0, silenced: !!d.silenced }]),
  );
  dampingCachedAt = Date.now();
  return dampingMap;
}

export function invalidateRuleDampingCache(): void {
  dampingMap = null;
}

/**
 * Return the live dampening for a rule (0 = full strength, 1 = silenced).
 * Callers multiply their effect by `1 - dampening` to honour the
 * stability controller's decisions.
 */
export async function getRuleDamping(ruleId: string): Promise<{ dampening: number; silenced: boolean }> {
  const map = await loadDampingMap();
  return map.get(ruleId) || { dampening: 0, silenced: false };
}

/**
 * Synchronous version: returns 0 if the cache is cold. Use the async
 * variant in cold paths and this one in tight hot loops (ranker).
 */
export function getRuleDampingSync(ruleId: string): { dampening: number; silenced: boolean } {
  if (!dampingMap) return { dampening: 0, silenced: false };
  return dampingMap.get(ruleId) || { dampening: 0, silenced: false };
}

/** Record a rule firing (impression). */
export async function recordRuleImpression(
  ruleId: string,
  count = 1,
  meta?: { source?: RuleSource; description?: string },
): Promise<void> {
  await RuleEffectiveness.updateOne(
    { ruleId },
    {
      $inc: { impressions: count },
      $set: {
        lastFiredAt: new Date(),
        ...(meta?.source && { source: meta.source }),
        ...(meta?.description && { description: meta.description }),
      },
      $setOnInsert: { ruleId, recomputedAt: new Date() },
    },
    { upsert: true },
  );
}

/** Record an attributed click. */
export async function recordRuleClick(ruleId: string, count = 1): Promise<void> {
  await RuleEffectiveness.updateOne({ ruleId }, { $inc: { clicks: count } }, { upsert: true });
}

/** Record an attributed conversion + revenue. */
export async function recordRuleConversion(ruleId: string, revenueUsd = 0): Promise<void> {
  await RuleEffectiveness.updateOne(
    { ruleId },
    { $inc: { purchases: 1, revenueUsd, cartAdds: 1 } },
    { upsert: true },
  );
}

/** Record an attributed refund (negative outcome). */
export async function recordRuleRefund(ruleId: string): Promise<void> {
  await RuleEffectiveness.updateOne({ ruleId }, { $inc: { refunds: 1 } }, { upsert: true });
}

/**
 * Pure: score how good a rule is doing vs marketplace baseline.
 *
 * Range: -1 .. +1
 *   +1 = far better than baseline
 *   -1 = far worse than baseline
 */
export function effectivenessScoreFor(row: IRuleEffectiveness, baselineCtr: number, baselineConv: number): number {
  if (row.impressions < 50) return 0; // not enough data
  const ctrDelta = baselineCtr > 0 ? (row.ctr - baselineCtr) / baselineCtr : 0;
  const convDelta = baselineConv > 0 ? (row.conversionRate - baselineConv) / baselineConv : 0;
  const refundPenalty = clamp(row.refundRate * 5, 0, 1.5);
  const score = clamp(0.6 * convDelta + 0.4 * ctrDelta - 0.5 * refundPenalty, -1, 1);
  return Number(score.toFixed(3));
}

/** Pure: derive dampening multiplier from effectiveness. */
export function dampingFromScore(score: number): { dampening: number; silenced: boolean } {
  if (score <= -0.7) return { dampening: 1, silenced: true };
  if (score <= -0.4) return { dampening: 0.7, silenced: false };
  if (score <= -0.15) return { dampening: 0.4, silenced: false };
  if (score >= 0.4) return { dampening: 0, silenced: false }; // perform fine, no damping
  return { dampening: 0, silenced: false };
}

/**
 * Periodic recompute: walk all rules, compute baselines, and update
 * dampening + silenced fields. Called by the marketplace AI worker.
 */
export async function recomputeRuleEffectiveness(): Promise<number> {
  const rules = await RuleEffectiveness.find({});
  if (rules.length === 0) return 0;

  // Marketplace baseline = volume-weighted average of all rules.
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCartAdds = 0;
  let totalPurchases = 0;
  for (const r of rules) {
    totalImpressions += r.impressions;
    totalClicks += r.clicks;
    totalCartAdds += r.cartAdds;
    totalPurchases += r.purchases;
  }
  const baselineCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const baselineConv = totalClicks > 0 ? totalPurchases / totalClicks : 0;

  for (const r of rules) {
    r.ctr = r.impressions > 0 ? Number((r.clicks / r.impressions).toFixed(4)) : 0;
    r.conversionRate = r.clicks > 0 ? Number((r.purchases / r.clicks).toFixed(4)) : 0;
    r.refundRate = r.purchases > 0 ? Number((r.refunds / r.purchases).toFixed(4)) : 0;
    r.baselineCtr = Number(baselineCtr.toFixed(4));
    r.baselineConversion = Number(baselineConv.toFixed(4));
    r.effectivenessScore = effectivenessScoreFor(r, baselineCtr, baselineConv);
    const d = dampingFromScore(r.effectivenessScore);
    r.dampening = d.dampening;
    r.silenced = d.silenced;
    r.recomputedAt = new Date();
    await r.save();
  }
  invalidateRuleDampingCache();
  return rules.length;
}

/** Convenience: list silenced or strongly-damped rules for the admin panel. */
export async function listTroubledRules(limit = 50): Promise<IRuleEffectiveness[]> {
  return RuleEffectiveness.find({ $or: [{ silenced: true }, { dampening: { $gte: 0.4 } }] })
    .sort({ effectivenessScore: 1 })
    .limit(limit)
    .lean() as any;
}

/** Reset a rule's stats (admin override). */
export async function resetRule(ruleId: string): Promise<void> {
  await RuleEffectiveness.updateOne(
    { ruleId },
    {
      $set: {
        impressions: 0,
        clicks: 0,
        cartAdds: 0,
        purchases: 0,
        refunds: 0,
        revenueUsd: 0,
        ctr: 0,
        conversionRate: 0,
        refundRate: 0,
        effectivenessScore: 0,
        dampening: 0,
        silenced: false,
        recomputedAt: new Date(),
      },
    },
  );
  invalidateRuleDampingCache();
}
