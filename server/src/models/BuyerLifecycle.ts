import mongoose, { Document, Schema } from 'mongoose';

/**
 * Long-term lifecycle tracker for each buyer.
 *
 * Distinct from `BuyerInsightProfile` (which is a denormalised analytics
 * cache) — this is a *state-machine* describing where the buyer is in
 * their relationship with the marketplace. The orchestrator reads this on
 * every feed request and adapts the section plan accordingly:
 *
 *   new       → first 72h after signup, never purchased
 *   explorer  → ≥3 sessions, no purchase yet
 *   buyer     → 1 paid order
 *   loyal     → ≥3 paid orders within the last 90 days
 *   vip       → ≥10 paid orders OR lifetime spend ≥ $500
 *   dormant   → no activity for ≥30 days
 *   returning → reactivated after dormancy (transient state, decays back
 *               into buyer/loyal after the first new event)
 *
 * Transitions are recorded so analytics can graph the funnel.
 */

export type LifecycleState =
  | 'new'
  | 'explorer'
  | 'buyer'
  | 'loyal'
  | 'vip'
  | 'dormant'
  | 'returning';

export interface ILifecycleTransition {
  from?: LifecycleState;
  to: LifecycleState;
  at: Date;
  reason?: string;
}

export interface IBuyerLifecycle extends Document {
  userId: mongoose.Types.ObjectId;
  email?: string;
  state: LifecycleState;
  previousState?: LifecycleState;
  /** When the current state took effect. */
  stateSetAt: Date;
  /** Last 10 transitions (oldest pushed out). */
  history: ILifecycleTransition[];

  // Short summary stats that drive transitions — kept here so the
  // orchestrator never has to join with BuyerInsightProfile to read state.
  sessionCount: number;
  orderCount: number;
  totalSpendUsd: number;
  lastActivityAt?: Date;
  lastPurchaseAt?: Date;
  dormantSince?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const buyerLifecycleSchema = new Schema<IBuyerLifecycle>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    state: {
      type: String,
      enum: ['new', 'explorer', 'buyer', 'loyal', 'vip', 'dormant', 'returning'],
      default: 'new',
      index: true,
    },
    previousState: {
      type: String,
      enum: ['new', 'explorer', 'buyer', 'loyal', 'vip', 'dormant', 'returning'],
    },
    stateSetAt: { type: Date, default: Date.now, index: true },
    history: {
      type: [
        new Schema(
          {
            from: { type: String },
            to: { type: String, required: true },
            at: { type: Date, default: Date.now },
            reason: { type: String, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    sessionCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    totalSpendUsd: { type: Number, default: 0 },
    lastActivityAt: { type: Date, index: true },
    lastPurchaseAt: { type: Date, index: true },
    dormantSince: { type: Date },
  },
  { timestamps: true },
);

buyerLifecycleSchema.index({ state: 1, lastActivityAt: -1 });

export const BuyerLifecycle = mongoose.model<IBuyerLifecycle>('BuyerLifecycle', buyerLifecycleSchema);
