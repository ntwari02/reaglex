import mongoose, { Document, Schema } from 'mongoose';

/**
 * Per-rule effectiveness ledger.
 *
 * Each time a rule (in `eventRuleEngine` or `homepageOrchestrator`) fires,
 * we record:
 *  - impressions caused
 *  - clicks attributed
 *  - conversions attributed
 *  - refunds attributed (negative outcome)
 *
 * The stability controller reads this and *automatically demotes* rules
 * whose CTR delta vs baseline is negative for ≥ N rolling windows.
 *
 * This is the closed-loop feedback the spec asks for, kept fully
 * deterministic.
 */

export type RuleSource = 'event_rule' | 'orchestrator' | 'ranking_weight' | 'sponsored' | 'fairness' | 'trend';

export interface IRuleEffectiveness extends Document {
  ruleId: string; // stable string id e.g. "co_view_boost"
  source: RuleSource;
  description?: string;

  impressions: number;
  clicks: number;
  cartAdds: number;
  purchases: number;
  refunds: number;
  revenueUsd: number;

  // Derived (recomputed periodically)
  ctr: number;
  conversionRate: number;
  refundRate: number;
  effectivenessScore: number; // -1..+1
  baselineCtr: number;
  baselineConversion: number;

  /** How much the orchestrator should currently discount this rule. 0 = full weight, 1 = silenced. */
  dampening: number;
  silenced: boolean;
  lastFiredAt?: Date;
  recomputedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ruleEffectivenessSchema = new Schema<IRuleEffectiveness>(
  {
    ruleId: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      enum: ['event_rule', 'orchestrator', 'ranking_weight', 'sponsored', 'fairness', 'trend'],
      default: 'event_rule',
    },
    description: { type: String },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    cartAdds: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    revenueUsd: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    refundRate: { type: Number, default: 0 },
    effectivenessScore: { type: Number, default: 0 },
    baselineCtr: { type: Number, default: 0 },
    baselineConversion: { type: Number, default: 0 },
    dampening: { type: Number, default: 0, min: 0, max: 1 },
    silenced: { type: Boolean, default: false, index: true },
    lastFiredAt: { type: Date },
    recomputedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ruleEffectivenessSchema.index({ source: 1, effectivenessScore: -1 });

export const RuleEffectiveness = mongoose.model<IRuleEffectiveness>(
  'RuleEffectiveness',
  ruleEffectivenessSchema,
);
