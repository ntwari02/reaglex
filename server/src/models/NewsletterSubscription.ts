import mongoose, { Document, Schema } from 'mongoose';

export interface INewsletterSubscription extends Document {
  email: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSubscriptionSchema = new Schema<INewsletterSubscription>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
      index: true,
    },
    source: { type: String, default: 'footer', trim: true, maxlength: 64 },
  },
  { timestamps: true },
);

export const NewsletterSubscription = mongoose.model<INewsletterSubscription>(
  'NewsletterSubscription',
  newsletterSubscriptionSchema,
);
