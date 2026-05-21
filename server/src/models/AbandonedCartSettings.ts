import mongoose, { Document, Schema } from 'mongoose';

export type DelayUnit = 'minute' | 'minutes' | 'hour' | 'hours' | 'day' | 'days';

export interface IRecoveryStepConfig {
  step: number;
  delayValue: number;
  delayUnit: DelayUnit;
  label?: string;
  template?: 'waiting' | 'low_stock' | 'discount' | 'custom';
  channel?: 'email' | 'sms' | 'push';
}

export interface IRecoveryIncentives {
  dynamicCoupon: boolean;
  freeShipping: boolean;
  urgencyBadge: boolean;
  loyaltyRewards: boolean;
  couponPrefix?: string;
}

export interface IAbandonedCartSettings extends Document {
  enabled: boolean;
  delayValue: number;
  delayUnit: DelayUnit;
  maxReminders: number;
  cooldownPeriod: string;
  smartMode: boolean;
  aiOptimizationEnabled: boolean;
  recoverySteps: IRecoveryStepConfig[];
  quietHours: { enabled: boolean; start: string; end: string };
  timezoneMode: 'auto_detect' | 'utc';
  respectBuyerPreferences: boolean;
  incentives: IRecoveryIncentives;
  globalPause: boolean;
  updatedAt: Date;
}

const recoveryStepSchema = new Schema<IRecoveryStepConfig>(
  {
    step: { type: Number, required: true },
    delayValue: { type: Number, required: true },
    delayUnit: { type: String, enum: ['minute', 'minutes', 'hour', 'hours', 'day', 'days'], default: 'hour' },
    label: { type: String },
    template: { type: String, enum: ['waiting', 'low_stock', 'discount', 'custom'], default: 'waiting' },
    channel: { type: String, enum: ['email', 'sms', 'push'], default: 'email' },
  },
  { _id: false }
);

export const defaultRecoverySteps = (): IRecoveryStepConfig[] => [
  { step: 1, delayValue: 30, delayUnit: 'minutes', label: 'Items waiting', template: 'waiting', channel: 'email' },
  { step: 2, delayValue: 1, delayUnit: 'hour', label: 'Stock running low', template: 'low_stock', channel: 'email' },
  { step: 3, delayValue: 6, delayUnit: 'hours', label: 'Limited discount', template: 'discount', channel: 'email' },
  { step: 4, delayValue: 24, delayUnit: 'hours', label: 'Final reminder', template: 'discount', channel: 'email' },
  { step: 5, delayValue: 3, delayUnit: 'days', label: 'Last chance', template: 'custom', channel: 'email' },
];

export const defaultCartSettings = (): Partial<IAbandonedCartSettings> => ({
  enabled: true,
  delayValue: 1,
  delayUnit: 'hour',
  maxReminders: 3,
  cooldownPeriod: '24h',
  smartMode: true,
  aiOptimizationEnabled: true,
  recoverySteps: defaultRecoverySteps(),
  quietHours: { enabled: true, start: '22:00', end: '07:00' },
  timezoneMode: 'auto_detect',
  respectBuyerPreferences: true,
  incentives: {
    dynamicCoupon: true,
    freeShipping: false,
    urgencyBadge: true,
    loyaltyRewards: false,
    couponPrefix: 'COMEBACK',
  },
  globalPause: false,
});

const abandonedCartSettingsSchema = new Schema<IAbandonedCartSettings>(
  {
    enabled: { type: Boolean, default: true },
    delayValue: { type: Number, default: 1 },
    delayUnit: { type: String, enum: ['minute', 'minutes', 'hour', 'hours', 'day', 'days'], default: 'hour' },
    maxReminders: { type: Number, default: 3, min: 1, max: 10 },
    cooldownPeriod: { type: String, default: '24h' },
    smartMode: { type: Boolean, default: true },
    aiOptimizationEnabled: { type: Boolean, default: true },
    recoverySteps: { type: [recoveryStepSchema], default: defaultRecoverySteps },
    quietHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    timezoneMode: { type: String, enum: ['auto_detect', 'utc'], default: 'auto_detect' },
    respectBuyerPreferences: { type: Boolean, default: true },
    incentives: {
      dynamicCoupon: { type: Boolean, default: true },
      freeShipping: { type: Boolean, default: false },
      urgencyBadge: { type: Boolean, default: true },
      loyaltyRewards: { type: Boolean, default: false },
      couponPrefix: { type: String, default: 'COMEBACK' },
    },
    globalPause: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AbandonedCartSettings = mongoose.model<IAbandonedCartSettings>(
  'AbandonedCartSettings',
  abandonedCartSettingsSchema
);

export async function getOrCreateCartSettings(): Promise<IAbandonedCartSettings> {
  let doc = await AbandonedCartSettings.findOne();
  if (!doc) {
    doc = await AbandonedCartSettings.create(defaultCartSettings());
  }
  return doc;
}

export interface ICartSettingsClient {
  enabled: boolean;
  delayValue: number;
  delayUnit: DelayUnit | string;
  maxReminders: number;
  cooldownPeriod: string;
  smartMode: boolean;
  aiOptimizationEnabled: boolean;
  recoverySteps: IRecoveryStepConfig[];
  quietHours: { enabled: boolean; start: string; end: string };
  timezoneMode: 'auto_detect' | 'utc';
  respectBuyerPreferences: boolean;
  incentives: IRecoveryIncentives;
  globalPause: boolean;
  updatedAt?: Date;
}

export function settingsToClient(doc: IAbandonedCartSettings): ICartSettingsClient {
  const d = doc as any;
  return {
    enabled: Boolean(d.enabled ?? true),
    delayValue: Number(d.delayValue ?? 1),
    delayUnit: d.delayUnit || 'hour',
    maxReminders: Number(d.maxReminders ?? 3),
    cooldownPeriod: String(d.cooldownPeriod || '24h'),
    smartMode: Boolean(d.smartMode ?? true),
    aiOptimizationEnabled: Boolean(d.aiOptimizationEnabled ?? true),
    recoverySteps: d.recoverySteps?.length ? d.recoverySteps : defaultRecoverySteps(),
    quietHours: d.quietHours || { enabled: true, start: '22:00', end: '07:00' },
    timezoneMode: d.timezoneMode || 'auto_detect',
    respectBuyerPreferences: Boolean(d.respectBuyerPreferences ?? true),
    incentives: d.incentives || defaultCartSettings().incentives,
    globalPause: Boolean(d.globalPause ?? false),
    updatedAt: d.updatedAt,
  };
}
