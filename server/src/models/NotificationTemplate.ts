import mongoose, { Document, Schema } from 'mongoose';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'inapp';

export interface INotificationTemplate extends Document {
  name: string;
  category: string;
  type: NotificationChannel;
  subject?: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'inapp'],
      required: true,
      index: true,
    },
    subject: { type: String, trim: true },
    content: { type: String, required: true },
    variables: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export const NotificationTemplate = mongoose.model<INotificationTemplate>(
  'NotificationTemplate',
  notificationTemplateSchema
);
