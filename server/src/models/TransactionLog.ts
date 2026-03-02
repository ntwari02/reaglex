import mongoose, { Schema, Types } from 'mongoose';

export type TransactionType = 'PAYMENT' | 'RELEASE' | 'REFUND' | 'FEE' | 'WITHDRAWAL';

export interface ITransactionLog {
  type: TransactionType;
  orderId?: Types.ObjectId;
  buyerId?: Types.ObjectId;
  sellerId?: Types.ObjectId;
  amount: number;
  currency: string;
  flutterwaveRef?: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

const transactionLogSchema = new Schema<ITransactionLog>(
  {
    type: {
      type: String,
      enum: ['PAYMENT', 'RELEASE', 'REFUND', 'FEE', 'WITHDRAWAL'],
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    flutterwaveRef: { type: String },
    status: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

transactionLogSchema.index({ orderId: 1, type: 1 });
transactionLogSchema.index({ sellerId: 1, type: 1 });

export const TransactionLog = mongoose.model<ITransactionLog>('TransactionLog', transactionLogSchema);

