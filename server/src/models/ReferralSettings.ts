import mongoose, { Document, Schema } from 'mongoose';

export interface IReferralSettings extends Document {
  /** When false, new referral links at signup and new rewards on paid orders are skipped. */
  programEnabled: boolean;
  rewardType: 'cash' | 'points' | 'coupon';
  rewardAmount: number;
  maxReferralsPerUser: number;
  fraudDetection: boolean;
  updatedAt: Date;
}

const referralSettingsSchema = new Schema<IReferralSettings>(
  {
    programEnabled: { type: Boolean, default: true },
    rewardType: { type: String, enum: ['cash', 'points', 'coupon'], default: 'cash' },
    rewardAmount: { type: Number, default: 10 },
    maxReferralsPerUser: { type: Number, default: 10 },
    fraudDetection: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ReferralSettings = mongoose.model<IReferralSettings>(
  'ReferralSettings',
  referralSettingsSchema
);
