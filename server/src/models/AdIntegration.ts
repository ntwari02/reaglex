import mongoose, { Document, Schema } from 'mongoose';

export interface IAdIntegration extends Document {
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok';
  status: 'connected' | 'disconnected';
  accountName: string;
  spend: number;
  conversions: number;
  roas: number;
  createdAt: Date;
  updatedAt: Date;
}

const adIntegrationSchema = new Schema<IAdIntegration>(
  {
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'google', 'tiktok'],
      required: true,
    },
    status: { type: String, enum: ['connected', 'disconnected'], default: 'disconnected' },
    accountName: { type: String, default: '' },
    spend: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const AdIntegration = mongoose.model<IAdIntegration>(
  'AdIntegration',
  adIntegrationSchema
);
