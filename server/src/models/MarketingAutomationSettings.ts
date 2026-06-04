import mongoose, { Document, Schema } from 'mongoose';

/**
 * Per-flow configuration for the marketing automation engine.
 * Lives in a single singleton document. Workers read this once per tick
 * to know whether they should run and what to send.
 */
export type MarketingFlowKey =
  | 'recommendation'
  | 'cart_pulse'
  | 'browse_abandon'
  | 'winback'
  | 'abandoned_cart';

export interface IMarketingFlow {
  enabled: boolean;
  pushEnabled: boolean;
  lastRunAt?: Date;
  lastRunSent?: number;
  lastRunSkipped?: number;
  lastRunFailed?: number;
  lastError?: string;
}

/** Admin-tunable email experience (defaults: everything on except transactional Gemini polish). */
export interface IEmailNotificationSettings {
  /** Use responsive rich HTML templates (always recommended). */
  richTemplatesEnabled: boolean;
  /** Gemini for recommendation / cart / browse / winback copy when API key is set. */
  geminiMarketingCopy: boolean;
  /** Optional Gemini polish on order/message transactional emails (extra latency). */
  geminiTransactionalPolish: boolean;
  /** Gemini for seller in-app / push / email notifications (orders, shipping, etc.). */
  geminiSellerNotifications: boolean;
}

export interface IMarketingAutomationSettings extends Document {
  globalEnabled: boolean;
  dailyEmailCap: number;
  email: IEmailNotificationSettings;
  flows: Record<MarketingFlowKey, IMarketingFlow>;
  updatedAt: Date;
}

export function resolveEmailNotificationSettings(
  doc?: Partial<IMarketingAutomationSettings> | null,
): IEmailNotificationSettings {
  const e = (doc as any)?.email || {};
  return {
    richTemplatesEnabled: e.richTemplatesEnabled !== false,
    geminiMarketingCopy: e.geminiMarketingCopy !== false,
    geminiTransactionalPolish: Boolean(e.geminiTransactionalPolish),
    geminiSellerNotifications: e.geminiSellerNotifications !== false,
  };
}

const flowSchema = new Schema<IMarketingFlow>(
  {
    enabled: { type: Boolean, default: true },
    pushEnabled: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunSent: { type: Number, default: 0 },
    lastRunSkipped: { type: Number, default: 0 },
    lastRunFailed: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
  },
  { _id: false },
);

const emailSettingsSchema = new Schema<IEmailNotificationSettings>(
  {
    richTemplatesEnabled: { type: Boolean, default: true },
    geminiMarketingCopy: { type: Boolean, default: true },
    geminiTransactionalPolish: { type: Boolean, default: false },
    geminiSellerNotifications: { type: Boolean, default: true },
  },
  { _id: false },
);

const marketingAutomationSettingsSchema = new Schema<IMarketingAutomationSettings>(
  {
    globalEnabled: { type: Boolean, default: true },
    dailyEmailCap: { type: Number, default: 4 },
    email: {
      type: emailSettingsSchema,
      default: () => ({
        richTemplatesEnabled: true,
        geminiMarketingCopy: true,
        geminiTransactionalPolish: false,
        geminiSellerNotifications: true,
      }),
    },
    flows: {
      recommendation: { type: flowSchema, default: () => ({ enabled: true, pushEnabled: true }) },
      cart_pulse: { type: flowSchema, default: () => ({ enabled: true, pushEnabled: true }) },
      browse_abandon: { type: flowSchema, default: () => ({ enabled: true, pushEnabled: true }) },
      winback: { type: flowSchema, default: () => ({ enabled: true, pushEnabled: true }) },
      abandoned_cart: { type: flowSchema, default: () => ({ enabled: true, pushEnabled: true }) },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const MarketingAutomationSettings = mongoose.model<IMarketingAutomationSettings>(
  'MarketingAutomationSettings',
  marketingAutomationSettingsSchema,
);

let cachedDoc: IMarketingAutomationSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30 * 1000;

export async function getMarketingAutomationSettings(): Promise<IMarketingAutomationSettings> {
  if (cachedDoc && Date.now() - cachedAt < CACHE_MS) return cachedDoc;
  let doc = await MarketingAutomationSettings.findOne();
  if (!doc) doc = await MarketingAutomationSettings.create({});
  cachedDoc = doc;
  cachedAt = Date.now();
  return doc;
}

export function invalidateMarketingAutomationSettingsCache(): void {
  cachedDoc = null;
  cachedAt = 0;
}

export async function isMarketingFlowEnabled(flow: MarketingFlowKey): Promise<boolean> {
  try {
    const s = await getMarketingAutomationSettings();
    if (!s.globalEnabled) return false;
    const f = s.flows?.[flow];
    if (!f) return true;
    return Boolean(f.enabled);
  } catch {
    return true;
  }
}

export async function isMarketingFlowPushEnabled(flow: MarketingFlowKey): Promise<boolean> {
  try {
    const s = await getMarketingAutomationSettings();
    if (!s.globalEnabled) return false;
    const f = s.flows?.[flow];
    if (!f) return true;
    return Boolean(f.pushEnabled);
  } catch {
    return true;
  }
}

/**
 * Per-user marketing email cap (24h). Env `DAILY_MARKETING_EMAIL_CAP` overrides admin when set.
 * `0` = unlimited.
 */
export async function getDailyMarketingEmailCap(): Promise<number> {
  const envRaw = String(process.env.DAILY_MARKETING_EMAIL_CAP ?? '').trim();
  if (envRaw !== '') {
    const n = Number(envRaw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  try {
    const s = await getMarketingAutomationSettings();
    const cap = Number(s.dailyEmailCap ?? 4);
    return Number.isFinite(cap) && cap >= 0 ? Math.floor(cap) : 4;
  } catch {
    return 4;
  }
}

export async function recordFlowRun(
  flow: MarketingFlowKey,
  stats: { sent?: number; skipped?: number; failed?: number; error?: string },
): Promise<void> {
  try {
    const doc = await getMarketingAutomationSettings();
    const f = doc.flows[flow] || ({ enabled: true, pushEnabled: true } as IMarketingFlow);
    f.lastRunAt = new Date();
    f.lastRunSent = Number(stats.sent ?? 0);
    f.lastRunSkipped = Number(stats.skipped ?? 0);
    f.lastRunFailed = Number(stats.failed ?? 0);
    f.lastError = String(stats.error ?? '');
    doc.flows[flow] = f;
    doc.markModified('flows');
    await doc.save();
    invalidateMarketingAutomationSettingsCache();
  } catch (e) {
    console.error('[marketing-automation] failed to record run', flow, e);
  }
}
