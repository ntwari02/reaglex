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
    return f.enabled !== false;
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
    return f.pushEnabled !== false;
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
    const flowPrefix = `flows.${flow}`;
    await MarketingAutomationSettings.findOneAndUpdate(
      {},
      [
        {
          $set: {
            [`${flowPrefix}.lastRunAt`]: new Date(),
            [`${flowPrefix}.lastRunSent`]: Number(stats.sent ?? 0),
            [`${flowPrefix}.lastRunSkipped`]: Number(stats.skipped ?? 0),
            [`${flowPrefix}.lastRunFailed`]: Number(stats.failed ?? 0),
            [`${flowPrefix}.lastError`]: String(stats.error ?? ''),
            // Preserve admin toggles; only seed defaults when the subdocument is new/partial.
            [`${flowPrefix}.enabled`]: { $ifNull: [`$${flowPrefix}.enabled`, true] },
            [`${flowPrefix}.pushEnabled`]: { $ifNull: [`$${flowPrefix}.pushEnabled`, true] },
          },
        },
      ],
      { upsert: true, updatePipeline: true },
    );
    invalidateMarketingAutomationSettingsCache();
  } catch (e) {
    console.error('[marketing-automation] failed to record run', flow, e);
  }
}
