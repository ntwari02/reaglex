import mongoose, { Document, Schema } from 'mongoose';

export interface IProductWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productWishlistSchema = new Schema<IProductWishlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true }
);

// One wishlist record per user/product.
productWishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
productWishlistSchema.index({ productId: 1, createdAt: -1 });

export const ProductWishlist = mongoose.model<IProductWishlist>(
  'ProductWishlist',
  productWishlistSchema
);

