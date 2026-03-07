import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketingCampaign extends Document {
  name: string;
  type: string;
  status: 'active' | 'paused' | 'ended' | 'scheduled';
  startDate: Date;
  endDate: Date;
  budget: number;
  revenue: number;
  conversions: number;
  target: string;
  createdAt: Date;
  updatedAt: Date;
}

const marketingCampaignSchema = new Schema<IMarketingCampaign>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, default: 'campaign' },
    status: { type: String, enum: ['active', 'paused', 'ended', 'scheduled'], default: 'scheduled' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    target: { type: String, default: 'All Customers' },
  },
  { timestamps: true }
);

marketingCampaignSchema.index({ status: 1 });
marketingCampaignSchema.index({ startDate: 1, endDate: 1 });

export const MarketingCampaign = mongoose.model<IMarketingCampaign>(
  'MarketingCampaign',
  marketingCampaignSchema
);
