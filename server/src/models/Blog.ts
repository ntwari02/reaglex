import mongoose, { Schema, Document } from 'mongoose';

export type BlogStatus = 'draft' | 'published' | 'archived';
export type BlogCategory = 
  | 'seller-tips' 
  | 'tech' 
  | 'shopping-guides' 
  | 'product-reviews' 
  | 'logistics' 
  | 'payments' 
  | 'analytics' 
  | 'updates';

export interface IBlogComment extends Document {
  name: string;
  email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  subtitle?: string;
  category: BlogCategory;
  thumbnail?: string;
  excerpt: string;
  content: string;
  authorId: mongoose.Types.ObjectId;
  status: BlogStatus;
  featured: boolean;
  tags: string[];
  views: number;
  likes: number;
  readingTime: number; // in minutes
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  publishedAt?: Date;
  comments: IBlogComment[];
  createdAt: Date;
  updatedAt: Date;
}

const blogCommentSchema = new Schema<IBlogComment>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    content: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    subtitle: { type: String, trim: true },
    category: {
      type: String,
      enum: [
        'seller-tips',
        'tech',
        'shopping-guides',
        'product-reviews',
        'logistics',
        'payments',
        'analytics',
        'updates',
      ],
      required: true,
      index: true,
    },
    thumbnail: { type: String, trim: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    views: { type: Number, default: 0, index: true },
    likes: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 }, // calculated from content length
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    seoKeywords: { type: String, trim: true },
    publishedAt: { type: Date, index: true },
    comments: { type: [blogCommentSchema], default: [] },
  },
  { timestamps: true }
);

// Calculate reading time before saving
(blogPostSchema as any).pre('save', function (this: IBlogPost, next: any) {
  if (this.isModified('content')) {
    // Average reading speed: 200 words per minute
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute) || 1;
  }
  next();
});

// Auto-set publishedAt when status changes to published
(blogPostSchema as any).pre('save', function (this: IBlogPost, next: any) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Indexes for better query performance
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1, publishedAt: -1 });
blogPostSchema.index({ featured: 1, status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1, status: 1 });
blogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text' }); // Text search index

export const BlogPost = mongoose.model<IBlogPost>('BlogPost', blogPostSchema);

