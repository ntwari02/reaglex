import mongoose, { Document, Schema } from 'mongoose';

export type RecoveryTimingMode = 'manual' | 'smart' | 'hybrid';

export interface IRecoveryStep {
  step: number;
  channel: 'email' | 'sms' | 'push';
  delayMinutes: number;
  minMinutes?: number;
  maxMinutes?: number;
  couponCode?: string;
  label?: string;
}

export interface IHybridStepBound {
  step: number;
  minMinutes: number;
  maxMinutes: number;
}

export interface ICategoryRecoveryRule {
  category: string;
  delayMinutes: number[];
}

export interface ICartValueRecoveryRule {
  minUsd?: number;
  maxUsd?: number;
  delayMinutes: number;
}

export interface IQuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface IRecoveryJourneyNode {
  id: string;
  type: 'trigger' | 'wait' | 'condition' | 'email' | 'sms' | 'push' | 'coupon';
  label?: string;
  waitMinutes?: number;
  condition?: {
    field?: 'cartValue' | 'category' | 'emailOpened';
    operator?: 'gt' | 'lt' | 'eq' | 'unopened';
    value?: number | string;
  };
  couponCode?: string;
  position?: { x: number; y: number };
}

export interface IRecoveryJourneyEdge {
  from: string;
  to: string;
}

export interface IRecoveryJourney {
  nodes: IRecoveryJourneyNode[];
  edges: IRecoveryJourneyEdge[];
  conditions: Record<string, unknown>[];
}

export interface IGlobalRecoveryRules {
  pauseReminders: boolean;
  pauseReason?: string;
  paymentProviderDown: boolean;
  blackFridayBoost: boolean;
  categoryRecoveryRules: ICategoryRecoveryRule[];
  cartValueRules: ICartValueRecoveryRule[];
}

export interface IAbandonedCartStrategy extends Document {
  autoReminderEnabled: boolean;
  mode: RecoveryTimingMode;
  enableSmartTiming: boolean;
  maxReminders: number;
  quietHours: IQuietHours;
  timezoneMode: 'auto_detect' | 'utc';
  respectBuyerPreferences: boolean;
  recoverySteps: IRecoveryStep[];
  hybridBounds: IHybridStepBound[];
  globalRules: IGlobalRecoveryRules;
  journey: IRecoveryJourney;
  /** @deprecated migrated to recoverySteps */
  reminderTiming?: string;
  updatedAt: Date;
}

const recoveryStepSchema = new Schema<IRecoveryStep>(
  {
    step: { type: Number, required: true },
    channel: { type: String, enum: ['email', 'sms', 'push'], default: 'email' },
    delayMinutes: { type: Number, required: true },
    minMinutes: { type: Number },
    maxMinutes: { type: Number },
    couponCode: { type: String },
    label: { type: String },
  },
  { _id: false }
);

