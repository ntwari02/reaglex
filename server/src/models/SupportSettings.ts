import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportSettings extends Document {
  autoReplyTimeHours: number;
  autoCloseInactiveDays: number;
  slaResponseTimeHours: number;
  updatedAt: Date;
}

const supportSettingsSchema = new Schema<ISupportSettings>(
  {
    autoReplyTimeHours: { type: Number, default: 2 },
    autoCloseInactiveDays: { type: Number, default: 7 },
    slaResponseTimeHours: { type: Number, default: 4 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Single document for global settings
export const SupportSettings = mongoose.model<ISupportSettings>('SupportSettings', supportSettingsSchema);
