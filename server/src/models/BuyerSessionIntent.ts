import mongoose, { Document, Schema } from 'mongoose';

/**
 * Live session intent — captures what the buyer is *currently thinking
 * about* (recent searches, viewed categories, dwell time peaks). The home
 * feed reads this on every request so the storefront reacts within seconds
 * to behavioral pivots (e.g. user searches "gaming keyboard" → next page
 * load is gaming-themed).
 *
 * Keyed by `sessionId` (anonymous-friendly) and optionally linked to a
 * `userId` when authenticated. Auto-expires after 6 hours.
 */
/**
 * Deterministic intent modes. The classifier (`intentClassifier.ts`)
 * derives the current mode from recent events, dwell-time, cart velocity,
 * discount affinity and price filters. No ML — pure state-machine rules.
 */
export type BuyerIntentMode =
  | 'discovery'        // passive browsing, low engagement
  | 'research'         // long dwell, comparing
  | 'impulse'          // rapid clicks + cart adds
  | 'luxury'           // premium price filter / brand affinity
  | 'bargain'          // discount-hunter
  | 'decisive'         // high cart→purchase ratio
  | 'returning_buyer'  // repeat purchases same category
  | 'dormant';         // long-idle then revisit

export type EngagementLevel = 'cold' | 'warm' | 'hot' | 'on_fire';
export type PriceBucket = 'value' | 'mid' | 'premium' | 'luxury' | 'unknown';

export interface ISessionEventRef {
  type: string;
  productId?: string;
  category?: string;
  query?: string;
  at: Date;
}

export interface ISellerExposureBucket {
  sellerId: string;
  impressions: number;
  lastShownAt: Date;
}

export interface IBuyerSessionIntent extends Document {
  sessionId: string;
  userId?: mongoose.Types.ObjectId;

  // Recent activity (capped, most-recent-first)
  recentSearches: string[];
  recentCategories: string[];
  recentTags: string[];
  recentProductIds: string[];

  // Behavioral mood signals (heuristic)
  /** 0..1 — bargain-hunter mood (clicked many discounts). */
  dealMood: number;
  /** 0..1 — luxury/premium mood. */
  premiumMood: number;
  /** 0..1 — exploration mood vs. focused buying. */
  exploreMood: number;
  /** Scroll velocity bucket: 'fast'|'medium'|'slow'. */
  scrollPattern: 'fast' | 'medium' | 'slow' | 'unknown';
  /** Dwell-time average across viewed products in this session (seconds). */
  avgDwellSec: number;

  // ── State-machine fields (deterministic rule-based intelligence) ─────
  /** Current intent mode. */
  mode: BuyerIntentMode;
  /** Previous mode (so we know the transition). */
  previousMode?: BuyerIntentMode;
  /** When the current mode took effect. */
  modeSetAt?: Date;
  /** Cold→warm→hot→on_fire engagement level. */
  engagementLevel: EngagementLevel;
  /** Numeric engagement score 0..100 (drives engagementLevel). */
  engagementScore: number;
  /** Detected price sensitivity bucket. */
  priceBucket: PriceBucket;
  /** Last N events (capped, most-recent-first) for rule replay. */
  lastEvents: ISessionEventRef[];
  /** Per-seller impression counter for the fairness engine. */
  sellerExposure: ISellerExposureBucket[];
  /** Total impressions surfaced in this session (across all feeds). */
  totalImpressions: number;
  /** Total clicks recorded in this session. */
  totalClicks: number;
  /** Cart adds in this session. */
  totalCartAdds: number;
  /** Purchases in this session. */
  totalPurchases: number;

  // Context
  device: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  country?: string;
  city?: string;
  timezoneOffsetMin?: number;
  localHour?: number;

  // Bandit state — last bucket chosen for this session (helps exploration).
  banditArm?: string;

  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const buyerSessionIntentSchema = new Schema<IBuyerSessionIntent>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    recentSearches: { type: [String], default: [] },
    recentCategories: { type: [String], default: [] },
    recentTags: { type: [String], default: [] },
    recentProductIds: { type: [String], default: [] },

    dealMood: { type: Number, default: 0 },
    premiumMood: { type: Number, default: 0 },
    exploreMood: { type: Number, default: 0 },
    scrollPattern: {
      type: String,
      enum: ['fast', 'medium', 'slow', 'unknown'],
      default: 'unknown',
    },
    avgDwellSec: { type: Number, default: 0 },

    mode: {
      type: String,
      enum: [
        'discovery',
        'research',
        'impulse',
        'luxury',
        'bargain',
        'decisive',
        'returning_buyer',
        'dormant',
      ],
      default: 'discovery',
      index: true,
    },
    previousMode: {
      type: String,
      enum: [
        'discovery',
        'research',
        'impulse',
        'luxury',
        'bargain',
        'decisive',
        'returning_buyer',
        'dormant',
      ],
    },
    modeSetAt: { type: Date },
    engagementLevel: {
      type: String,
      enum: ['cold', 'warm', 'hot', 'on_fire'],
      default: 'cold',
    },
    engagementScore: { type: Number, default: 0 },
    priceBucket: {
      type: String,
      enum: ['value', 'mid', 'premium', 'luxury', 'unknown'],
      default: 'unknown',
    },
    lastEvents: {
      type: [
        new Schema(
          {
            type: { type: String, required: true },
            productId: { type: String },
            category: { type: String },
            query: { type: String },
            at: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    sellerExposure: {
      type: [
        new Schema(
          {
            sellerId: { type: String, required: true },
            impressions: { type: Number, default: 0 },
            lastShownAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalCartAdds: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },

    device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'unknown'], default: 'unknown' },
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    timezoneOffsetMin: { type: Number },
    localHour: { type: Number },

    banditArm: { type: String, trim: true },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 6 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true },
);

export const BuyerSessionIntent = mongoose.model<IBuyerSessionIntent>(
  'BuyerSessionIntent',
  buyerSessionIntentSchema,
);
