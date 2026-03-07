import mongoose, { Document, Schema } from 'mongoose';

export type GatewayStatus = 'online' | 'offline' | 'issues';

export interface IPaymentGatewayConfig extends Document {
  key: string; // e.g. 'stripe', 'paypal', 'mtn_mobile_money'
  name: string;
  type: string;
  status: GatewayStatus;
  isEnabled: boolean;
  apiKeyMasked?: string; // e.g. 'sk_live_***' - never store full key in DB in production
  webhookUrl?: string;
  lastChecked?: Date;
  issues: string[];
  testMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentGatewayConfigSchema = new Schema<IPaymentGatewayConfig>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['online', 'offline', 'issues'], default: 'online' },
    isEnabled: { type: Boolean, default: true },
    apiKeyMasked: { type: String },
    webhookUrl: { type: String },
    lastChecked: { type: Date },
    issues: { type: [String], default: [] },
    testMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PaymentGatewayConfig = mongoose.model<IPaymentGatewayConfig>(
  'PaymentGatewayConfig',
  paymentGatewayConfigSchema
);
