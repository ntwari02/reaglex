import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketingCoupon extends Document {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder?: number;
  usageLimit?: number;
  usedCount: number;
  expiryDate: Date;
  status: 'active' | 'expired' | 'disabled';
  applicableTo: string;
  createdAt: Date;
  updatedAt: Date;
}

const marketingCouponSchema = new Schema<IMarketingCoupon>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
    value: { type: Number, default: 0 },
    minOrder: { type: Number },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'expired', 'disabled'], default: 'active' },
    applicableTo: { type: String, default: 'All Products' },
  },
  { timestamps: true }
);

marketingCouponSchema.index({ status: 1 });

export const MarketingCoupon = mongoose.model<IMarketingCoupon>(
  'MarketingCoupon',
  marketingCouponSchema
);
