import mongoose, { Document, Schema } from 'mongoose';

export const FINANCIAL_EVENT_TYPES = [
  'PAYMENT_CREATED',
  'PAYMENT_AUTHORIZED',
  'PAYMENT_CAPTURED',
  'FEE_ASSESSED',
  'ESCROW_HOLD_RECORDED',
  'ESCROW_RELEASE_REQUESTED',
  'ESCROW_RELEASED',
  'PAYOUT_SCHEDULED',
  'PAYOUT_INITIATED',
  'PAYOUT_COMPLETED',
  'PAYOUT_FAILED',
  'REFUND_INITIATED',
  'REFUND_COMPLETED',
  'CHARGEBACK_RECEIVED',
  'LEDGER_ADJUSTMENT',
  'RECONCILIATION_VARIANCE',
  'INTEGRITY_ANOMALY_DETECTED',
] as const;

export type FinancialEventType = (typeof FINANCIAL_EVENT_TYPES)[number];

export interface IFinancialEvent extends Document {
  eventId: string;
  eventType: FinancialEventType;
  version: number;
  occurredAt: Date;
  correlationId: string;
  traceId?: string;
  causationId?: string;
  idempotencyKey: string;
  actor: { type: string; id?: string };
  sourceService: string;
  payload: Record<string, unknown>;
  payloadChecksum: string;
  previousEventHash?: string;
  signatureHash?: string;
}

const financialEventSchema = new Schema<IFinancialEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, enum: FINANCIAL_EVENT_TYPES, required: true, index: true },
    version: { type: Number, default: 1 },
    occurredAt: { type: Date, required: true, index: true },
    correlationId: { type: String, required: true, index: true },
    traceId: { type: String, index: true },
    causationId: { type: String },
    idempotencyKey: { type: String, required: true, unique: true },
    actor: {
      type: { type: String, required: true },
      id: { type: String },
    },
    sourceService: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    payloadChecksum: { type: String, required: true },
    previousEventHash: { type: String },
    signatureHash: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

financialEventSchema.index({ correlationId: 1, occurredAt: -1 });

export const FinancialEvent = mongoose.model<IFinancialEvent>('FinancialEvent', financialEventSchema);
