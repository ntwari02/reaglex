import mongoose, { Document, Schema } from 'mongoose';

export interface ITrackingPixel extends Document {
  name: string;
  status: 'active' | 'inactive';
  pixelId: string;
  createdAt: Date;
  updatedAt: Date;
}

const trackingPixelSchema = new Schema<ITrackingPixel>(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
    pixelId: { type: String, default: '' },
  },
  { timestamps: true }
);

export const TrackingPixel = mongoose.model<ITrackingPixel>(
  'TrackingPixel',
  trackingPixelSchema
);
