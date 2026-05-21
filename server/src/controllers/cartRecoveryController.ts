import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getOrCreateCartSettings,
  settingsToClient,
  defaultRecoverySteps,
  type IRecoveryStepConfig,
} from '../models/AbandonedCartSettings';
import { getOrCreateCartStrategy, strategyToClient } from '../models/AbandonedCartStrategy';
import {
  cancelPendingQueueJobs,
  getRecoveryAnalytics,
  regenerateQueueFromSettings,
  simulateRecoveryEstimate,
} from '../services/cartRecoveryEngine.service';
import { simulateTimingPrediction } from '../services/timingOptimizer';
import { AbandonedCart } from '../models/AbandonedCart';
import { AbandonedCartQueue } from '../models/AbandonedCartQueue';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

/** Admin SSOT — abandoned cart recovery settings */
export async function getCartRecoverySettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const doc = await getOrCreateCartSettings();
    const pending = await AbandonedCartQueue.countDocuments({
      status: 'PENDING',
      cancelled: false,
    });
    return res.json({ settings: settingsToClient(doc), pendingQueueJobs: pending });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to load settings' });
  }
}

export async function updateCartRecoverySettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await getOrCreateCartSettings();
    const d = doc as any;

    if (body.enabled != null) d.enabled = Boolean(body.enabled);
    if (body.delayValue != null) d.delayValue = Math.max(1, Number(body.delayValue) || 1);
    if (body.delayUnit != null) d.delayUnit = String(body.delayUnit);
    if (body.maxReminders != null) d.maxReminders = Math.max(1, Math.min(10, Number(body.maxReminders) || 3));
    if (body.cooldownPeriod != null) d.cooldownPeriod = String(body.cooldownPeriod);
    if (body.smartMode != null) d.smartMode = Boolean(body.smartMode);
    if (body.aiOptimizationEnabled != null) d.aiOptimizationEnabled = Boolean(body.aiOptimizationEnabled);
    if (Array.isArray(body.recoverySteps)) d.recoverySteps = body.recoverySteps;
    if (body.quietHours != null) d.quietHours = body.quietHours;
    if (body.timezoneMode != null) d.timezoneMode = body.timezoneMode;
    if (body.respectBuyerPreferences != null) d.respectBuyerPreferences = Boolean(body.respectBuyerPreferences);
    if (body.incentives != null) d.incentives = body.incentives;
    if (body.globalPause != null) d.globalPause = Boolean(body.globalPause);

    await d.save();

    if (!d.enabled) {
      await cancelPendingQueueJobs('admin_disabled');
    } else {
      await regenerateQueueFromSettings();
    }

    const settings = settingsToClient(d);
    return res.json({
      settings,
      queueRegenerated: Boolean(d.enabled),
      message: d.enabled
        ? 'Settings saved. Pending reminders rescheduled from admin configuration.'
        : 'Campaign disabled. All pending reminders cancelled immediately.',
    });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to update settings' });
  }
}

export async function getCartRecoveryAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const analytics = await getRecoveryAnalytics(days);
    return res.json({ analytics });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to load analytics' });
  }
}

