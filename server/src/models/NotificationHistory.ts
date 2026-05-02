import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationHistory extends Document {
  targetGroup: string;
  recipientCount: number;
  subject: string;
  body: string;
  type: string;
  sentAt: Date;
  sentBy?: mongoose.Types.ObjectId;
  status: string;
}

const notificationHistorySchema = new Schema<INotificationHistory>(
  {
    targetGroup: { type: String, required: true, trim: true },
    recipientCount: { type: Number, required: true, default: 0 },
    subject: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    type: { type: String, required: true, trim: true },
    sentAt: { type: Date, required: true, default: Date.now, index: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, required: true, default: 'sent', trim: true },
  },
  { timestamps: true }
);

export const NotificationHistory = mongoose.model<INotificationHistory>(
  'NotificationHistory',
  notificationHistorySchema
);
