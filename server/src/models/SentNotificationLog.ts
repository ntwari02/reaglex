import mongoose, { Document, Schema } from 'mongoose';

export type SentNotificationType = 'email' | 'sms' | 'push' | 'inapp';
export type SentNotificationStatus = 'sent' | 'failed' | 'queued';

export interface ISentNotificationLog extends Document {
  recipient: string;
  type: SentNotificationType;
  subject: string;
  body?: string;
  templateId?: mongoose.Types.ObjectId;
  templateName?: string;
  status: SentNotificationStatus;
  failureReason?: string;
  sentAt: Date;
  createdAt: Date;
}

const sentNotificationLogSchema = new Schema<ISentNotificationLog>(
  {
    recipient: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'inapp'],
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    body: { type: String },
    templateId: { type: Schema.Types.ObjectId, ref: 'NotificationTemplate' },
    templateName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'queued'],
      required: true,
      index: true,
    },
    failureReason: { type: String, trim: true },
    sentAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

sentNotificationLogSchema.index({ recipient: 'text', subject: 'text' });

export const SentNotificationLog = mongoose.model<ISentNotificationLog>(
  'SentNotificationLog',
  sentNotificationLogSchema
);
