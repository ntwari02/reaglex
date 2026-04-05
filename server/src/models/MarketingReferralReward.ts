import mongoose, { Document, Schema } from 'mongoose';

/** One row per invited user who completed a qualifying (paid) order — referrer earns when referee pays. */
export interface IMarketingReferralReward extends Document {
  referrerUserId: mongoose.Types.ObjectId;
  refereeUserId: mongoose.Types.ObjectId;
  referralCodeUsed: string;
  qualifyingOrderId: mongoose.Types.ObjectId;
  orderTotal: number;
  rewardAmount: number;
  rewardType: string;
  status: 'pending' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const marketingReferralRewardSchema = new Schema<IMarketingReferralReward>(
  {
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refereeUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referralCodeUsed: { type: String, required: true, trim: true, uppercase: true },
    qualifyingOrderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderTotal: { type: Number, required: true },
    rewardAmount: { type: Number, required: true },
    rewardType: { type: String, default: 'cash' },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
  },
  { timestamps: true },
);

marketingReferralRewardSchema.index({ referrerUserId: 1, createdAt: -1 });

export const MarketingReferralReward = mongoose.model<IMarketingReferralReward>(
  'MarketingReferralReward',
  marketingReferralRewardSchema,
);
