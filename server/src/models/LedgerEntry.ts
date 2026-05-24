import mongoose, { Document, Schema } from 'mongoose';

export type LedgerSide = 'debit' | 'credit';

export interface ILedgerEntry extends Document {
  entryId: string;
  postingId: string;
  transactionId: string;
  correlationId: string;
  eventId: string;
  account: string;
  side: LedgerSide;
  amountMinor: string;
  currency: string;
  exchangeRate?: string;
  sourceService: string;
  actor: { type: string; id?: string };
  reason: string;
  checksum: string;
  prevEntryHash?: string;
  signatureHash?: string;
  createdAt?: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    entryId: { type: String, required: true, unique: true },
    postingId: { type: String, required: true, index: true },
    transactionId: { type: String, required: true, index: true },
    correlationId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    account: { type: String, required: true, index: true },
    side: { type: String, enum: ['debit', 'credit'], required: true },
    amountMinor: { type: String, required: true },
    currency: { type: String, required: true, index: true },
    exchangeRate: { type: String },
    sourceService: { type: String, required: true },
    actor: {
      type: { type: String, required: true },
      id: { type: String },
    },
    reason: { type: String, required: true },
    checksum: { type: String, required: true },
    prevEntryHash: { type: String },
    signatureHash: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ledgerEntrySchema.index({ account: 1, currency: 1, createdAt: -1 });
ledgerEntrySchema.index({ transactionId: 1, createdAt: 1 });

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', ledgerEntrySchema);
