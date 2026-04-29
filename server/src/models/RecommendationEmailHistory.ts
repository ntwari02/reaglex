import mongoose, { Document, Schema } from 'mongoose';

export interface IRecommendationEmailProduct {
  productId: mongoose.Types.ObjectId;
  score: number;
  reason: string;
}

export interface IRecommendationEmailHistory extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  subject: string;
  frequency: 'daily' | 'weekly';
  mode: 'deals_only' | 'mixed';
  productIds: mongoose.Types.ObjectId[];
  products: IRecommendationEmailProduct[];
  opens: number;
  clicks: number;
  conversions: number;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  conversionAt?: Date;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationEmailProductSchema = new Schema<IRecommendationEmailProduct>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    score: { type: Number, required: true, default: 0 },
    reason: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const recommendationEmailHistorySchema = new Schema<IRecommendationEmailHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    subject: { type: String, required: true },
    frequency: { type: String, enum: ['daily', 'weekly'], required: true, index: true },
    mode: { type: String, enum: ['deals_only', 'mixed'], required: true },
    productIds: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    products: { type: [recommendationEmailProductSchema], default: [] },
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    sentAt: { type: Date, default: Date.now, index: true },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    conversionAt: { type: Date },
    status: { type: String, enum: ['sent', 'failed', 'skipped'], default: 'sent', index: true },
    error: { type: String },
  },
  { timestamps: true },
);

recommendationEmailHistorySchema.index({ userId: 1, sentAt: -1 });
recommendationEmailHistorySchema.index({ sentAt: -1, status: 1 });

export const RecommendationEmailHistory = mongoose.model<IRecommendationEmailHistory>(
  'RecommendationEmailHistory',
  recommendationEmailHistorySchema,
);

