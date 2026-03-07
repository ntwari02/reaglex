import mongoose, { Document, Schema } from 'mongoose';

export interface IProductReview extends Document {
  userId?: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  productId: mongoose.Types.ObjectId;
  productName: string;
  orderId: string;
  rating: number;
  message: string;
  images: string[];
  status: 'approved' | 'pending' | 'rejected' | 'flagged';
  sellerResponse?: string;
  createdAt: Date;
  updatedAt: Date;
  aiScore?: number;
  flagged: boolean;
}

const productReviewSchema = new Schema<IProductReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    orderId: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, default: '' },
    images: [{ type: String }],
    status: { type: String, enum: ['approved', 'pending', 'rejected', 'flagged'], default: 'pending' },
    sellerResponse: { type: String },
    aiScore: { type: Number },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productReviewSchema.index({ status: 1 });
productReviewSchema.index({ productId: 1 });
productReviewSchema.index({ createdAt: -1 });

export const ProductReview = mongoose.model<IProductReview>('ProductReview', productReviewSchema);
