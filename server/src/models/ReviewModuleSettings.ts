import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewModuleSettings extends Document {
  requireApproval: boolean;
  allowAnonymous: boolean;
  allowImages: boolean;
  editingWindow: number;
  profanityFilter: string;
  verifiedPurchaseOnly: boolean;
  helpfulScoring: boolean;
  requireSellerReplyApproval: boolean;
  updatedAt: Date;
}

const reviewModuleSettingsSchema = new Schema<IReviewModuleSettings>(
  {
    requireApproval: { type: Boolean, default: true },
    allowAnonymous: { type: Boolean, default: false },
    allowImages: { type: Boolean, default: true },
    editingWindow: { type: Number, default: 60 },
    profanityFilter: { type: String, default: 'medium' },
    verifiedPurchaseOnly: { type: Boolean, default: true },
    helpfulScoring: { type: Boolean, default: true },
    requireSellerReplyApproval: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ReviewModuleSettings = mongoose.model<IReviewModuleSettings>(
  'ReviewModuleSettings',
  reviewModuleSettingsSchema
);