export async function simulateCartRecovery(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as {
      delayValue?: number;
      delayUnit?: string;
      delayMinutes?: number;
      cartTotalUsd?: number;
      openRate?: number;
      smartMode?: boolean;
    };
    const settings = settingsToClient(await getOrCreateCartSettings());
    const delayValue = Number(body.delayValue ?? settings.delayValue);
    const delayUnit = String(body.delayUnit ?? settings.delayUnit);
    const smartMode = body.smartMode ?? settings.smartMode;

    const estimate = simulateRecoveryEstimate({
      delayValue,
      delayUnit,
      smartMode,
      cartTotalUsd: Number(body.cartTotalUsd ?? 100),
    });

    const strategy = await getOrCreateCartStrategy();
    const prediction = simulateTimingPrediction({
      strategy,
      sampleDelayMinutes: body.delayMinutes ?? estimate.delayMinutes,
      cartTotalUsd: Number(body.cartTotalUsd ?? 100),
      openRate: Number(body.openRate ?? 42),
    });

    return res.json({
      estimate,
      prediction,
      schedulePreview: (settings.recoverySteps || defaultRecoverySteps()).map((s: IRecoveryStepConfig) => ({
        step: s.step,
        delay: `${s.delayValue} ${s.delayUnit}`,
        label: s.label,
        template: s.template,
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Simulation failed' });
  }
}

/** Legacy strategy endpoints — sync to settings on read/write */
export async function getCartStrategy(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const settings = settingsToClient(await getOrCreateCartSettings());
    const strategy = strategyToClient(await getOrCreateCartStrategy());
    return res.json({
      strategy: {
        ...strategy,
        autoReminderEnabled: settings.enabled,
        enableSmartTiming: settings.aiOptimizationEnabled,
        mode: settings.smartMode ? 'smart' : 'manual',
        maxReminders: settings.maxReminders,
        recoverySteps: settings.recoverySteps.map((s: IRecoveryStepConfig) => ({
          step: s.step,
          channel: s.channel || 'email',
          delayMinutes: Math.round(
            (Number(s.delayValue) || 1) *
              (String(s.delayUnit || '').startsWith('day')
                ? 1440
                : String(s.delayUnit || '').startsWith('hour')
                  ? 60
                  : 1)
          ),
          label: s.label,
        })),
      },
      settings,
    });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to load cart strategy' });
  }
}

export async function updateCartStrategy(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await getOrCreateCartSettings();
    const d = doc as any;

    if (body.autoReminderEnabled != null) d.enabled = Boolean(body.autoReminderEnabled);
    if (body.enableSmartTiming != null) d.aiOptimizationEnabled = Boolean(body.enableSmartTiming);
    if (body.mode != null) d.smartMode = String(body.mode) === 'smart' || String(body.mode) === 'hybrid';
    if (body.maxReminders != null) d.maxReminders = Math.max(1, Math.min(10, Number(body.maxReminders) || 3));
    if (body.quietHours != null) d.quietHours = body.quietHours;
    if (body.timezoneMode != null) d.timezoneMode = body.timezoneMode;
    if (body.respectBuyerPreferences != null) d.respectBuyerPreferences = Boolean(body.respectBuyerPreferences);
    if (Array.isArray(body.recoverySteps)) {
      d.recoverySteps = (body.recoverySteps as any[]).map((s, i) => ({
        step: s.step ?? i + 1,
        delayValue: s.delayValue ?? Math.max(1, Math.round((s.delayMinutes || 60) / (s.delayUnit?.startsWith?.('day') ? 1440 : 60))),
        delayUnit: s.delayUnit || (s.delayMinutes >= 1440 ? 'days' : s.delayMinutes >= 60 ? 'hours' : 'minutes'),
        label: s.label,
        template: s.template || 'waiting',
        channel: s.channel || 'email',
      }));
    }
    if (body.incentives != null) d.incentives = body.incentives;

    await d.save();
    if (!d.enabled) await cancelPendingQueueJobs('admin_disabled');
    else await regenerateQueueFromSettings();

    return res.json({ strategy: settingsToClient(d), settings: settingsToClient(d) });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to update cart strategy' });
  }
}

export async function saveCartJourney(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { journey } = req.body as { journey?: Record<string, unknown> };
    if (!journey || !Array.isArray((journey as any).nodes)) {
      return res.status(400).json({ message: 'journey with nodes[] is required' });
    }
    const { getOrCreateCartStrategy: getStrategy, AbandonedCartStrategy } = await import('../models/AbandonedCartStrategy');
    const doc = await getStrategy();
    (doc as any).journey = journey;
    await doc.save();
    return res.json({ success: true, journey: doc.journey });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to save journey' });
  }
}

export async function getCartTimeline(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const cartId = req.params.cartId;
    const cart = await AbandonedCart.findById(cartId).select('timeline customerEmail remindersSent recovered').lean();
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    const queue = await AbandonedCartQueue.find({ cartId })
      .sort({ scheduledSendAt: 1 })
      .lean();
    return res.json({ timeline: cart.timeline || [], queue });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to load timeline' });
  }
}
