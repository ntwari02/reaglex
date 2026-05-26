import mongoose from 'mongoose';
import { AbandonedCart, IAbandonedCartTimelineEvent } from '../models/AbandonedCart';
import {
  getOrCreateCartSettings,
  settingsToClient,
  type DelayUnit,
  type ICartSettingsClient,
  type IRecoveryStepConfig,
} from '../models/AbandonedCartSettings';
import { AbandonedCartQueue } from '../models/AbandonedCartQueue';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { User } from '../models/User';
import { scheduleNextReminderAt } from './timingOptimizer';
import { getOrCreateCartStrategy } from '../models/AbandonedCartStrategy';
import { computeEngagementPattern } from './engagementLearning';
import { websocketService } from './websocketService';
import { assertBuyerMarketingEligible } from './marketingRecipient.service';

export function delayToMs(value: number, unit: string): number {
  const u = String(unit || 'minute').toLowerCase();
  const v = Math.max(1, Number(value) || 1);
  if (u.startsWith('hour')) return v * 60 * 60 * 1000;
  if (u.startsWith('day')) return v * 24 * 60 * 60 * 1000;
  return v * 60 * 1000;
}

export function parseCooldownMs(period: string): number {
  const raw = String(period || '24h').trim().toLowerCase();
  const m = raw.match(/^(\d+)\s*(h|hr|hour|hours|m|min|minute|minutes|d|day|days)?$/);
  if (!m) return 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2] || 'h';
  if (u.startsWith('d')) return n * 86400000;
  if (u.startsWith('h')) return n * 3600000;
  return n * 60000;
}

function stepDelayMs(
  step: IRecoveryStepConfig,
  fallback: { delayValue: number; delayUnit: DelayUnit | string }
) {
  return delayToMs(step.delayValue ?? fallback.delayValue, step.delayUnit ?? fallback.delayUnit);
}

export function getStepConfig(settings: ICartSettingsClient, stepIndex: number): IRecoveryStepConfig {
  const steps = settings.recoverySteps || [];
  const stepNum = stepIndex + 1;
  const found = steps.find((s: IRecoveryStepConfig) => s.step === stepNum);
  if (found) return found;
  return {
    step: stepNum,
    delayValue: settings.delayValue,
    delayUnit: settings.delayUnit as DelayUnit,
    label: `Reminder ${stepNum}`,
    template: stepNum === 1 ? 'waiting' : stepNum === 2 ? 'low_stock' : 'discount',
    channel: 'email',
  };
}

export async function appendTimeline(
  cartId: mongoose.Types.ObjectId | string,
  event: IAbandonedCartTimelineEvent['event'],
  meta?: Record<string, unknown>
) {
  await AbandonedCart.updateOne(
    { _id: cartId },
    { $push: { timeline: { event, at: new Date(), meta } } }
  );
}

export async function emitRecoveryEvent(
  event: 'cart.abandoned' | 'recovery.scheduled' | 'email.sent' | 'cart.recovered',
  payload: Record<string, unknown>
) {
  websocketService.emitCartRecoveryEvent(event, payload);
}

/** Cancel all unsent queue jobs — used when admin disables or changes timing. */
export async function cancelPendingQueueJobs(reason: string, cartId?: string) {
  const filter: Record<string, unknown> = {
    status: 'PENDING',
    cancelled: false,
    completed: false,
  };
  if (cartId) filter.cartId = new mongoose.Types.ObjectId(cartId);

  const result = await AbandonedCartQueue.updateMany(filter, {
    $set: {
      status: 'CANCELLED',
      cancelled: true,
      cancelReason: reason,
    },
  });

  if (cartId) {
    await appendTimeline(cartId, 'cancelled', { reason });
  }

  return result.modifiedCount;
}

