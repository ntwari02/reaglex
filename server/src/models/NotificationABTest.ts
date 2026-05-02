import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationABTest extends Document {
  variantA: string;
  variantB: string;
  targetGroup: string;
  recipientCount: number;
  variantARecipients: string[];
  variantBRecipients: string[];
  sentAt: Date;
  status: 'running' | 'completed' | 'cancelled';
  subject?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const notificationABTestSchema = new Schema<INotificationABTest>(
  {
    variantA: { type: String, required: true },
    variantB: { type: String, required: true },
    targetGroup: { type: String, required: true, trim: true },
    recipientCount: { type: Number, required: true, default: 0 },
    variantARecipients: [{ type: String, trim: true }],
    variantBRecipients: [{ type: String, trim: true }],
    sentAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['running', 'completed', 'cancelled'],
      default: 'running',
      index: true,
    },
    subject: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const NotificationABTest = mongoose.model<INotificationABTest>(
  'NotificationABTest',
  notificationABTestSchema
);
