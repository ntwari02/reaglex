import mongoose, { Document, Schema } from 'mongoose';

export interface ISuspiciousReview extends Document {
  reviewId: mongoose.Types.ObjectId;
  customerName: string;
  productName: string;
  trigger: string;
  riskLevel: 'high' | 'medium' | 'low';
  evidence: string[];
  createdAt: Date;
  updatedAt: Date;
}

const suspiciousReviewSchema = new Schema<ISuspiciousReview>(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'ProductReview', required: true },
    customerName: { type: String, required: true },
    productName: { type: String, required: true },
    trigger: { type: String, default: '' },
    riskLevel: { type: String, enum: ['high', 'medium', 'low'], required: true },
    evidence: [{ type: String }],
  },
  { timestamps: true }
);

suspiciousReviewSchema.index({ riskLevel: 1 });

export const SuspiciousReview = mongoose.model<ISuspiciousReview>(
  'SuspiciousReview',
  suspiciousReviewSchema
);