export async function computeScheduledSendAt(params: {
  lastCartActivityAt: Date;
  stepIndex: number;
  cartTotal: number;
  primaryCategory?: string;
  user?: Record<string, unknown>;
}): Promise<{ scheduledSendAt: Date; aiSuggestedSendAt?: Date; delayMinutes: number }> {
  const settings = settingsToClient(await getOrCreateCartSettings());
  const step = getStepConfig(settings, params.stepIndex);
  const baseDelayMs = stepDelayMs(step, { delayValue: settings.delayValue, delayUnit: settings.delayUnit as DelayUnit });

  let scheduledSendAt = new Date(params.lastCartActivityAt.getTime() + baseDelayMs);
  let aiSuggestedSendAt: Date | undefined;
  let delayMinutes = Math.round(baseDelayMs / 60000);

  if (settings.smartMode && settings.aiOptimizationEnabled) {
    const strategy = await getOrCreateCartStrategy();
    const bridged = strategy as any;
    bridged.mode = 'smart';
    bridged.enableSmartTiming = true;
    bridged.recoverySteps = (settings.recoverySteps || []).map((s: IRecoveryStepConfig, i: number) => ({
      step: s.step || i + 1,
      channel: s.channel || 'email',
      delayMinutes: Math.round(
        stepDelayMs(s, {
          delayValue: settings.delayValue,
          delayUnit: settings.delayUnit,
        }) / 60000
      ),
      label: s.label,
    }));
    bridged.quietHours = settings.quietHours;
    bridged.timezoneMode = settings.timezoneMode;

    const schedule = await scheduleNextReminderAt({
      abandonedAt: params.lastCartActivityAt,
      stepIndex: params.stepIndex,
      cartTotalUsd: params.cartTotal,
      primaryCategory: params.primaryCategory,
      user: params.user,
      strategy: bridged,
    });
    scheduledSendAt = schedule.scheduledAt;
    aiSuggestedSendAt = schedule.scheduledAt;
    delayMinutes = schedule.delayMinutes;
  } else if (settings.quietHours?.enabled) {
    const { applyQuietHours } = await import('./quietHoursService');
    const { resolveUserTimezone } = await import('./timezoneService');
    const tz = settings.timezoneMode === 'utc' ? 'UTC' : resolveUserTimezone(params.user as any);
    const quiet = applyQuietHours({
      at: scheduledSendAt,
      timeZone: tz,
      quietHours: settings.quietHours,
    });
    scheduledSendAt = quiet.scheduledAt;
  }

  if (scheduledSendAt.getTime() < Date.now()) {
    scheduledSendAt = new Date(Date.now() + 60 * 1000);
  }

  return { scheduledSendAt, aiSuggestedSendAt, delayMinutes };
}

export async function enqueueReminder(params: {
  userId: string;
  cartId: string;
  reminderStep: number;
  lastCartActivityAt: Date;
  cartTotal: number;
  primaryCategory?: string;
  user?: Record<string, unknown>;
}): Promise<{ queued: boolean; scheduledSendAt?: Date; reason?: string }> {
  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled || settings.globalPause) {
    return { queued: false, reason: 'disabled' };
  }
  if (params.reminderStep > settings.maxReminders) {
    return { queued: false, reason: 'max_reminders' };
  }

  const existing = await AbandonedCartQueue.findOne({
    cartId: new mongoose.Types.ObjectId(params.cartId),
    reminderStep: params.reminderStep,
    status: 'PENDING',
    cancelled: false,
    completed: false,
  }).lean();
  if (existing) return { queued: false, reason: 'already_queued', scheduledSendAt: existing.scheduledSendAt };

  const cartDoc = await AbandonedCart.findById(params.cartId).select('reminderLog').lean();
  const lastSent = (cartDoc?.reminderLog || []).slice(-1)[0]?.sentAt;
  const cooldownMs = parseCooldownMs(settings.cooldownPeriod);

  let { scheduledSendAt, aiSuggestedSendAt } = await computeScheduledSendAt({
    lastCartActivityAt: params.lastCartActivityAt,
    stepIndex: params.reminderStep - 1,
    cartTotal: params.cartTotal,
    primaryCategory: params.primaryCategory,
    user: params.user,
  });

  if (lastSent && params.reminderStep > 1) {
    const minAt = new Date(new Date(lastSent).getTime() + cooldownMs);
    if (scheduledSendAt.getTime() < minAt.getTime()) scheduledSendAt = minAt;
  }

  const step = getStepConfig(settings, params.reminderStep - 1);
  await AbandonedCartQueue.create({
    userId: new mongoose.Types.ObjectId(params.userId),
    cartId: new mongoose.Types.ObjectId(params.cartId),
    reminderStep: params.reminderStep,
    status: 'PENDING',
    scheduledSendAt,
    attemptCount: 0,
    cancelled: false,
    completed: false,
    subject: step.label,
    template: step.template,
  });

  await AbandonedCart.updateOne(
    { _id: params.cartId },
    { $set: { aiSuggestedSendAt, lastCartActivityAt: params.lastCartActivityAt } }
  );
  await appendTimeline(params.cartId, 'reminder_scheduled', {
    step: params.reminderStep,
    scheduledSendAt,
  });

  void emitRecoveryEvent('recovery.scheduled', {
    cartId: params.cartId,
    userId: params.userId,
    step: params.reminderStep,
    scheduledSendAt,
  });

  return { queued: true, scheduledSendAt };
}

