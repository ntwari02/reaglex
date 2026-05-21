import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentGatewayMetric extends Document {
  gatewayKey: string;
  region: string;
  successRate: number;
  feeRate: number;
  fraudRiskScore: number;
  isDown: boolean;
  downtimeReason?: string;
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentGatewayMetricSchema = new Schema<IPaymentGatewayMetric>(
  {
    gatewayKey: { type: String, required: true, index: true },
    region: { type: String, required: true, default: 'GLOBAL', index: true },
    successRate: { type: Number, default: 90, min: 0, max: 100 },
    feeRate: { type: Number, default: 0.02, min: 0, max: 1 },
    fraudRiskScore: { type: Number, default: 20, min: 0, max: 100 },
    isDown: { type: Boolean, default: false, index: true },
    downtimeReason: { type: String },
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentGatewayMetricSchema.index({ gatewayKey: 1, region: 1 }, { unique: true });

export const PaymentGatewayMetric = mongoose.model<IPaymentGatewayMetric>(
  'PaymentGatewayMetric',
  paymentGatewayMetricSchema
);
