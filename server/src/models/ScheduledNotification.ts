import mongoose, { Document, Schema } from 'mongoose';

export type ScheduledStatus = 'active' | 'paused' | 'completed';

export interface IScheduledNotification extends Document {
  name: string;
  target: string;
  scheduledFor: Date;
  recurring: boolean;
  status: ScheduledStatus;
  type: string;
  templateId?: mongoose.Types.ObjectId;
  subject?: string;
  body?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduledNotificationSchema = new Schema<IScheduledNotification>(
  {
    name: { type: String, required: true, trim: true },
    target: { type: String, required: true, trim: true },
    scheduledFor: { type: Date, required: true, index: true },
    recurring: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active',
      index: true,
    },
    type: { type: String, required: true, trim: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'NotificationTemplate' },
    subject: { type: String, trim: true },
    body: { type: String },
  },
  { timestamps: true }
);

export const ScheduledNotification = mongoose.model<IScheduledNotification>(
  'ScheduledNotification',
  scheduledNotificationSchema
);
