import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketingSettings extends Document {
  budgetLimit: number;
  spamProtection: boolean;
  smtp: {
    host: string;
    port: string;
  };
  sms: {
    apiKey: string;
    apiSecret: string;
  };
  push: {
    fcmKey: string;
  };
  updatedAt: Date;
}

const marketingSettingsSchema = new Schema<IMarketingSettings>(
  {
    budgetLimit: { type: Number, default: 10000 },
    spamProtection: { type: Boolean, default: true },
    smtp: {
      host: { type: String, default: '' },
      port: { type: String, default: '' },
    },
    sms: {
      apiKey: { type: String, default: '' },
      apiSecret: { type: String, default: '' },
    },
    push: {
      fcmKey: { type: String, default: '' },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const MarketingSettings = mongoose.model<IMarketingSettings>(
  'MarketingSettings',
  marketingSettingsSchema
);
