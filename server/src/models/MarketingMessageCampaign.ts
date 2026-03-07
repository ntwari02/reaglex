import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketingMessageCampaign extends Document {
  name: string;
  channel: 'email' | 'sms' | 'push' | 'inapp' | 'popup';
  target: string;
  sent: number;
  opened: number;
  clicked: number;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: Date;
  updatedAt: Date;
}

const marketingMessageCampaignSchema = new Schema<IMarketingMessageCampaign>(
  {
    name: { type: String, required: true, trim: true },
    channel: {
      type: String,
      enum: ['email', 'sms', 'push', 'inapp', 'popup'],
      required: true,
    },
    target: { type: String, default: 'All Customers' },
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'scheduled', 'sent'], default: 'draft' },
  },
  { timestamps: true }
);

marketingMessageCampaignSchema.index({ status: 1 });

export const MarketingMessageCampaign = mongoose.model<IMarketingMessageCampaign>(
  'MarketingMessageCampaign',
  marketingMessageCampaignSchema
);
