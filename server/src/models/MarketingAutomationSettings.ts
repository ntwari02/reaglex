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

export interface IMarketingAutomationSettings extends Document {
  globalEnabled: boolean;
  dailyEmailCap: number;
  flows: Record<MarketingFlowKey, IMarketingFlow>;
  updatedAt: Date;
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

const marketingAutomationSettingsSchema = new Schema<IMarketingAutomationSettings>(
  {
    globalEnabled: { type: Boolean, default: true },
    dailyEmailCap: { type: Number, default: 8 },
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
