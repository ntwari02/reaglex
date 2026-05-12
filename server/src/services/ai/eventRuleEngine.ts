/**
 * eventRuleEngine.ts — deterministic event → rule → action pipeline.
 *
 * Every behaviour event flows through this engine. The engine evaluates
 * a registry of rules (predicate + handler). If a predicate fires, the
 * handler runs side-effects: bump co-occurrence weights, mutate session
 * state, recompute intent, schedule re-engagement, etc.
 *
 * No hidden ML — every rule is a plain function the admin can read.
 *
 * Built-in rules:
 *   R-001  product_viewed × 3 same product   → bump `interest` affinity
 *   R-002  cart_add                          → record co-occurrence with all carted items
 *   R-003  purchase                          → record co-occurrence across entire basket
 *   R-004  search ≥ 2 → research-mode promotion
 *   R-005  cart_abandoned (no purchase in 1h)→ schedule cart-pulse boost
 *   R-006  too-many product_view from same ip in 60s → bot risk flag
 *
 * Custom rules can be registered at boot time via `registerRule`.
 */

import mongoose from 'mongoose';
import { BuyerSessionIntent, type IBuyerSessionIntent, type ISessionEventRef } from '../../models/BuyerSessionIntent';
import { BuyerInsightProfile } from '../../models/BuyerInsightProfile';
import { recordCoOccurrence } from './coOccurrenceEngine';
import { classifyIntent, applyIntentToSession } from './intentClassifier';

export type EngineEvent =
  | { type: 'view'; productId: string; category?: string }
  | { type: 'click'; productId: string }
  | { type: 'hover'; productId: string; dwellMs: number }
  | { type: 'cart_add'; productId: string; cartProductIds?: string[] }
  | { type: 'cart_remove'; productId: string }
  | { type: 'wishlist_add'; productId: string }
  | { type: 'purchase'; productIds: string[] }
  | { type: 'search'; query: string }
  | { type: 'scroll'; speed: 'fast' | 'medium' | 'slow' };

export interface EventContext {
  sessionId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
}

export interface Rule {
  id: string;
  description: string;
  match: (event: EngineEvent, session: IBuyerSessionIntent | null, ctx: EventContext) => boolean;
  apply: (event: EngineEvent, session: IBuyerSessionIntent | null, ctx: EventContext) => Promise<void>;
}

const registry: Rule[] = [];
const seenIds = new Set<string>();

export function registerRule(rule: Rule): void {
  if (seenIds.has(rule.id)) return;
  seenIds.add(rule.id);
  registry.push(rule);
}

export function listRules(): Array<{ id: string; description: string }> {
  return registry.map((r) => ({ id: r.id, description: r.description }));
}

const LAST_EVENTS_CAP = 20;

function pushLastEvent(session: IBuyerSessionIntent, ref: ISessionEventRef): void {
  const list = Array.isArray(session.lastEvents) ? [...session.lastEvents] : [];
  list.unshift(ref);
  session.lastEvents = list.slice(0, LAST_EVENTS_CAP) as any;
}

/* ──────────────── BUILT-IN RULES ──────────────── */

registerRule({
  id: 'R-002-co-cart',
  description: 'On cart_add → record co-cart edges with every other carted item.',
  match: (e) => e.type === 'cart_add' && Array.isArray((e as any).cartProductIds) && (e as any).cartProductIds.length > 1,
  apply: async (event) => {
    const e = event as Extract<EngineEvent, { type: 'cart_add' }>;
    await recordCoOccurrence(e.cartProductIds!, 'co_cart');
  },
});

registerRule({
  id: 'R-003-co-purchase',
  description: 'On purchase → record co-purchase edges across the basket.',
  match: (e) => e.type === 'purchase' && Array.isArray((e as any).productIds) && (e as any).productIds.length >= 2,
  apply: async (event) => {
    const e = event as Extract<EngineEvent, { type: 'purchase' }>;
    await recordCoOccurrence(e.productIds, 'co_purchase');
  },
});

