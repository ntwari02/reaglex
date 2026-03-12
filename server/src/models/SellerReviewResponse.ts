import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerReviewResponse extends Document {
  reviewId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  sellerName: string;
  customerName: string;
  response: string;
  status: 'approved' | 'pending' | 'rejected';
  flagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sellerReviewResponseSchema = new Schema<ISellerReviewResponse>(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'ProductReview', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    customerName: { type: String, default: '' },
    response: { type: String, required: true },
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'pending' },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sellerReviewResponseSchema.index({ reviewId: 1 });
sellerReviewResponseSchema.index({ status: 1 });

export const SellerReviewResponse = mongoose.model<ISellerReviewResponse>(
  'SellerReviewResponse',
  sellerReviewResponseSchema
);
