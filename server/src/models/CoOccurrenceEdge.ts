import mongoose, { Document, Schema } from 'mongoose';

/**
 * Co-occurrence graph edge between two products.
 *
 * Each row records "product A and product B were observed in the same
 * basket / wishlist / co-view window". The engine increments the weight on
 * every confirmed co-occurrence event and applies an exponential time
 * decay (see `coOccurrenceEngine.ts`), so a 6-month-old basket is worth
 * roughly 6% of a fresh one — without any ML.
 *
 * The edge is stored normalised: `productA < productB` (string compare),
 * so we never store duplicates (A↔B and B↔A).
 *
 * Index: lookup neighbours of a product by `productA` or `productB`.
 */

export type CoOccurrenceSource = 'co_view' | 'co_cart' | 'co_purchase' | 'co_wishlist';

export interface ICoOccurrenceEdge extends Document {
  productA: mongoose.Types.ObjectId;
  productB: mongoose.Types.ObjectId;
  weight: number;
  /** Per-source counters so we can boost "bought together" over "viewed together". */
  counters: {
    co_view: number;
    co_cart: number;
    co_purchase: number;
    co_wishlist: number;
  };
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const coOccurrenceEdgeSchema = new Schema<ICoOccurrenceEdge>(
  {
    productA: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productB: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    weight: { type: Number, default: 0, index: true },
    counters: {
      co_view: { type: Number, default: 0 },
      co_cart: { type: Number, default: 0 },
      co_purchase: { type: Number, default: 0 },
      co_wishlist: { type: Number, default: 0 },
    },
    lastSeenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

coOccurrenceEdgeSchema.index({ productA: 1, productB: 1 }, { unique: true });
coOccurrenceEdgeSchema.index({ productA: 1, weight: -1 });
coOccurrenceEdgeSchema.index({ productB: 1, weight: -1 });

export const CoOccurrenceEdge = mongoose.model<ICoOccurrenceEdge>(
  'CoOccurrenceEdge',
  coOccurrenceEdgeSchema,
);
