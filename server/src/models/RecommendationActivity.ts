import mongoose, { Document, Schema } from 'mongoose';

export type RecommendationActivityType =
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'product_view'
  | 'cart_add'
  | 'cart_remove'
  | 'purchase'
  | 'category_interaction'
  | 'tag_interaction';

export interface IRecommendationActivity extends Document {
  userId: mongoose.Types.ObjectId;
  eventType: RecommendationActivityType;
  productId?: mongoose.Types.ObjectId;
  category?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationActivitySchema = new Schema<IRecommendationActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'wishlist_add',
        'wishlist_remove',
        'product_view',
        'cart_add',
        'cart_remove',
        'purchase',
        'category_interaction',
        'tag_interaction',
      ],
      index: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    category: { type: String, trim: true, index: true },
    tags: { type: [String], default: [] },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

recommendationActivitySchema.index({ userId: 1, createdAt: -1 });
recommendationActivitySchema.index({ userId: 1, eventType: 1, createdAt: -1 });

export const RecommendationActivity = mongoose.model<IRecommendationActivity>(
  'RecommendationActivity',
  recommendationActivitySchema,
);

