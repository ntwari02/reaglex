import mongoose, { Document, Schema } from 'mongoose';

/**
 * Buyer-side trust profile. Symmetrical to `SellerTrustProfile`.
 *
 * Used by the orchestrator to:
 *  - rate-limit refund abusers
 *  - hide "free returns" badges for chronic returners
 *  - reward consistent buyers with VIP / loyalty perks
 *  - feed the fraud graph (low buyer trust + clustering = bot)
 *
 * Scoring is deterministic — every input weighted explicitly. No ML.
 */

export type BuyerTrustTier = 'new' | 'trusted' | 'verified' | 'gold' | 'platinum' | 'flagged';

export interface IBuyerTrustProfile extends Document {
  userId: mongoose.Types.ObjectId;
  trustScore: number; // 0..100
  tier: BuyerTrustTier;

  // Positive signals
  totalOrders: number;
  paidOrders: number;
  consistencyScore: number; // 0..1 — purchase regularity over time
  loyaltyScore: number; // 0..1 — repeat purchases from same sellers
  reviewQualityScore: number; // 0..1 — readable, non-spammy reviews
  accountAgeDays: number;

  // Negative signals
  refundRate: number; // 0..1
  abuseFlags: number; // count of moderation actions
  chargebackCount: number;
  disputeRate: number; // 0..1
  fraudReports: number;
  suspiciousActivityScore: number; // 0..1

  /** When `tier` last changed (used for tier-grace logic). */
  tierSetAt: Date;
  /** Last automated recompute. */
  recomputedAt: Date;
  /** Free-form reasons that drove the latest score (for admin UX). */
  reasons: string[];

  createdAt: Date;
  updatedAt: Date;
}

const buyerTrustProfileSchema = new Schema<IBuyerTrustProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    trustScore: { type: Number, default: 50, min: 0, max: 100, index: true },
    tier: {
      type: String,
      enum: ['new', 'trusted', 'verified', 'gold', 'platinum', 'flagged'],
      default: 'new',
      index: true,
    },
    totalOrders: { type: Number, default: 0 },
    paidOrders: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0, min: 0, max: 1 },
    loyaltyScore: { type: Number, default: 0, min: 0, max: 1 },
    reviewQualityScore: { type: Number, default: 0.5, min: 0, max: 1 },
    accountAgeDays: { type: Number, default: 0 },
    refundRate: { type: Number, default: 0, min: 0, max: 1 },
    abuseFlags: { type: Number, default: 0 },
    chargebackCount: { type: Number, default: 0 },
    disputeRate: { type: Number, default: 0, min: 0, max: 1 },
    fraudReports: { type: Number, default: 0 },
    suspiciousActivityScore: { type: Number, default: 0, min: 0, max: 1 },
    tierSetAt: { type: Date, default: Date.now },
    recomputedAt: { type: Date, default: Date.now },
    reasons: { type: [String], default: [] },
  },
  { timestamps: true },
);

buyerTrustProfileSchema.index({ trustScore: -1 });
buyerTrustProfileSchema.index({ tier: 1, recomputedAt: -1 });

export const BuyerTrustProfile = mongoose.model<IBuyerTrustProfile>(
  'BuyerTrustProfile',
  buyerTrustProfileSchema,
);
