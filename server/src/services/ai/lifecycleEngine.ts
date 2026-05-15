/**
 * lifecycleEngine.ts — long-term buyer lifecycle state machine.
 *
 * Determines which lifecycle stage a buyer is in based on objective
 * thresholds, and exposes helpers the orchestrator can use to adapt
 * the feed plan accordingly.
 *
 * Pure rules:
 *   new       : age < 72h AND orders = 0
 *   explorer  : sessions ≥ 3, orders = 0
 *   buyer     : orders ≥ 1, orders < 3 OR spend < $150
 *   loyal     : orders ≥ 3 in last 90d
 *   vip       : orders ≥ 10 OR lifetime spend ≥ $500
 *   dormant   : last activity > 30d
 *   returning : came back from dormant (transient, decays after first event)
 *
 * Nothing here is ML — it is a deterministic ladder.
 */

import mongoose from 'mongoose';
import { BuyerLifecycle, type IBuyerLifecycle, type LifecycleState } from '../../models/BuyerLifecycle';
import { BuyerInsightProfile } from '../../models/BuyerInsightProfile';
import { User } from '../../models/User';
import { Order } from '../../models/Order';

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

interface LifecycleInputs {
  signupAt?: Date;
  sessionCount: number;
  orderCount: number;
  paidOrderCount90d: number;
  totalSpendUsd: number;
  lastActivityAt?: Date;
  previousState?: LifecycleState;
}

/** Pure: derive the lifecycle state from raw inputs. */
export function deriveLifecycleState(inp: LifecycleInputs): LifecycleState {
  const now = Date.now();
  const ageHours = inp.signupAt ? (now - inp.signupAt.getTime()) / HOURS : 9999;
  const daysSinceActivity = inp.lastActivityAt
    ? (now - inp.lastActivityAt.getTime()) / DAYS
    : 9999;

  // Dormancy beats everything else if no activity in a month.
  if (daysSinceActivity > 30 && inp.previousState !== 'dormant') {
    return 'dormant';
  }
  // Returning state if we previously marked dormant and now we have activity.
  if (inp.previousState === 'dormant' && daysSinceActivity < 30) {
    return 'returning';
  }
  // VIP ladder (irreversible until dormancy resets it).
  if (inp.orderCount >= 10 || inp.totalSpendUsd >= 500) return 'vip';
  // Loyal: 3+ paid orders in last 90 days.
  if (inp.paidOrderCount90d >= 3) return 'loyal';
  // First-time buyer.
  if (inp.orderCount >= 1) return 'buyer';
  // Explorer: visited multiple times but never bought.
  if (inp.sessionCount >= 3) return 'explorer';
  // Brand-new user.
  if (ageHours <= 72) return 'new';
  // Fallback — treat as explorer.
  return 'explorer';
}

/**
 * Recompute the lifecycle doc for one user. Reads from `User`, `Order`,
 * and `BuyerInsightProfile`; writes a new transition entry only when the
 * derived state actually changes.
 */
