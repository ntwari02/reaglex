import mongoose, { Document, Schema } from 'mongoose';

export interface IFinanceSettings extends Document {
  currency: string;
  globalCommissionRate: number;
  enableVat: boolean;
  vatRate: number;
  minimumWithdrawal: number;
  automaticPayoutSchedule: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';
  enableFraudChecks: boolean;
  updatedAt: Date;
}

// Single-document collection (id: 'platform')
const financeSettingsSchema = new Schema<IFinanceSettings>(
  {
    _id: { type: Schema.Types.Mixed, default: 'platform' },
    currency: { type: String, default: 'USD' },
    globalCommissionRate: { type: Number, default: 10 },
    enableVat: { type: Boolean, default: true },
    vatRate: { type: Number, default: 10 },
    minimumWithdrawal: { type: Number, default: 50 },
    automaticPayoutSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'manual'],
      default: 'weekly',
    },
    enableFraudChecks: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const FinanceSettings = mongoose.model<IFinanceSettings>(
  'FinanceSettings',
  financeSettingsSchema
);
