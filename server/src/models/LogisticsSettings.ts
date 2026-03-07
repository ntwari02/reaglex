import mongoose, { Document, Schema } from 'mongoose';

export type AutoAssignMethod = 'location' | 'weight' | 'cost' | 'performance';

export interface ILogisticsSettings extends Document {
  autoAssignEnabled: boolean;
  autoAssignMethod: AutoAssignMethod;
  autoApproveEnabled: boolean;
  autoNotifyEnabled: boolean;
  updatedAt: Date;
}

const logisticsSettingsSchema = new Schema<ILogisticsSettings>(
  {
    autoAssignEnabled: { type: Boolean, default: true },
    autoAssignMethod: {
      type: String,
      enum: ['location', 'weight', 'cost', 'performance'],
      default: 'performance',
    },
    autoApproveEnabled: { type: Boolean, default: false },
    autoNotifyEnabled: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Single document for platform settings
export const LogisticsSettings = mongoose.model<ILogisticsSettings>('LogisticsSettings', logisticsSettingsSchema);