const defaultStrategy = (): Partial<IAbandonedCartStrategy> => ({
  autoReminderEnabled: true,
  mode: 'hybrid',
  enableSmartTiming: true,
  maxReminders: 5,
  quietHours: { enabled: true, start: '22:00', end: '07:00' },
  timezoneMode: 'auto_detect',
  respectBuyerPreferences: true,
  recoverySteps: [
    { step: 1, channel: 'email', delayMinutes: 15, label: 'Reminder 1' },
    { step: 2, channel: 'email', delayMinutes: 120, label: 'Reminder 2' },
    { step: 3, channel: 'email', delayMinutes: 1440, label: 'Reminder 3' },
    { step: 4, channel: 'sms', delayMinutes: 4320, label: 'Reminder 4' },
  ],
  hybridBounds: [
    { step: 1, minMinutes: 10, maxMinutes: 30 },
    { step: 2, minMinutes: 60, maxMinutes: 360 },
    { step: 3, minMinutes: 1440, maxMinutes: 2880 },
  ],
  globalRules: {
    pauseReminders: false,
    paymentProviderDown: false,
    blackFridayBoost: false,
    categoryRecoveryRules: [
      { category: 'electronics', delayMinutes: [15, 120, 1440] },
      { category: 'furniture', delayMinutes: [360, 1440, 4320] },
      { category: 'vehicles', delayMinutes: [1440, 4320, 10080] },
    ],
    cartValueRules: [
      { maxUsd: 50, delayMinutes: 15 },
      { minUsd: 50, maxUsd: 500, delayMinutes: 120 },
      { minUsd: 500, delayMinutes: 1440 },
    ],
  },
  journey: {
    nodes: [
      { id: 'start', type: 'trigger', label: 'Cart Abandoned' },
      { id: 'wait1', type: 'wait', waitMinutes: 20, label: 'Wait 20 min' },
      { id: 'cond1', type: 'condition', condition: { field: 'cartValue', operator: 'gt', value: 100 } },
      { id: 'email1', type: 'email', label: 'Send Email' },
      { id: 'wait2', type: 'wait', waitMinutes: 240, label: 'Wait 4h' },
      { id: 'sms1', type: 'sms', label: 'Send SMS' },
      { id: 'wait3', type: 'wait', waitMinutes: 1440, label: 'Wait 1 day' },
      { id: 'coupon1', type: 'coupon', couponCode: 'COMEBACK10', label: 'Offer coupon' },
    ],
    edges: [
      { from: 'start', to: 'wait1' },
      { from: 'wait1', to: 'cond1' },
      { from: 'cond1', to: 'email1' },
      { from: 'email1', to: 'wait2' },
      { from: 'wait2', to: 'sms1' },
      { from: 'sms1', to: 'wait3' },
      { from: 'wait3', to: 'coupon1' },
    ],
    conditions: [],
  },
});

const abandonedCartStrategySchema = new Schema<IAbandonedCartStrategy>(
  {
    autoReminderEnabled: { type: Boolean, default: true },
    mode: { type: String, enum: ['manual', 'smart', 'hybrid'], default: 'hybrid' },
    enableSmartTiming: { type: Boolean, default: true },
    maxReminders: { type: Number, default: 5, min: 1, max: 10 },
    quietHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    timezoneMode: { type: String, enum: ['auto_detect', 'utc'], default: 'auto_detect' },
    respectBuyerPreferences: { type: Boolean, default: true },
    recoverySteps: { type: [recoveryStepSchema], default: defaultStrategy().recoverySteps },
    hybridBounds: {
      type: [
        new Schema(
          { step: Number, minMinutes: Number, maxMinutes: Number },
          { _id: false }
        ),
      ],
      default: defaultStrategy().hybridBounds,
    },
    globalRules: { type: Schema.Types.Mixed, default: () => defaultStrategy().globalRules },
    journey: { type: Schema.Types.Mixed, default: () => defaultStrategy().journey },
    reminderTiming: { type: String },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AbandonedCartStrategy = mongoose.model<IAbandonedCartStrategy>(
  'AbandonedCartStrategy',
  abandonedCartStrategySchema
);

export async function getOrCreateCartStrategy(): Promise<IAbandonedCartStrategy> {
  let doc = await AbandonedCartStrategy.findOne();
  if (!doc) {
    doc = await AbandonedCartStrategy.create(defaultStrategy());
  }
  return doc;
}

export function strategyToClient(doc: IAbandonedCartStrategy) {
  const d = doc as any;
  return {
    autoReminderEnabled: Boolean(d.autoReminderEnabled ?? true),
    mode: d.mode || 'hybrid',
    enableSmartTiming: Boolean(d.enableSmartTiming ?? true),
    maxReminders: Number(d.maxReminders ?? 5),
    quietHours: d.quietHours || { enabled: true, start: '22:00', end: '07:00' },
    timezoneMode: d.timezoneMode || 'auto_detect',
    respectBuyerPreferences: Boolean(d.respectBuyerPreferences ?? true),
    recoverySteps: d.recoverySteps || [],
    hybridBounds: d.hybridBounds || [],
    globalRules: d.globalRules || defaultStrategy().globalRules,
    journey: d.journey || defaultStrategy().journey,
    reminderTiming: d.reminderTiming,
    updatedAt: d.updatedAt,
  };
}
