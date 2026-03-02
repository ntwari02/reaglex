import mongoose, { Document, Schema } from 'mongoose';

export interface IEscrowWallet extends Document {
  totalHeld: number;
  totalReleased: number;
  totalRefunded: number;
  totalFees: number;
  lastUpdated: Date;
}

const escrowWalletSchema = new Schema<IEscrowWallet>(
  {
    totalHeld: { type: Number, default: 0 },
    totalReleased: { type: Number, default: 0 },
    totalRefunded: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

escrowWalletSchema.pre('save', function () {
  this.lastUpdated = new Date();
});

export const EscrowWallet = mongoose.model<IEscrowWallet>('EscrowWallet', escrowWalletSchema);

