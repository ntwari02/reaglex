import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeBase extends Document {
  title: string;
  content: string;
  category: 'getting_started' | 'product_listing' | 'shipping' | 'returns' | 'payments' | 'security' | 'platform_rules' | 'other';
  tags: string[];
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isPublished: boolean;
  authorId: mongoose.Types.ObjectId;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    title: { type: String, required: true, trim: true, index: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ['getting_started', 'product_listing', 'shipping', 'returns', 'payments', 'security', 'platform_rules', 'other'],
      required: true,
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    views: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Text search index
knowledgeBaseSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const KnowledgeBase = mongoose.model<IKnowledgeBase>('KnowledgeBase', knowledgeBaseSchema);

