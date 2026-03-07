import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewRequestSettings extends Document {
  autoRequestEnabled: boolean;
  delayDays: number;
  requestsSent: number;
  reviewsReceived: number;
  updatedAt: Date;
}

const reviewRequestSettingsSchema = new Schema<IReviewRequestSettings>(
  {
    autoRequestEnabled: { type: Boolean, default: true },
    delayDays: { type: Number, default: 3 },
    requestsSent: { type: Number, default: 0 },
    reviewsReceived: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ReviewRequestSettings = mongoose.model<IReviewRequestSettings>(
  'ReviewRequestSettings',
  reviewRequestSettingsSchema
);
