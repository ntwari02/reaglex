import mongoose, { Document, Schema } from 'mongoose';

export type InternalWalletType = 'buyer' | 'seller' | 'reward' | 'referral' | 'cashback' | 'credit';

export interface IInternalWallet extends Document {
  userId: mongoose.Types.ObjectId;
  walletType: InternalWalletType;
  currency: string;
  balance: number;
  lockedBalance: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const internalWalletSchema = new Schema<IInternalWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    walletType: {
      type: String,
      enum: ['buyer', 'seller', 'reward', 'referral', 'cashback', 'credit'],
      required: true,
      index: true,
    },
    currency: { type: String, default: 'USD' },
    balance: { type: Number, default: 0 },
    lockedBalance: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

internalWalletSchema.index({ userId: 1, walletType: 1 }, { unique: true });

export const InternalWallet = mongoose.model<IInternalWallet>('InternalWallet', internalWalletSchema);
