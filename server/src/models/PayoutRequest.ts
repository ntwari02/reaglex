import mongoose, { Document, Schema } from 'mongoose';

export type PayoutRequestStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IPayoutRequest extends Document {
  sellerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PayoutRequestStatus;
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  paymentMethod: string;
  referenceId?: string;
  commissionDeducted: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableForWithdrawal: number;
  disputeHolds: number;
  createdAt: Date;
  updatedAt: Date;
}

const payoutRequestSchema = new Schema<IPayoutRequest>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    requestedDate: { type: Date, required: true, default: Date.now },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    paymentMethod: { type: String, required: true },
    referenceId: { type: String },
    commissionDeducted: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pendingEarnings: { type: Number, default: 0 },
    availableForWithdrawal: { type: Number, default: 0 },
    disputeHolds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ sellerId: 1, status: 1 });
payoutRequestSchema.index({ requestedDate: -1 });

export const PayoutRequest = mongoose.model<IPayoutRequest>('PayoutRequest', payoutRequestSchema);
