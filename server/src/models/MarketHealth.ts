import mongoose, { Document, Schema } from 'mongoose';

/**
 * Rolling marketplace-health metrics — read by the orchestrator and the
 * stability controller. Recomputed on a cron, and snapshotted into the
 * `history` array for drift detection (compare last sample to median).
 *
 * Nothing about this is AI; everything is averages, ratios, and flags.
 */

export interface IMarketHealthSample {
  at: Date;
  ctr: number;
  conversionRate: number;
  avgOrderValueUsd: number;
  refundRate: number;
  sponsoredShare: number;
  trendInflationIndex: number; // (>1.0 = trend signal noisier than baseline)
  diversityIndex: number; // 0..1 — how many unique sellers shown
  fraudAlertCount: number;
  rankingCollapseRisk: number; // 0..1 — pareto concentration of impressions
}

export interface ICategoryHealth {
  category: string;
  views7d: number;
  conversions7d: number;
  activeSellers: number;
  activeProducts: number;
  saturationScore: number; // 0..1 — sellers competing for same demand
  supply: number;
  demand: number;
  supplyDemandRatio: number; // demand / max(supply, 1)
  priceElasticity: number; // |Δqty/Δprice| heuristic
  updatedAt: Date;
}

export interface IMarketHealth extends Document {
  /** Always upserted with `key: 'global'`. */
  key: string;
  latest: IMarketHealthSample;
  history: IMarketHealthSample[]; // capped at 96 samples (~24h @ 15-min)
  categories: ICategoryHealth[];
  /** Damping multipliers the stability controller wants applied right now. */
  damping: {
    trendWeight: number; // 0..1.5
    sponsoredWeight: number; // 0..1.5
    rankingDiversity: number; // 0..1 — diversity injection ratio
    appliedAt: Date;
    reasons: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const sampleSchema = new Schema<IMarketHealthSample>(
  {
    at: { type: Date, default: Date.now },
    ctr: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    avgOrderValueUsd: { type: Number, default: 0 },
    refundRate: { type: Number, default: 0 },
    sponsoredShare: { type: Number, default: 0 },
    trendInflationIndex: { type: Number, default: 1 },
    diversityIndex: { type: Number, default: 1 },
    fraudAlertCount: { type: Number, default: 0 },
    rankingCollapseRisk: { type: Number, default: 0 },
  },
  { _id: false },
);

const categoryHealthSchema = new Schema<ICategoryHealth>(
  {
    category: { type: String, required: true },
    views7d: { type: Number, default: 0 },
    conversions7d: { type: Number, default: 0 },
    activeSellers: { type: Number, default: 0 },
    activeProducts: { type: Number, default: 0 },
    saturationScore: { type: Number, default: 0 },
    supply: { type: Number, default: 0 },
    demand: { type: Number, default: 0 },
    supplyDemandRatio: { type: Number, default: 1 },
    priceElasticity: { type: Number, default: 1 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const marketHealthSchema = new Schema<IMarketHealth>(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    latest: { type: sampleSchema, default: () => ({}) as IMarketHealthSample },
    history: { type: [sampleSchema], default: [] },
    categories: { type: [categoryHealthSchema], default: [] },
    damping: {
      trendWeight: { type: Number, default: 1 },
      sponsoredWeight: { type: Number, default: 1 },
      rankingDiversity: { type: Number, default: 0.2 },
      appliedAt: { type: Date, default: Date.now },
      reasons: { type: [String], default: [] },
    },
  },
  { timestamps: true },
);

export const MarketHealth = mongoose.model<IMarketHealth>('MarketHealth', marketHealthSchema);

/** Convenience: read-or-create the singleton. */
export async function getMarketHealth(): Promise<IMarketHealth> {
  let doc = await MarketHealth.findOne({ key: 'global' });
  if (!doc) {
    doc = await MarketHealth.create({ key: 'global' });
  }
  return doc;
}
