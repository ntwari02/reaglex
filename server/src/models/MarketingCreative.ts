import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketingCreative extends Document {
  name: string;
  type: 'banner' | 'video' | 'poster' | 'carousel';
  location: string;
  impressions: number;
  clicks: number;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  status: 'active' | 'scheduled' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const marketingCreativeSchema = new Schema<IMarketingCreative>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['banner', 'video', 'poster', 'carousel'],
      required: true,
    },
    location: { type: String, default: '' },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    scheduledFrom: { type: Date },
    scheduledTo: { type: Date },
    status: {
      type: String,
      enum: ['active', 'scheduled', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

marketingCreativeSchema.index({ status: 1 });

export const MarketingCreative = mongoose.model<IMarketingCreative>(
  'MarketingCreative',
  marketingCreativeSchema
);