export async function refreshLifecycle(userId: string | mongoose.Types.ObjectId): Promise<IBuyerLifecycle | null> {
  if (!mongoose.Types.ObjectId.isValid(userId as any)) return null;
  const uid = new mongoose.Types.ObjectId(userId as any);

  const [user, profile, paidOrdersAgg, recentOrders] = await Promise.all([
    User.findById(uid).select('email createdAt lastLogin').lean(),
    BuyerInsightProfile.findOne({ userId: uid }).lean(),
    Order.aggregate([
      {
        $match: {
          buyerId: uid,
          status: { $nin: ['pending', 'cancelled'] },
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
    ] as any),
    Order.find({
      buyerId: uid,
      status: { $nin: ['pending', 'cancelled'] },
      createdAt: { $gte: new Date(Date.now() - 90 * DAYS) },
    } as any)
      .select('_id createdAt total')
      .lean(),
  ]);

  if (!user) return null;

  const orderCount = (paidOrdersAgg[0]?.count as number) || 0;
  const totalSpendUsd = (paidOrdersAgg[0]?.total as number) || 0;
  const paidOrderCount90d = recentOrders.length;
  const lastPurchaseAt = recentOrders.length
    ? new Date(Math.max(...recentOrders.map((o: any) => new Date(o.createdAt).getTime())))
    : undefined;

  const lastActivityAt =
    (profile as any)?.lastActivityAt || (user as any).lastLogin || (user as any).createdAt;

  const existing = await BuyerLifecycle.findOne({ userId: uid });

  const inputs: LifecycleInputs = {
    signupAt: (user as any).createdAt,
    sessionCount: Math.max(existing?.sessionCount || 0, (profile as any)?.sessionCount || 0),
    orderCount,
    paidOrderCount90d,
    totalSpendUsd,
    lastActivityAt,
    previousState: existing?.state,
  };
  const nextState = deriveLifecycleState(inputs);
  const transitioned = !existing || existing.state !== nextState;

  const now = new Date();
  if (!existing) {
    return BuyerLifecycle.create({
      userId: uid,
      email: (user as any).email,
      state: nextState,
      stateSetAt: now,
      history: [{ to: nextState, at: now, reason: 'initial' }],
      sessionCount: inputs.sessionCount,
      orderCount,
      totalSpendUsd,
      lastActivityAt,
      lastPurchaseAt,
      dormantSince: nextState === 'dormant' ? now : undefined,
    });
  }

  existing.email = (user as any).email || existing.email;
  existing.sessionCount = inputs.sessionCount;
  existing.orderCount = orderCount;
  existing.totalSpendUsd = totalSpendUsd;
  if (lastActivityAt) existing.lastActivityAt = lastActivityAt;
  if (lastPurchaseAt) existing.lastPurchaseAt = lastPurchaseAt;

  if (transitioned) {
    existing.previousState = existing.state;
    existing.state = nextState;
    existing.stateSetAt = now;
    if (nextState === 'dormant') existing.dormantSince = now;
    else if (existing.previousState === 'dormant') existing.dormantSince = undefined;
    existing.history.push({
      from: existing.previousState,
      to: nextState,
      at: now,
      reason: 'auto',
    });
    if (existing.history.length > 10) {
      existing.history = existing.history.slice(-10);
    }
  }

  await existing.save();
  return existing;
}

/**
 * Fast read used by the orchestrator on every feed request.
 * Returns null for anonymous sessions.
 */
export async function getLifecycle(userId?: string | null): Promise<IBuyerLifecycle | null> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return BuyerLifecycle.findOne({ userId }).lean() as any;
}

/**
 * Periodic worker hook: refresh up to N most-active users since the last
 * tick. We do not refresh the entire user table on a hot loop.
 */
export async function refreshActiveLifecycles(limit = 200): Promise<number> {
  const recent = await BuyerInsightProfile.find({
    lastActivityAt: { $gte: new Date(Date.now() - 7 * DAYS) },
  } as any)
    .sort({ lastActivityAt: -1 })
    .select('userId')
    .limit(limit)
    .lean();
  let updated = 0;
  for (const r of recent) {
    try {
      await refreshLifecycle(String((r as any).userId));
      updated++;
    } catch {
      /* ignore individual failures */
    }
  }
  return updated;
}

/**
 * Translate the lifecycle state into homepage emphasis hints. The
 * orchestrator merges these with the intent-driven hints from
 * `homepageOrchestrator.planHomepage`.
 */
export function lifecycleEmphasis(state: LifecycleState): {
  sectionBoost: Record<string, number>;
  reasons: string[];
} {
  switch (state) {
    case 'new':
      return {
        sectionBoost: { trending: 1.3, bestsellers: 1.2, deals: 1.1 },
        reasons: ['lifecycle=new:popular-first'],
      };
    case 'explorer':
      return {
        sectionBoost: { inspired: 1.4, foryou: 1.15, fresh: 1.1 },
        reasons: ['lifecycle=explorer:exploration-tilt'],
      };
    case 'buyer':
      return {
        sectionBoost: { foryou: 1.2, bestsellers: 1.1 },
        reasons: ['lifecycle=buyer:repeat-purchase-hint'],
      };
    case 'loyal':
      return {
        sectionBoost: { foryou: 1.3, fresh: 1.15, near_you: 1.1 },
        reasons: ['lifecycle=loyal:retention-priority'],
      };
    case 'vip':
      return {
        sectionBoost: { foryou: 1.4, fresh: 1.2, bestsellers: 1.15 },
        reasons: ['lifecycle=vip:premium-curation'],
      };
    case 'dormant':
      return {
        sectionBoost: { deals: 1.4, trending: 1.2, hero: 1.1 },
        reasons: ['lifecycle=dormant:winback-via-deals'],
      };
    case 'returning':
      return {
        sectionBoost: { foryou: 1.25, fresh: 1.2, trending: 1.1 },
        reasons: ['lifecycle=returning:welcome-back'],
      };
    default:
      return { sectionBoost: {}, reasons: [] };
  }
}
