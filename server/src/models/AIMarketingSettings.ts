import mongoose, { Document, Schema } from 'mongoose';

export interface IAIMarketingFeature {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface IAIMarketingSettings extends Document {
  aiEnabled: boolean;
  features: IAIMarketingFeature[];
  updatedAt: Date;
}

const aiMarketingFeatureSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const defaultFeatures: IAIMarketingFeature[] = [
  { id: 'campaign-ideas', title: 'Auto Generate Campaign Ideas', description: 'AI suggests campaign ideas based on trends and performance', enabled: true },
  { id: 'best-promotion', title: 'Predict Best Promotion', description: 'Recommend optimal promotions for each user segment', enabled: true },
  { id: 'best-time', title: 'Best Time to Send', description: 'AI determines optimal timing for messages and campaigns', enabled: true },
  { id: 'high-value', title: 'Predict High-Value Customers', description: 'Identify customers likely to make high-value purchases', enabled: false },
  { id: 'discount-suggest', title: 'Auto Discount Suggestions', description: 'AI recommends discount amounts for maximum conversion', enabled: false },
  { id: 'ai-segments', title: 'AI-Built Segments', description: 'Automatically create customer segments using AI', enabled: false },
  { id: 'auto-copy', title: 'Auto-Generate Copy', description: 'Generate marketing copy for campaigns and emails', enabled: true },
];

const aiMarketingSettingsSchema = new Schema<IAIMarketingSettings>(
  {
    aiEnabled: { type: Boolean, default: true },
    features: { type: [aiMarketingFeatureSchema], default: defaultFeatures },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AIMarketingSettings = mongoose.model<IAIMarketingSettings>(
  'AIMarketingSettings',
  aiMarketingSettingsSchema
);
