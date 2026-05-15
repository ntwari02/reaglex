import mongoose, { Document, Schema } from 'mongoose';

/**
 * Marketplace AI Control Center — admin-tunable brain of the marketplace.
 *
 * Singleton document that holds every weight, slider, and global mode the
 * autonomous ranking engine consults on every home-feed request.
 *
 * The values are intentionally low-friction: every slider is 0..100 and the
 * ranking engine normalises them into floating weights, so admins can tune
 * "feel" without thinking about absolute scales.
 *
 * NO paid AI APIs are required — every decision is computed locally using
 * statistical heuristics, multi-armed bandits, and exponential decay.
 */

export type MarketplaceMode =
  | 'balanced'
  | 'profit_max'
  | 'buyer_happiness'
  | 'viral'
  | 'discovery'
  | 'premium_seller'
  | 'fair_market'
  | 'ai_full_auto';

export interface IRankingWeights {
  ctr: number; // click-through rate weight
  conversion: number; // converted/clicks
  personalization: number; // affinity match user ↔ product
  sellerTrust: number; // 0..100 → seller trust
  subscriptionBoost: number; // seller subscription tier bonus
  profitMargin: number; // seller margin proxy (discount inverted)
  freshness: number; // recently listed
  inventoryPressure: number; // high stock auto-boost
  trend: number; // velocity / virality
  engagement: number; // wishlist+cart+view aggregate
  socialProof: number; // rating × reviewCount
  freeDelivery: number; // free / fast shipping flag
  brandAffinity: number; // user ↔ brand history
  exploration: number; // exploration-vs-exploitation (epsilon)
  returnRiskPenalty: number; // subtract when seller has high returns
  fraudPenalty: number; // subtract when fraud signals exist
}

export interface ISliders {
  personalizationStrength: number; // 0..100
  sponsoredAggressiveness: number;
  sellerTrustImportance: number;
  freshnessPriority: number;
  trendBoostStrength: number;
  profitOptimization: number;
  explorationVsExploitation: number;
  buyerRetentionPriority: number;
  conversionOptimization: number;
  inventoryPressurePriority: number;
  aiAutonomyLevel: number;
  fraudDetectionStrictness: number;
}

export interface ITrustTierBoosts {
  bronze: number; // multiplier ~0.95
  silver: number; // ~1.00
  gold: number; // ~1.10
  platinum: number; // ~1.25
  diamond: number; // ~1.40
}

export interface ISubscriptionBoosts {
  free: number;
  pro: number;
  business: number;
  enterprise: number;
}

export interface ISponsoredConfig {
  enabled: boolean;
  maxRatio: number; // max % of home feed allowed to be sponsored (0..100)
  minQualityScore: number; // 0..100 floor — never show low-quality ads even if paid
  cpcWeight: number;
  cpmWeight: number;
}

export interface IMarketplaceAIConfig extends Document {
  mode: MarketplaceMode;
  enabled: boolean;
  /** Lock the system into the chosen mode — admin overrides AI auto-tuning. */
  modeLocked: boolean;
  weights: IRankingWeights;
  sliders: ISliders;
  trustTierBoosts: ITrustTierBoosts;
  subscriptionBoosts: ISubscriptionBoosts;
  sponsored: ISponsoredConfig;
  /** Heuristic learning bookkeeping. */
  lastAutoTunedAt?: Date;
  lastRecomputeAt?: Date;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  createdAt: Date;
  updatedAt: Date;
}

const weightsSchema = new Schema<IRankingWeights>(
  {
    ctr: { type: Number, default: 12 },
    conversion: { type: Number, default: 18 },
    personalization: { type: Number, default: 22 },
    sellerTrust: { type: Number, default: 12 },
    subscriptionBoost: { type: Number, default: 6 },
    profitMargin: { type: Number, default: 4 },
    freshness: { type: Number, default: 6 },
    inventoryPressure: { type: Number, default: 4 },
    trend: { type: Number, default: 10 },
    engagement: { type: Number, default: 10 },
    socialProof: { type: Number, default: 8 },
    freeDelivery: { type: Number, default: 3 },
    brandAffinity: { type: Number, default: 4 },
    exploration: { type: Number, default: 6 },
    returnRiskPenalty: { type: Number, default: 8 },
    fraudPenalty: { type: Number, default: 20 },
  },
  { _id: false },
);

const slidersSchema = new Schema<ISliders>(
  {
    personalizationStrength: { type: Number, default: 70 },
    sponsoredAggressiveness: { type: Number, default: 30 },
    sellerTrustImportance: { type: Number, default: 65 },
    freshnessPriority: { type: Number, default: 45 },
    trendBoostStrength: { type: Number, default: 55 },
    profitOptimization: { type: Number, default: 40 },
    explorationVsExploitation: { type: Number, default: 35 },
    buyerRetentionPriority: { type: Number, default: 70 },
    conversionOptimization: { type: Number, default: 65 },
    inventoryPressurePriority: { type: Number, default: 40 },
    aiAutonomyLevel: { type: Number, default: 60 },
    fraudDetectionStrictness: { type: Number, default: 70 },
  },
  { _id: false },
);

