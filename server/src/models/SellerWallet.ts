import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerWalletBalance {
  pending: number; // funds in escrow (cents)
  available: number; // released, can withdraw (cents)
  withdrawn: number; // already withdrawn (cents)
}

export interface ISellerWallet extends Document {
  sellerId: mongoose.Types.ObjectId;
  flutterwaveSubaccountId?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  businessName?: string;
  mobileMoneyNumber?: string;
  currency: string;
  country: string;
  balance: ISellerWalletBalance;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sellerWalletSchema = new Schema<ISellerWallet>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    flutterwaveSubaccountId: { type: String },
    bankCode: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
    businessName: { type: String },
    mobileMoneyNumber: { type: String },
    currency: { type: String, default: 'USD' },
    country: { type: String, default: 'RW' },
    balance: {
      pending: { type: Number, default: 0 },
      available: { type: Number, default: 0 },
      withdrawn: { type: Number, default: 0 },
    },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SellerWallet = mongoose.model<ISellerWallet>('SellerWallet', sellerWalletSchema);

