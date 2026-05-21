import type { IAbandonedCartStrategy } from '../models/AbandonedCartStrategy';
import { applyQuietHours } from './quietHoursService';
import { getPreferredSendHour } from './engagementLearning';
import { resolveUserTimezone } from './timezoneService';

export interface TimingContext {
  abandonedAt: Date;
  stepIndex: number;
  cartTotalUsd: number;
  primaryCategory?: string;
  user?: Record<string, unknown>;
  strategy: IAbandonedCartStrategy;
}

function pickCartValueDelay(rules: Array<{ minUsd?: number; maxUsd?: number; delayMinutes: number }>, total: number) {
  for (const r of rules || []) {
    const min = r.minUsd ?? 0;
    const max = r.maxUsd ?? Number.MAX_SAFE_INTEGER;
    if (total >= min && total < max) return r.delayMinutes;
  }
  return null;
}

function pickCategoryDelays(
  rules: Array<{ category: string; delayMinutes: number[] }>,
  category?: string
) {
  const c = String(category || '').toLowerCase();
  const row = (rules || []).find((r) => c.includes(String(r.category).toLowerCase()));
  return row?.delayMinutes || null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hybridPick(min: number, max: number, seed: number) {
  const span = Math.max(1, max - min);
  return min + (seed % (span + 1));
}

export async function computeReminderDelayMinutes(ctx: TimingContext): Promise<number> {
  const strategy = ctx.strategy;
  const step = ctx.stepIndex + 1;

  if (strategy.mode === 'manual') {
    const row = (strategy.recoverySteps || []).find((s) => s.step === step);
    return row?.delayMinutes ?? 60;
  }

  const cartRule = pickCartValueDelay(strategy.globalRules?.cartValueRules || [], ctx.cartTotalUsd);
  const catDelays = pickCategoryDelays(strategy.globalRules?.categoryRecoveryRules || [], ctx.primaryCategory);
  const catDelay = catDelays?.[ctx.stepIndex];

  if (strategy.mode === 'smart' && strategy.enableSmartTiming) {
    const preferredHour = await getPreferredSendHour(String((ctx.user as any)?._id || (ctx.user as any)?.id || ''));
    const base = catDelay ?? cartRule ?? 60 * (ctx.stepIndex + 1);
    const abandoned = ctx.abandonedAt.getTime();
    const target = new Date(abandoned + base * 60 * 1000);
    target.setUTCHours(preferredHour, 15, 0, 0);
    if (target.getTime() < Date.now()) target.setTime(Date.now() + 5 * 60 * 1000);
    return Math.max(5, Math.round((target.getTime() - abandoned) / 60000));
  }

  const bound = (strategy.hybridBounds || []).find((b) => b.step === step);
  const minM = bound?.minMinutes ?? 10;
  const maxM = bound?.maxMinutes ?? 60;
  const seed = Math.abs(
    String((ctx.user as any)?.email || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) + step
  );
  let picked = hybridPick(minM, maxM, seed);
  if (catDelay != null) picked = clamp(catDelay, minM, maxM);
  if (cartRule != null) picked = clamp(cartRule, minM, maxM);
  return picked;
}

export async function scheduleNextReminderAt(ctx: TimingContext): Promise<{
  scheduledAt: Date;
  delayMinutes: number;
  delayedByQuietHours: boolean;
  quietReason?: string;
}> {
  const strategy = ctx.strategy;
  const delayMinutes = await computeReminderDelayMinutes(ctx);
  let at = new Date(ctx.abandonedAt.getTime() + delayMinutes * 60 * 1000);
  if (at.getTime() < Date.now()) at = new Date(Date.now() + 2 * 60 * 1000);

  const tz =
    strategy.timezoneMode === 'utc' ? 'UTC' : resolveUserTimezone(ctx.user as any);
  const quiet = applyQuietHours({
    at,
    timeZone: tz,
    quietHours: strategy.quietHours || { enabled: true, start: '22:00', end: '07:00' },
  });

  return {
    scheduledAt: quiet.scheduledAt,
    delayMinutes,
    delayedByQuietHours: quiet.delayed,
    quietReason: quiet.reason,
  };
}

export function simulateTimingPrediction(params: {
  strategy: IAbandonedCartStrategy;
  sampleDelayMinutes: number;
  cartTotalUsd: number;
  openRate?: number;
}) {
  const { strategy, sampleDelayMinutes, cartTotalUsd, openRate = 42 } = params;
  const baseOpen = Math.max(10, Math.min(85, openRate));
  const delayFactor = sampleDelayMinutes <= 30 ? 1.05 : sampleDelayMinutes <= 120 ? 1 : 0.92;
  const valueFactor = cartTotalUsd > 500 ? 0.88 : cartTotalUsd < 50 ? 1.08 : 1;
  const modeFactor = strategy.mode === 'smart' ? 1.06 : strategy.mode === 'hybrid' ? 1.02 : 1;

  const expectedOpen = Math.round(baseOpen * delayFactor * modeFactor);
  const expectedRecovery = Math.round(expectedOpen * 0.4 * valueFactor);
  const spamRisk =
    sampleDelayMinutes < 20 && strategy.maxReminders > 4
      ? 'high'
      : sampleDelayMinutes < 45
        ? 'medium'
        : 'low';

  return {
    expectedOpenPercent: Math.min(95, expectedOpen),
    expectedRecoveryPercent: Math.min(60, expectedRecovery),
    spamRisk,
    quietHoursActive: Boolean(strategy.quietHours?.enabled),
    mode: strategy.mode,
  };
}
