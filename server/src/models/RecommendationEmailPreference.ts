import mongoose, { Document, Schema } from 'mongoose';

export type RecommendationEmailFrequency = 'daily' | 'weekly';
export type RecommendationEmailMode = 'deals_only' | 'mixed';

export interface IRecommendationEmailPreference extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  enabled: boolean;
  frequency: RecommendationEmailFrequency;
  mode: RecommendationEmailMode;
  unsubscribed: boolean;
  unsubscribeToken: string;
  suppressed: boolean;
  lastSentAt?: Date;
  lastRecommendationProductIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const recommendationEmailPreferenceSchema = new Schema<IRecommendationEmailPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    enabled: { type: Boolean, default: true, index: true },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'weekly', index: true },
    mode: { type: String, enum: ['deals_only', 'mixed'], default: 'mixed' },
    unsubscribed: { type: Boolean, default: false, index: true },
    unsubscribeToken: { type: String, required: true, unique: true, index: true },
    suppressed: { type: Boolean, default: false, index: true },
    lastSentAt: { type: Date },
    lastRecommendationProductIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

recommendationEmailPreferenceSchema.index({ enabled: 1, unsubscribed: 1, suppressed: 1, frequency: 1 });

export const RecommendationEmailPreference = mongoose.model<IRecommendationEmailPreference>(
  'RecommendationEmailPreference',
  recommendationEmailPreferenceSchema,
);

