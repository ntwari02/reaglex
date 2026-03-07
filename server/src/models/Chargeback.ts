import mongoose, { Document, Schema } from 'mongoose';

export type ChargebackStatus = 'open' | 'under_review' | 'resolved_refund' | 'resolved_won';

export interface IChargeback extends Document {
  orderId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: ChargebackStatus;
  provider: string;
  claimReason: string;
  date: Date;
  evidenceCount: number;
  customerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chargebackSchema = new Schema<IChargeback>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved_refund', 'resolved_won'],
      default: 'open',
      index: true,
    },
    provider: { type: String, required: true },
    claimReason: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    evidenceCount: { type: Number, default: 0 },
    customerName: { type: String },
  },
  { timestamps: true }
);

chargebackSchema.index({ status: 1 });
chargebackSchema.index({ date: -1 });

export const Chargeback = mongoose.model<IChargeback>('Chargeback', chargebackSchema);
