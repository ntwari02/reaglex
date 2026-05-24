import mongoose, { Document, Schema } from 'mongoose';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'open' | 'acknowledged' | 'investigating' | 'frozen' | 'resolved';

export interface IFinancialAnomaly extends Document {
  anomalyId: string;
  type: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  message: string;
  correlationId?: string;
  transactionId?: string;
  varianceMinor?: string;
  currency?: string;
  affectedUserIds?: mongoose.Types.ObjectId[];
  estimatedExposureMinor?: string;
  invariantId?: string;
  rcaHypothesis?: string;
  rcaConfidence?: number;
  evidenceEventIds?: string[];
  recommendedActions?: string[];
  frozenAccounts?: string[];
  assignedTo?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolutionNotes?: string;
}

const financialAnomalySchema = new Schema<IFinancialAnomaly>(
  {
    anomalyId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, index: true },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'investigating', 'frozen', 'resolved'],
      default: 'open',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    correlationId: { type: String, index: true },
    transactionId: { type: String, index: true },
    varianceMinor: { type: String },
    currency: { type: String },
    affectedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    estimatedExposureMinor: { type: String },
    invariantId: { type: String },
    rcaHypothesis: { type: String },
    rcaConfidence: { type: Number },
    evidenceEventIds: [{ type: String }],
    recommendedActions: [{ type: String }],
    frozenAccounts: [{ type: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String },
  },
  { timestamps: true },
);

financialAnomalySchema.index({ status: 1, severity: -1, createdAt: -1 });

export const FinancialAnomaly = mongoose.model<IFinancialAnomaly>(
  'FinancialAnomaly',
  financialAnomalySchema,
);
