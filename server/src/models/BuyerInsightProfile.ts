import mongoose, { Document, Schema } from 'mongoose';

export type BuyerSegment = 'new' | 'active' | 'at_risk' | 'dormant' | 'vip';

export interface IBuyerInsightProfile extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;

  // Account activity
  signupAt?: Date;
  lastLoginAt?: Date;
  loginCount30d: number;

  // Purchase history
  orderCount: number;
  totalSpendUsd: number;
  avgOrderValueUsd: number;
  lastOrderAt?: Date;

  // Browsing / cart / wishlist signals (derived)
  lastActivityAt?: Date;
  lastViewedProductIds: string[];
  lastCartProductIds: string[];
  wishlistProductIds: string[];
  abandonedCartCount30d: number;

  // Engagement
  emailOpens90d: number;
  emailClicks90d: number;
  lastEmailOpenAt?: Date;
  lastEmailClickAt?: Date;

  // Location & device (best-effort, no external geo API)
  lastKnownCountry?: string;
  lastKnownCity?: string;
  lastKnownIp?: string;
  lastKnownUserAgent?: string;
  deviceType?: 'mobile' | 'desktop' | 'unknown';

  // Timing patterns
  activeHoursUtc: number[]; // length 24

  // Interests / preferences
  categoryAffinity: Record<string, number>;
  tagAffinity: Record<string, number>;
  discountAffinity: number; // higher = deal-seeker
  pricePreferenceUsd?: { min: number; max: number; median: number };

  // Segmentation
  segment: BuyerSegment;
  score: number;
  /** 0-100 — how confident we are that personalization matches this buyer right now */
  confidenceScore: number;
  confidenceReason?: string;

  // Automation bookkeeping
  lastWinbackSentAt?: Date;
  lastVipPromoSentAt?: Date;
  lastCartPulseSentAt?: Date;
  lastBrowseAbandonSentAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const buyerInsightProfileSchema = new Schema<IBuyerInsightProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },

    signupAt: { type: Date, index: true },
    lastLoginAt: { type: Date, index: true },
    loginCount30d: { type: Number, default: 0 },

    orderCount: { type: Number, default: 0, index: true },
    totalSpendUsd: { type: Number, default: 0, index: true },
    avgOrderValueUsd: { type: Number, default: 0 },
    lastOrderAt: { type: Date, index: true },

    lastActivityAt: { type: Date, index: true },
    lastViewedProductIds: { type: [String], default: [] },
    lastCartProductIds: { type: [String], default: [] },
    wishlistProductIds: { type: [String], default: [] },
    abandonedCartCount30d: { type: Number, default: 0 },

    emailOpens90d: { type: Number, default: 0 },
    emailClicks90d: { type: Number, default: 0 },
    lastEmailOpenAt: { type: Date },
    lastEmailClickAt: { type: Date },

    lastKnownCountry: { type: String, trim: true },
    lastKnownCity: { type: String, trim: true },
    lastKnownIp: { type: String, trim: true },
    lastKnownUserAgent: { type: String, trim: true },
    deviceType: { type: String, enum: ['mobile', 'desktop', 'unknown'], default: 'unknown' },

    activeHoursUtc: { type: [Number], default: () => Array.from({ length: 24 }).map(() => 0) },

    categoryAffinity: { type: Schema.Types.Mixed, default: {} },
    tagAffinity: { type: Schema.Types.Mixed, default: {} },
    discountAffinity: { type: Number, default: 0 },
    pricePreferenceUsd: {
      min: { type: Number },
      max: { type: Number },
      median: { type: Number },
    },

    segment: { type: String, enum: ['new', 'active', 'at_risk', 'dormant', 'vip'], default: 'new', index: true },
    score: { type: Number, default: 0, index: true },
    confidenceScore: { type: Number, default: 0, index: true },
    confidenceReason: { type: String, trim: true },

    lastWinbackSentAt: { type: Date, index: true },
    lastVipPromoSentAt: { type: Date, index: true },
    lastCartPulseSentAt: { type: Date, index: true },
    lastBrowseAbandonSentAt: { type: Date, index: true },
  },
  { timestamps: true },
);

buyerInsightProfileSchema.index({ segment: 1, score: -1 });
buyerInsightProfileSchema.index({ confidenceScore: -1, segment: 1 });
buyerInsightProfileSchema.index({ lastActivityAt: -1 });

export const BuyerInsightProfile = mongoose.model<IBuyerInsightProfile>(
  'BuyerInsightProfile',
  buyerInsightProfileSchema,
);

