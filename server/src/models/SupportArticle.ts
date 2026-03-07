import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportArticle extends Document {
  title: string;
  content: string;
  category: string;
  visibility: 'public' | 'internal';
  views: number;
  authorId: mongoose.Types.ObjectId;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const supportArticleSchema = new Schema<ISupportArticle>(
  {
    title: { type: String, required: true, trim: true, index: true },
    content: { type: String, required: true },
    category: { type: String, required: true, index: true },
    visibility: {
      type: String,
      enum: ['public', 'internal'],
      default: 'public',
      index: true,
    },
    views: { type: Number, default: 0 },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supportArticleSchema.index({ title: 'text', content: 'text' });

export const SupportArticle = mongoose.model<ISupportArticle>('SupportArticle', supportArticleSchema);
