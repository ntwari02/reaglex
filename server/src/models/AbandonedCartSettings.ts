import mongoose, { Document, Schema } from 'mongoose';

export interface IAbandonedCartSettings extends Document {
  autoReminderEnabled: boolean;
  reminderTiming: string;
  updatedAt: Date;
}

const abandonedCartSettingsSchema = new Schema<IAbandonedCartSettings>(
  {
    autoReminderEnabled: { type: Boolean, default: true },
    reminderTiming: { type: String, default: '1hr' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AbandonedCartSettings = mongoose.model<IAbandonedCartSettings>(
  'AbandonedCartSettings',
  abandonedCartSettingsSchema
);
