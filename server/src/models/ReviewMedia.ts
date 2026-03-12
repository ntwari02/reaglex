import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewMedia extends Document {
  reviewId: mongoose.Types.ObjectId;
  customerName: string;
  productName: string;
  imageUrl: string;
  flagged: boolean;
  inappropriate: boolean;
  uploadedAt: Date;
}

const reviewMediaSchema = new Schema<IReviewMedia>(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'ProductReview', required: true },
    customerName: { type: String, default: '' },
    productName: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    flagged: { type: Boolean, default: false },
    inappropriate: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

reviewMediaSchema.index({ reviewId: 1 });

export const ReviewMedia = mongoose.model<IReviewMedia>('ReviewMedia', reviewMediaSchema);
