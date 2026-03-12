import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewModerationSettings extends Document {
  autoModeration: boolean;
  updatedAt: Date;
}

const reviewModerationSettingsSchema = new Schema<IReviewModerationSettings>(
  {
    autoModeration: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ReviewModerationSettings = mongoose.model<IReviewModerationSettings>(
  'ReviewModerationSettings',
  reviewModerationSettingsSchema
);
