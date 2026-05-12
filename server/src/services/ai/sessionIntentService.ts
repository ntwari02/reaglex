/**
 * sessionIntentService.ts — live session-intent capture.
 *
 * Every time the buyer interacts (search, view, click, dwell), we update
 * the `BuyerSessionIntent` document so the next feed request reacts
 * within seconds. Designed to be cheap (one upsert per event).
 */

import mongoose from 'mongoose';
import { BuyerSessionIntent } from '../../models/BuyerSessionIntent';
import { RecommendationActivity } from '../../models/RecommendationActivity';
import { Product } from '../../models/Product';
import { BuyerInsightProfile } from '../../models/BuyerInsightProfile';
import { processEvent, type EngineEvent } from './eventRuleEngine';

export type BehaviorEvent =
  | { type: 'search'; query: string }
  | { type: 'view'; productId: string }
  | { type: 'click'; productId: string; placement?: string }
  | { type: 'hover'; productId: string; dwellMs: number }
  | { type: 'scroll'; speed: 'fast' | 'medium' | 'slow' }
  | { type: 'cart_add'; productId: string }
  | { type: 'wishlist_add'; productId: string };

export interface TrackInput {
  sessionId: string;
  userId?: string;
  event: BehaviorEvent;
  context?: {
    device?: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    country?: string;
    city?: string;
    timezoneOffsetMin?: number;
    localHour?: number;
    ip?: string;
    userAgent?: string;
  };
}

const RECENT_CAP = 12;

function pushUnique<T>(arr: T[] | undefined, value: T, cap: number): T[] {
  const list = Array.isArray(arr) ? arr.slice() : [];
  const idx = list.indexOf(value);
  if (idx >= 0) list.splice(idx, 1);
  list.unshift(value);
  return list.slice(0, cap);
}

async function categoryAndTagsFor(productId: string): Promise<{ category?: string; tags?: string[] }> {
  if (!mongoose.Types.ObjectId.isValid(productId)) return {};
  try {
    const p: any = await Product.findById(productId).select('category categorySlug tags').lean();
    return { category: p?.category || p?.categorySlug, tags: p?.tags };
  } catch {
    return {};
  }
}

function mapToRuleEvent(ev: BehaviorEvent): EngineEvent | null {
  switch (ev.type) {
    case 'view':
      return { type: 'view', productId: ev.productId } as EngineEvent;
    case 'click':
      return { type: 'click', productId: ev.productId } as EngineEvent;
    case 'hover':
      return { type: 'hover', productId: ev.productId, dwellMs: ev.dwellMs } as EngineEvent;
    case 'cart_add':
      return { type: 'cart_add', productId: ev.productId } as EngineEvent;
    case 'wishlist_add':
      return { type: 'wishlist_add', productId: ev.productId } as EngineEvent;
    case 'search':
      return { type: 'search', query: ev.query } as EngineEvent;
    case 'scroll':
      return { type: 'scroll', speed: ev.speed } as EngineEvent;
    default:
      return null;
  }
}

function deriveMoods(
  existing: { dealMood?: number; premiumMood?: number; exploreMood?: number },
  event: BehaviorEvent,
): { dealMood: number; premiumMood: number; exploreMood: number } {
  let deal = Number(existing.dealMood) || 0;
  let premium = Number(existing.premiumMood) || 0;
  let explore = Number(existing.exploreMood) || 0;

  // Exponential decay (10% per event) so the mood reflects "right now".
  deal *= 0.9;
  premium *= 0.9;
  explore *= 0.9;

  if (event.type === 'search') {
    const q = event.query.toLowerCase();
    if (/deal|discount|sale|cheap|under/.test(q)) deal += 0.4;
    if (/premium|luxury|pro|gold|elite/.test(q)) premium += 0.4;
    explore += 0.15;
  } else if (event.type === 'view') {
    explore += 0.05;
  } else if (event.type === 'cart_add' || event.type === 'wishlist_add') {
    // Focused buying → exploration mood drops.
    explore *= 0.7;
  }

  return {
    dealMood: Math.max(0, Math.min(1, deal)),
    premiumMood: Math.max(0, Math.min(1, premium)),
    exploreMood: Math.max(0, Math.min(1, explore)),
  };
}

