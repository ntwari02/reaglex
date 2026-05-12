import mongoose, { Document, Schema } from 'mongoose';

/**
 * Category adjacency graph — deterministic taxonomy that the orchestrator
 * uses to expand a buyer's interest beyond the categories they've literally
 * clicked. Example edges (weight):
 *   laptop      → mouse         0.80
 *   laptop      → keyboard      0.75
 *   keyboard    → headset       0.55
 *   smartphone  → charger       0.85
 *
 * The matrix is bootstrapped from co-purchase patterns (see
 * `coOccurrenceEngine.recomputeCategoryAdjacency`) and can also be hand-edited
 * by admins for catalog launches.
 */

export interface ICategoryAdjacency extends Document {
  category: string;
  neighbours: Array<{
    category: string;
    weight: number;
    source: 'auto' | 'manual';
  }>;
  /** Time we last refreshed neighbour weights from co-occurrence data. */
  recomputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const categoryAdjacencySchema = new Schema<ICategoryAdjacency>(
  {
    category: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    neighbours: {
      type: [
        new Schema(
          {
            category: { type: String, required: true, trim: true, lowercase: true },
            weight: { type: Number, default: 0 },
            source: { type: String, enum: ['auto', 'manual'], default: 'auto' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    recomputedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const CategoryAdjacency = mongoose.model<ICategoryAdjacency>(
  'CategoryAdjacency',
  categoryAdjacencySchema,
);
