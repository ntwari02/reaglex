import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerRating extends Document {
  sellerId: mongoose.Types.ObjectId;
  sellerName: string;
  storeName: string;
  overallRating: number;
  communication: number;
  shippingSpeed: number;
  productQuality: number;
  totalReviews: number;
  status: 'good' | 'warning' | 'poor';
  updatedAt: Date;
}

const sellerRatingSchema = new Schema<ISellerRating>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    storeName: { type: String, required: true },
    overallRating: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    shippingSpeed: { type: Number, default: 0 },
    productQuality: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    status: { type: String, enum: ['good', 'warning', 'poor'], default: 'good' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

sellerRatingSchema.index({ sellerId: 1 });

export const SellerRating = mongoose.model<ISellerRating>('SellerRating', sellerRatingSchema);
