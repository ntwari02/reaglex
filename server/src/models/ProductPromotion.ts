import mongoose, { Document, Schema } from 'mongoose';

export interface IProductPromotion extends Document {
  type: 'featured' | 'homepage' | 'trending' | 'recommended' | 'boost';
  productName: string;
  productId?: mongoose.Types.ObjectId;
  position: string;
  status: 'active' | 'inactive';
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const productPromotionSchema = new Schema<IProductPromotion>(
  {
    type: {
      type: String,
      enum: ['featured', 'homepage', 'trending', 'recommended', 'boost'],
      required: true,
    },
    productName: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    position: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productPromotionSchema.index({ status: 1 });

export const ProductPromotion = mongoose.model<IProductPromotion>(
  'ProductPromotion',
  productPromotionSchema
);
