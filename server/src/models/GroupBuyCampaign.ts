import mongoose, { Document, Schema } from 'mongoose';

export interface IGroupBuyCampaign extends Document {
  productId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  ownerBuyerId: mongoose.Types.ObjectId;
  targetParticipants: number;
  discountPercent: number;
  status: 'active' | 'unlocked' | 'expired';
  participants: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const groupBuyCampaignSchema = new Schema<IGroupBuyCampaign>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerBuyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetParticipants: { type: Number, required: true, min: 2 },
    discountPercent: { type: Number, required: true, min: 1, max: 95 },
    status: { type: String, enum: ['active', 'unlocked', 'expired'], default: 'active', index: true },
    participants: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const GroupBuyCampaign = mongoose.model<IGroupBuyCampaign>('GroupBuyCampaign', groupBuyCampaignSchema);
