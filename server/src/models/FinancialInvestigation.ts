import mongoose, { Document, Schema } from 'mongoose';

export interface IFinancialInvestigation extends Document {
  investigationId: string;
  anomalyIds: string[];
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  correlationId?: string;
  timeline: Array<{
    at: Date;
    kind: string;
    label: string;
    refId?: string;
    metadata?: Record<string, unknown>;
  }>;
  aiSummary?: string;
  rcaHypothesis?: string;
  recommendedActions?: string[];
  affectedUserIds?: mongoose.Types.ObjectId[];
  estimatedExposureMinor?: string;
  currency?: string;
  assignedTo?: mongoose.Types.ObjectId;
}

const financialInvestigationSchema = new Schema<IFinancialInvestigation>(
  {
    investigationId: { type: String, required: true, unique: true, index: true },
    anomalyIds: [{ type: String, index: true }],
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    correlationId: { type: String, index: true },
    timeline: [
      {
        at: { type: Date, required: true },
        kind: { type: String, required: true },
        label: { type: String, required: true },
        refId: { type: String },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    aiSummary: { type: String },
    rcaHypothesis: { type: String },
    recommendedActions: [{ type: String }],
    affectedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    estimatedExposureMinor: { type: String },
    currency: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const FinancialInvestigation = mongoose.model<IFinancialInvestigation>(
  'FinancialInvestigation',
  financialInvestigationSchema,
);
