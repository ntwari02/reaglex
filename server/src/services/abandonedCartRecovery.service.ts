import mongoose from 'mongoose';
import { getOrCreateCartStrategy } from '../models/AbandonedCartStrategy';
import { computeEngagementPattern } from './engagementLearning';
import { scheduleNextReminderAt } from './timingOptimizer';
import { getNextJourneyAction } from './recoveryJourneyEngine';
import { resolveUserTimezone } from './timezoneService';

export async function shouldSendReminderNow(params: {
  userId: string;
  abandonedAt: Date;
  remindersSent: number;
  cartTotal: number;
  primaryCategory?: string;
  user: Record<string, unknown>;
}) {
  const strategy = await getOrCreateCartStrategy();
  const rules = strategy.globalRules || ({} as any);

  if (!strategy.autoReminderEnabled) return { ok: false, reason: 'disabled' };
  if (rules.pauseReminders || rules.paymentProviderDown) {
    return { ok: false, reason: 'paused' };
  }

  const engagement = await computeEngagementPattern(params.userId);
  const maxReminders = Math.min(
    strategy.maxReminders,
    engagement.suggestedMaxReminders
  );
  if (params.remindersSent >= maxReminders) {
    return { ok: false, reason: 'max_reminders' };
  }

  const schedule = await scheduleNextReminderAt({
    abandonedAt: params.abandonedAt,
    stepIndex: params.remindersSent,
    cartTotalUsd: params.cartTotal,
    primaryCategory: params.primaryCategory,
    user: params.user,
    strategy,
  });

  if (schedule.scheduledAt.getTime() > Date.now()) {
    return {
      ok: false,
      reason: 'not_due',
      nextReminderAt: schedule.scheduledAt,
      engagement,
      schedule,
    };
  }

  const journeyAction = getNextJourneyAction(strategy.journey || { nodes: [], edges: [], conditions: [] }, {
    abandonedAt: params.abandonedAt,
    cartValue: params.cartTotal,
    primaryCategory: params.primaryCategory,
    remindersSent: params.remindersSent,
  });

  if (journeyAction?.type === 'wait') {
    return { ok: false, reason: 'journey_wait', nextReminderAt: schedule.scheduledAt, journeyAction };
  }
  if (journeyAction?.type === 'skip') {
    return { ok: false, reason: 'journey_complete' };
  }

  const tz = resolveUserTimezone(params.user as any);

  return {
    ok: true,
    strategy,
    engagement,
    schedule,
    journeyAction,
    channel: journeyAction?.type === 'coupon' ? 'email' : journeyAction?.type || 'email',
    userTimezone: tz,
    couponCode: journeyAction?.couponCode,
  };
}

export function inferPrimaryCategory(products: Array<{ category?: string }>): string | undefined {
  const counts = new Map<string, number>();
  for (const p of products) {
    const c = String(p.category || 'general').toLowerCase();
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  let best: string | undefined;
  let max = 0;
  for (const [c, n] of counts) {
    if (n > max) {
      max = n;
      best = c;
    }
  }
  return best;
}
