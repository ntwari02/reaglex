import mongoose, { Document, Schema } from 'mongoose';

export type GatewayStatus = 'online' | 'offline' | 'issues';

export type GatewayHealthLogEntry = {
  at: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export interface IPaymentGatewayConfig extends Document {
  key: string; // e.g. 'flutterwave', 'mtn_momo'
  name: string;
  type: string;
  status: GatewayStatus;
  isEnabled: boolean;
  /** Legacy display hint; prefer maskedSummary + encryptedCredentials */
  apiKeyMasked?: string;
  webhookUrl?: string;
  credentialProfile?: 'flutterwave' | 'mtn_momo' | 'airtel_api' | 'generic_api_secret' | 'none';
  /** AES-256-GCM encrypted JSON (see paymentSecretsCrypto.service) */
  encryptedCredentials?: string;
  /** Non-secret masks for admin list cards */
  maskedSummary?: Record<string, string>;
  healthLogs?: GatewayHealthLogEntry[];
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
    credentialProfile: { type: String },
    encryptedCredentials: { type: String },
    maskedSummary: { type: Schema.Types.Mixed },
    healthLogs: {
      type: [
        {
          at: { type: Date, default: Date.now },
          level: { type: String, enum: ['info', 'warn', 'error'] },
          message: { type: String },
        },
      ],
      default: [],
    },
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
