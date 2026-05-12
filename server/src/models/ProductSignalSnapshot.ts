import mongoose, { Document, Schema } from 'mongoose';

/**
 * Cached rolling-window analytics per product. A periodic worker (see
 * `productSignalsWorker`) recomputes these from raw `RecommendationActivity`
 * events so the ranking engine can fetch a single document per product
 * instead of scanning event logs on every request.
 *
 * No external paid AI is needed — every value is a deterministic statistical
 * roll-up across a windowed event sample.
 */
export interface IProductSignalSnapshot extends Document {
  productId: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId;
  category?: string;

  // Rolling counts (7d window)
  views7d: number;
  clicks7d: number;
  cartAdds7d: number;
  purchases7d: number;
  wishlistAdds7d: number;
  uniqueUsers7d: number;

  // Rolling counts (24h window) used for trend detection
  views24h: number;
  clicks24h: number;
  cartAdds24h: number;
  purchases24h: number;

  // Derived scores 0..1
  ctr: number;          // clicks / impressions
  conversion: number;   // purchases / clicks
  engagementRate: number; // (carts + wishlists) / views
  /** 0..100 — how trending vs its own baseline. */
  trendScore: number;
  /** 0..100 — composite quality (used for ad ranking & fraud filter). */
  qualityScore: number;
  /** 0..1 — likelihood the listing is fraudulent / faked. */
  fraudRisk: number;

  /** Last time the worker rebuilt this snapshot. */
  recomputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const productSignalSnapshotSchema = new Schema<IProductSignalSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, trim: true, index: true },

    views7d: { type: Number, default: 0 },
    clicks7d: { type: Number, default: 0 },
    cartAdds7d: { type: Number, default: 0 },
    purchases7d: { type: Number, default: 0 },
    wishlistAdds7d: { type: Number, default: 0 },
    uniqueUsers7d: { type: Number, default: 0 },

    views24h: { type: Number, default: 0 },
    clicks24h: { type: Number, default: 0 },
    cartAdds24h: { type: Number, default: 0 },
    purchases24h: { type: Number, default: 0 },

    ctr: { type: Number, default: 0, index: true },
    conversion: { type: Number, default: 0, index: true },
    engagementRate: { type: Number, default: 0 },
    trendScore: { type: Number, default: 0, index: true },
    qualityScore: { type: Number, default: 50, index: true },
    fraudRisk: { type: Number, default: 0, index: true },

    recomputedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

productSignalSnapshotSchema.index({ trendScore: -1, recomputedAt: -1 });
productSignalSnapshotSchema.index({ qualityScore: -1 });
productSignalSnapshotSchema.index({ category: 1, trendScore: -1 });

export const ProductSignalSnapshot = mongoose.model<IProductSignalSnapshot>(
  'ProductSignalSnapshot',
  productSignalSnapshotSchema,
);