/** After admin saves settings: cancel future jobs and rebuild schedules for active carts. */
export async function regenerateQueueFromSettings(): Promise<{ cancelled: number; rescheduled: number }> {
  const cancelled = await cancelPendingQueueJobs('settings_changed');

  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled) {
    return { cancelled, rescheduled: 0 };
  }

  const activeCarts = await AbandonedCart.find({ recovered: false }).limit(200).lean();
  let rescheduled = 0;

  for (const cart of activeCarts as any[]) {
    const userId = String(cart.userId);
    const lastActivity = cart.lastCartActivityAt
      ? new Date(cart.lastCartActivityAt)
      : new Date(cart.abandonedAt);
    const step = Number(cart.remindersSent || 0) + 1;
    if (step > settings.maxReminders) continue;

    const user = await User.findById(userId).select('email fullName country preferences notifications').lean();
    const result = await enqueueReminder({
      userId,
      cartId: String(cart._id),
      reminderStep: step,
      lastCartActivityAt: lastActivity,
      cartTotal: Number(cart.total || 0),
      primaryCategory: cart.primaryCategory,
      user: user as any,
    });
    if (result.queued) rescheduled += 1;
  }

  return { cancelled, rescheduled };
}

export async function preSendSafetyChecks(params: {
  userId: string;
  cartId: string;
  abandonedAt: Date;
  lastCartActivityAt: Date;
}): Promise<{ ok: boolean; reason?: string }> {
  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled || settings.globalPause) return { ok: false, reason: 'campaign_disabled' };

  const buyerGate = await assertBuyerMarketingEligible(params.userId);
  if (!buyerGate.ok) {
    if (buyerGate.reason === 'not_buyer') return { ok: false, reason: 'not_buyer' };
    if (buyerGate.reason === 'banned') return { ok: false, reason: 'banned' };
    if (buyerGate.reason === 'promotions_off') return { ok: false, reason: 'user_unsubscribed' };
    return { ok: false, reason: buyerGate.reason };
  }

  const user = buyerGate.user;
  if (!user) return { ok: false, reason: 'no_user' };

  if (settings.respectBuyerPreferences) {
    const promo = Boolean((user as any)?.notifications?.email?.promotions ?? true);
    if (!promo) return { ok: false, reason: 'user_unsubscribed' };
  }

  if (params.cartId && params.cartId !== 'new' && mongoose.Types.ObjectId.isValid(params.cartId)) {
    const cart = await AbandonedCart.findById(params.cartId).lean();
    if (!cart || cart.recovered) return { ok: false, reason: 'cart_recovered' };
    if (cart.checkoutStarted) return { ok: false, reason: 'checkout_started' };
  }

  const purchased = await RecommendationActivity.findOne({
    userId: new mongoose.Types.ObjectId(params.userId),
    eventType: 'purchase',
    createdAt: { $gte: params.lastCartActivityAt },
  })
    .select('_id')
    .lean();
  if (purchased) return { ok: false, reason: 'cart_purchased' };

  const checkout = await RecommendationActivity.findOne({
    userId: new mongoose.Types.ObjectId(params.userId),
    eventType: { $in: ['checkout_start', 'checkout_started'] },
    createdAt: { $gte: params.abandonedAt },
  })
    .select('_id')
    .lean();
  if (checkout) return { ok: false, reason: 'checkout_started' };

  const lookback = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const events = await RecommendationActivity.find({
    userId: new mongoose.Types.ObjectId(params.userId),
    eventType: { $in: ['cart_add', 'cart_remove'] },
    createdAt: { $gte: lookback },
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const state = new Map<string, number>();
  for (const e of events as any[]) {
    const pid = e?.productId ? String(e.productId) : '';
    if (!pid) continue;
    if (e.eventType === 'cart_add') state.set(pid, Math.max(1, Number(e?.meta?.quantity ?? 1)));
    else state.set(pid, 0);
  }
  const hasItems = [...state.values()].some((q) => q > 0);
  if (!hasItems) return { ok: false, reason: 'cart_deleted' };

  return { ok: true };
}

export function generateRecoveryCoupon(prefix: string, userId: string, step: number): string {
  const tail = String(userId).slice(-4).toUpperCase();
  return `${prefix}${step}${tail}`;
}

export async function getRecoveryAnalytics(sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const settings = settingsToClient(await getOrCreateCartSettings());

  const [recoveredAgg, sentCount, openAgg, queuePending, totalValue] = await Promise.all([
    AbandonedCart.countDocuments({ recovered: true, updatedAt: { $gte: since } }),
    AbandonedCartQueue.countDocuments({ completed: true, updatedAt: { $gte: since } }),
    AbandonedCart.aggregate([
      { $match: { updatedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          carts: { $sum: 1 },
          avgOpen: { $avg: '$engagementPattern.openRate' },
          totalCartValue: { $sum: '$total' },
        },
      },
    ]),
    AbandonedCartQueue.countDocuments({ status: 'PENDING', cancelled: false }),
    AbandonedCart.aggregate([
      { $match: { recovered: true, updatedAt: { $gte: since } } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
  ]);

  const meta = openAgg[0] || { carts: 0, avgOpen: 0, totalCartValue: 0 };
  const abandoned = Number(meta.carts || 0);
  const recovered = recoveredAgg;
  const recoveryRate = abandoned > 0 ? Math.round((recovered / abandoned) * 1000) / 10 : 0;

  return {
    recoveredRevenue: Number(totalValue[0]?.revenue || 0),
    recoveryRate,
    emailsSent: sentCount,
    openRate: Math.round(Number(meta.avgOpen || 0)),
    cartValue: Number(meta.totalCartValue || 0),
    pendingReminders: queuePending,
    aiSuggestedTime: settings.smartMode ? 'Active — per buyer engagement' : 'Fixed schedule',
    campaignEnabled: settings.enabled,
  };
}

export function simulateRecoveryEstimate(params: {
  delayValue: number;
  delayUnit: string;
  smartMode: boolean;
  cartTotalUsd?: number;
}) {
  const delayMs = delayToMs(params.delayValue, params.delayUnit);
  const delayMinutes = Math.round(delayMs / 60000);
  const base = params.smartMode ? 14 : 10;
  const hourFactor = delayMinutes <= 60 ? 1.4 : delayMinutes <= 360 ? 1.1 : 0.95;
  const valueFactor = (params.cartTotalUsd || 100) > 200 ? 1.08 : 1;
  const estimatedRecoveryBoost = Math.round(base * hourFactor * valueFactor * 10) / 10;
  return {
    delayMinutes,
    estimatedRecoveryBoostPercent: estimatedRecoveryBoost,
    message: `If set to ${params.delayValue} ${params.delayUnit}: estimated recovery +${estimatedRecoveryBoost}%`,
  };
}