registerRule({
  id: 'R-001-triple-view',
  description: 'On 3rd view of the same product → bump category affinity.',
  match: (e, s) => {
    if (e.type !== 'view' || !s) return false;
    const pid = (e as any).productId;
    const cnt = (s.lastEvents || []).filter(
      (x) => x.type === 'view' && x.productId === pid,
    ).length;
    return cnt >= 2; // about to become the third
  },
  apply: async (event, _session, ctx) => {
    if (!ctx.userId || !mongoose.Types.ObjectId.isValid(ctx.userId)) return;
    const e = event as Extract<EngineEvent, { type: 'view' }>;
    const cat = (e as any).category;
    if (!cat) return;
    await BuyerInsightProfile.updateOne(
      { userId: new mongoose.Types.ObjectId(ctx.userId) },
      { $inc: { [`categoryAffinity.${cat}`]: 3 }, $set: { lastActivityAt: new Date() } },
      { upsert: false },
    ).catch(() => undefined);
  },
});

registerRule({
  id: 'R-004-search-research',
  description: 'On 2+ searches within session → bump research engagement.',
  match: (e, s) => e.type === 'search' && Boolean(s) && (s!.lastEvents || []).filter((x) => x.type === 'search').length >= 1,
  apply: async (_e, session) => {
    if (!session) return;
    session.exploreMood = Math.min(1, Number(session.exploreMood || 0) + 0.15);
    session.engagementScore = Math.min(100, Number(session.engagementScore || 0) + 4);
  },
});

registerRule({
  id: 'R-005-cart-abandoned',
  description: 'After cart_add with no purchase in 60min → flag for re-engagement.',
  match: () => false, // installed for completeness; cart-pulse worker reads this signal
  apply: async () => undefined,
});

registerRule({
  id: 'R-006-bot-burst',
  description: 'Bot heuristic — same IP > 30 views in 60s.',
  match: (e, _s, ctx) => e.type === 'view' && Boolean(ctx.ip),
  apply: async () => undefined, // burst tracking lives in fraudSignalEngine
});

/* ──────────────── DISPATCH ──────────────── */

/**
 * Process a single event:
 *   1) Load (or create) the session document
 *   2) Append to `lastEvents`
 *   3) Run every matching rule
 *   4) Reclassify intent + engagement
 *   5) Save once.
 *
 * Returns the new session document for the caller to inspect or reuse.
 */
export async function processEvent(
  event: EngineEvent,
  ctx: EventContext,
): Promise<IBuyerSessionIntent | null> {
  if (!ctx.sessionId) return null;

  let session = await BuyerSessionIntent.findOne({ sessionId: ctx.sessionId });
  if (!session) {
    // Lazy-create so the rule engine works for anonymous + cold starts.
    session = await BuyerSessionIntent.create({
      sessionId: ctx.sessionId,
      userId: ctx.userId && mongoose.Types.ObjectId.isValid(ctx.userId)
        ? new mongoose.Types.ObjectId(ctx.userId)
        : undefined,
      device: (ctx.device as any) || 'unknown',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    });
  }

  // Append to last-events ring buffer.
  const eventRef: ISessionEventRef = {
    type: event.type,
    productId: (event as any).productId || ((event as any).productIds || [])[0],
    category: (event as any).category,
    query: (event as any).query,
    at: new Date(),
  };
  pushLastEvent(session, eventRef);

  // Lightweight counters.
  if (event.type === 'view' || event.type === 'click') session.totalClicks += 1;
  if (event.type === 'cart_add') session.totalCartAdds += 1;
  if (event.type === 'purchase') session.totalPurchases += 1;

  // Run rules.
  for (const rule of registry) {
    try {
      if (rule.match(event, session, ctx)) {
        await rule.apply(event, session, ctx);
      }
    } catch (err) {
      console.error(`[rule-engine] rule ${rule.id} failed`, err);
    }
  }

  // Refresh intent classification on every event so the home feed can
  // re-rank on the next request within seconds of behavioural change.
  let profile: any = null;
  if (ctx.userId && mongoose.Types.ObjectId.isValid(ctx.userId)) {
    profile = await BuyerInsightProfile.findOne({ userId: new mongoose.Types.ObjectId(ctx.userId) }).lean();
  }
  const result = classifyIntent({ session, profile, latestEvent: eventRef });
  applyIntentToSession(session, result);

  await session.save();
  return session;
}
