import mongoose, { Document, Schema } from 'mongoose';

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type RefundType = 'full' | 'partial';

export interface IRefundRequest extends Document {
  orderId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  amount: number;
  type: RefundType;
  status: RefundStatus;
  reason: string;
  requestedDate: Date;
  processedDate?: Date;
  refundMethod: string;
  hasEvidence: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const refundRequestSchema = new Schema<IRefundRequest>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['full', 'partial'], default: 'full' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    reason: { type: String, required: true },
    requestedDate: { type: Date, default: Date.now },
    processedDate: { type: Date },
    refundMethod: { type: String, default: 'Original Payment Method' },
    hasEvidence: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refundRequestSchema.index({ status: 1, requestedDate: -1 });

export const RefundRequest = mongoose.model<IRefundRequest>('RefundRequest', refundRequestSchema);