export async function trackBehavior(input: TrackInput): Promise<void> {
  const { sessionId, userId, event, context = {} } = input;
  if (!sessionId) return;

  const existing = await BuyerSessionIntent.findOne({ sessionId }).lean();
  const moods = deriveMoods(existing as any, event);

  const $set: any = {
    ...(userId && mongoose.Types.ObjectId.isValid(userId)
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : {}),
    device: context.device || (existing as any)?.device || 'unknown',
    country: context.country || (existing as any)?.country,
    city: context.city || (existing as any)?.city,
    timezoneOffsetMin: context.timezoneOffsetMin ?? (existing as any)?.timezoneOffsetMin,
    localHour: context.localHour ?? (existing as any)?.localHour,
    dealMood: moods.dealMood,
    premiumMood: moods.premiumMood,
    exploreMood: moods.exploreMood,
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
  };
  const $setOnInsert: any = { sessionId };

  let categoryHits: string[] | null = null;
  let tagHits: string[] | null = null;

  if (event.type === 'search') {
    $set.recentSearches = pushUnique(
      (existing as any)?.recentSearches,
      event.query.trim().slice(0, 60),
      RECENT_CAP,
    );
  } else if (
    event.type === 'view' ||
    event.type === 'click' ||
    event.type === 'cart_add' ||
    event.type === 'wishlist_add'
  ) {
    $set.recentProductIds = pushUnique(
      (existing as any)?.recentProductIds,
      String(event.productId),
      RECENT_CAP,
    );
    const { category, tags } = await categoryAndTagsFor(event.productId);
    if (category) {
      $set.recentCategories = pushUnique((existing as any)?.recentCategories, category, 8);
      categoryHits = [category];
    }
    if (tags?.length) {
      let updated = ((existing as any)?.recentTags || []) as string[];
      for (const t of tags.slice(0, 4)) updated = pushUnique(updated, t, 16);
      $set.recentTags = updated;
      tagHits = tags;
    }
  } else if (event.type === 'scroll') {
    $set.scrollPattern = event.speed;
  } else if (event.type === 'hover') {
    const prev = Number((existing as any)?.avgDwellSec) || 0;
    const next = Math.max(0, event.dwellMs / 1000);
    $set.avgDwellSec = prev > 0 ? prev * 0.7 + next * 0.3 : next;
  }

  await BuyerSessionIntent.updateOne(
    { sessionId },
    { $set, $setOnInsert },
    { upsert: true },
  );

  // Push the same event through the rule engine so all deterministic
  // rules fire (intent reclassification, co-occurrence, fairness, etc.).
  // Fire-and-forget — never block the beacon path on rule failures.
  try {
    const ruleEvent = mapToRuleEvent(event);
    if (ruleEvent) {
      await processEvent(ruleEvent, {
        sessionId,
        userId,
        ip: context.ip,
        userAgent: context.userAgent,
        device: context.device,
      });
    }
  } catch (err) {
    console.error('[session-intent] rule engine failed', err);
  }

  // Best-effort: persist to long-term RecommendationActivity log so the
  // batch trend / signal workers can pick this up later.
  if (
    userId &&
    mongoose.Types.ObjectId.isValid(userId) &&
    (event.type === 'view' || event.type === 'cart_add' || event.type === 'wishlist_add')
  ) {
    try {
      const map: Record<string, string> = {
        view: 'product_view',
        cart_add: 'cart_add',
        wishlist_add: 'wishlist_add',
      };
      await RecommendationActivity.create({
        userId: new mongoose.Types.ObjectId(userId),
        eventType: map[event.type] as any,
        productId: new mongoose.Types.ObjectId((event as any).productId),
        category: categoryHits?.[0],
        tags: tagHits || [],
        meta: { device: context.device, country: context.country, ip: context.ip },
      });
    } catch {
      /* ignore */
    }

    // Bump category affinity on the long-term profile so the next session
    // also benefits.
    try {
      if (categoryHits?.[0]) {
        const inc =
          event.type === 'wishlist_add' ? 5 : event.type === 'cart_add' ? 5 : 2;
        await BuyerInsightProfile.updateOne(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $inc: { [`categoryAffinity.${categoryHits[0]}`]: inc },
            $set: { lastActivityAt: new Date() },
          },
          { upsert: false },
        );
      }
    } catch {
      /* ignore */
    }
  }
}
