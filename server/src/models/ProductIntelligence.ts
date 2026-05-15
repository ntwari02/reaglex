import mongoose, { Document, Schema } from 'mongoose';

/**
 * Per-product slow-moving intelligence — features that change once a day
 * (or once an hour) and are too expensive to recompute on every request.
 *
 * Stores:
 *   - seasonality vector (12 months) — recent activity per calendar month
 *   - hourly engagement curve (24 buckets) — when the product gets viewed
 *   - co-occurrence "best-friends" cache: top-K linked productIds
 *   - conversion-rate history (7d / 30d / 90d) for stability checks
 *
 * Read by the ranking engine to compute "is this seasonal now?",
 * "is this product more popular at night?", etc. — all deterministic.
 */

export interface IProductIntelligence extends Document {
  productId: mongoose.Types.ObjectId;
  category?: string;

  /** Length-12, 0-indexed: Jan..Dec. Each entry is the rolling 90d view count for that calendar month over the past 2 years. */
  seasonalityMonths: number[];
  /** Length-24, 0-indexed: 0..23 UTC. Hourly engagement bucket from the last 30 days. */
  engagementHours: number[];

  /** Cached top co-occurrence neighbours so the home feed never queries the edge table for popular products. */
  bestFriends: Array<{ productId: mongoose.Types.ObjectId; weight: number; source: string }>;

  conversion7d: number;
  conversion30d: number;
  conversion90d: number;

  recomputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const productIntelligenceSchema = new Schema<IProductIntelligence>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
    category: { type: String, trim: true, index: true },

    seasonalityMonths: { type: [Number], default: () => Array.from({ length: 12 }).map(() => 0) },
    engagementHours: { type: [Number], default: () => Array.from({ length: 24 }).map(() => 0) },

    bestFriends: {
      type: [
        new Schema(
          {
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            weight: { type: Number, default: 0 },
            source: { type: String, default: 'co_view' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    conversion7d: { type: Number, default: 0 },
    conversion30d: { type: Number, default: 0 },
    conversion90d: { type: Number, default: 0 },

    recomputedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

export const ProductIntelligence = mongoose.model<IProductIntelligence>(
  'ProductIntelligence',
  productIntelligenceSchema,
);
