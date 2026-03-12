import mongoose, { Document, Schema } from 'mongoose';

export interface IAIReviewFeature {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface IAIReviewSettings extends Document {
  aiEnabled: boolean;
  features: IAIReviewFeature[];
  updatedAt: Date;
}

const defaultFeatures: IAIReviewFeature[] = [
  { id: 'auto-moderate', title: 'Auto-Moderate Reviews', description: 'Automatically detect and flag inappropriate content', enabled: true },
  { id: 'summarize', title: 'Summarize Long Reviews', description: 'AI-generated summaries for lengthy reviews', enabled: true },
  { id: 'sentiment', title: 'Detect Emotional Tone', description: 'Analyze sentiment and emotional context', enabled: true },
  { id: 'suggest-actions', title: 'Suggest Actions', description: 'Recommend moderation actions based on AI analysis', enabled: false },
  { id: 'predict-problems', title: 'Predict Seller Problems', description: 'Identify potential issues before they escalate', enabled: false },
  { id: 'insights-report', title: 'Generate Insights Report', description: 'Auto-generate comprehensive review insights', enabled: true },
];

const aiReviewFeatureSchema = new Schema(
  { id: String, title: String, description: String, enabled: Boolean },
  { _id: false }
);

const aiReviewSettingsSchema = new Schema<IAIReviewSettings>(
  {
    aiEnabled: { type: Boolean, default: true },
    features: { type: [aiReviewFeatureSchema], default: defaultFeatures },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AIReviewSettings = mongoose.model<IAIReviewSettings>(
  'AIReviewSettings',
  aiReviewSettingsSchema
);
