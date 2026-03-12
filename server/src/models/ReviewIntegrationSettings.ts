import mongoose, { Document, Schema } from 'mongoose';

export interface IThirdPartyIntegration {
  name: string;
  status: 'connected' | 'disconnected';
}

export interface IReviewIntegrationSettings extends Document {
  verifiedPurchaseOnly: boolean;
  helpfulScoring: boolean;
  thirdPartyIntegrations: IThirdPartyIntegration[];
  updatedAt: Date;
}

const thirdPartySchema = new Schema(
  { name: String, status: String },
  { _id: false }
);

const reviewIntegrationSettingsSchema = new Schema<IReviewIntegrationSettings>(
  {
    verifiedPurchaseOnly: { type: Boolean, default: true },
    helpfulScoring: { type: Boolean, default: true },
    thirdPartyIntegrations: {
      type: [thirdPartySchema],
      default: [
        { name: 'TrustPilot', status: 'disconnected' },
        { name: 'JudgeMe', status: 'disconnected' },
        { name: 'Review.io', status: 'disconnected' },
      ],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ReviewIntegrationSettings = mongoose.model<IReviewIntegrationSettings>(
  'ReviewIntegrationSettings',
  reviewIntegrationSettingsSchema
);