const marketplaceAIConfigSchema = new Schema<IMarketplaceAIConfig>(
  {
    mode: {
      type: String,
      enum: [
        'balanced',
        'profit_max',
        'buyer_happiness',
        'viral',
        'discovery',
        'premium_seller',
        'fair_market',
        'ai_full_auto',
      ],
      default: 'balanced',
    },
    enabled: { type: Boolean, default: true },
    modeLocked: { type: Boolean, default: false },
    weights: { type: weightsSchema, default: () => ({}) },
    sliders: { type: slidersSchema, default: () => ({}) },
    trustTierBoosts: {
      bronze: { type: Number, default: 0.95 },
      silver: { type: Number, default: 1.0 },
      gold: { type: Number, default: 1.1 },
      platinum: { type: Number, default: 1.25 },
      diamond: { type: Number, default: 1.4 },
    },
    subscriptionBoosts: {
      free: { type: Number, default: 1.0 },
      pro: { type: Number, default: 1.08 },
      business: { type: Number, default: 1.18 },
      enterprise: { type: Number, default: 1.32 },
    },
    sponsored: {
      enabled: { type: Boolean, default: true },
      maxRatio: { type: Number, default: 20 },
      minQualityScore: { type: Number, default: 55 },
      cpcWeight: { type: Number, default: 0.6 },
      cpmWeight: { type: Number, default: 0.4 },
    },
    lastAutoTunedAt: { type: Date },
    lastRecomputeAt: { type: Date },
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const MarketplaceAIConfig = mongoose.model<IMarketplaceAIConfig>(
  'MarketplaceAIConfig',
  marketplaceAIConfigSchema,
);

let cachedDoc: IMarketplaceAIConfig | null = null;
let cachedAt = 0;
const CACHE_MS = 30 * 1000;

export async function getMarketplaceAIConfig(): Promise<IMarketplaceAIConfig> {
  if (cachedDoc && Date.now() - cachedAt < CACHE_MS) return cachedDoc;
  let doc = await MarketplaceAIConfig.findOne();
  if (!doc) doc = await MarketplaceAIConfig.create({});
  cachedDoc = doc;
  cachedAt = Date.now();
  return doc;
}

export function invalidateMarketplaceAIConfigCache(): void {
  cachedDoc = null;
  cachedAt = 0;
}

/**
 * Apply a built-in preset on top of the current document. Returns the
 * mutated doc (caller must save). Lets admins flip into a feel instantly
 * (e.g. "Viral mode") without manually nudging every slider.
 */
export function applyPreset(
  doc: IMarketplaceAIConfig,
  mode: MarketplaceMode,
): IMarketplaceAIConfig {
  const W = doc.weights;
  const S = doc.sliders;
  doc.mode = mode;

  switch (mode) {
    case 'profit_max':
      W.profitMargin = 18;
      W.conversion = 22;
      W.subscriptionBoost = 12;
      W.sellerTrust = 10;
      W.exploration = 2;
      S.profitOptimization = 90;
      S.sponsoredAggressiveness = 60;
      S.explorationVsExploitation = 15;
      break;
    case 'buyer_happiness':
      W.sellerTrust = 22;
      W.conversion = 14;
      W.returnRiskPenalty = 16;
      W.fraudPenalty = 28;
      W.personalization = 26;
      S.sellerTrustImportance = 90;
      S.buyerRetentionPriority = 95;
      S.sponsoredAggressiveness = 10;
      S.fraudDetectionStrictness = 90;
      break;
    case 'viral':
      W.trend = 26;
      W.engagement = 16;
      W.freshness = 12;
      W.exploration = 10;
      S.trendBoostStrength = 95;
      S.freshnessPriority = 80;
      S.explorationVsExploitation = 65;
      break;
    case 'discovery':
      W.exploration = 22;
      W.freshness = 16;
      W.personalization = 10;
      W.trend = 14;
      S.explorationVsExploitation = 90;
      S.personalizationStrength = 30;
      break;
    case 'premium_seller':
      W.sellerTrust = 22;
      W.subscriptionBoost = 18;
      doc.subscriptionBoosts.enterprise = 1.6;
      doc.subscriptionBoosts.business = 1.3;
      doc.trustTierBoosts.diamond = 1.55;
      doc.trustTierBoosts.platinum = 1.35;
      S.sellerTrustImportance = 80;
      break;
    case 'fair_market':
      W.subscriptionBoost = 2;
      doc.subscriptionBoosts.enterprise = 1.05;
      doc.subscriptionBoosts.business = 1.03;
      doc.subscriptionBoosts.pro = 1.01;
      W.sellerTrust = 14;
      W.personalization = 18;
      S.sponsoredAggressiveness = 12;
      break;
    case 'ai_full_auto':
      // Let the auto-tuner reshape weights periodically.
      doc.modeLocked = false;
      S.aiAutonomyLevel = 95;
      break;
    case 'balanced':
    default:
      // Use the schema defaults — reset weights to factory values.
      Object.assign(W, {
        ctr: 12,
        conversion: 18,
        personalization: 22,
        sellerTrust: 12,
        subscriptionBoost: 6,
        profitMargin: 4,
        freshness: 6,
        inventoryPressure: 4,
        trend: 10,
        engagement: 10,
        socialProof: 8,
        freeDelivery: 3,
        brandAffinity: 4,
        exploration: 6,
        returnRiskPenalty: 8,
        fraudPenalty: 20,
      });
      break;
  }
  doc.markModified('weights');
  doc.markModified('sliders');
  doc.markModified('subscriptionBoosts');
  doc.markModified('trustTierBoosts');
  return doc;
}
