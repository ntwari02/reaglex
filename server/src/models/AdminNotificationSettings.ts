import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminNotificationSettings extends Document {
  customerSettings: Record<string, boolean>;
  sellerSettings: Record<string, boolean>;
  channelPreferences: Record<string, boolean>;
  smtp: {
    host: string;
    port: string;
    username: string;
    fromEmail: string;
  };
  sms: {
    provider: string;
    apiKeyMasked?: string;
  };
  push: {
    fcmKeyMasked?: string;
  };
  webhooks: Array<{ url: string; active: boolean }>;
  updatedAt: Date;
}

const adminNotificationSettingsSchema = new Schema<IAdminNotificationSettings>(
  {
    customerSettings: { type: Schema.Types.Mixed, default: () => ({}) },
    sellerSettings: { type: Schema.Types.Mixed, default: () => ({}) },
    channelPreferences: { type: Schema.Types.Mixed, default: () => ({}) },
    smtp: {
      host: { type: String, default: '' },
      port: { type: String, default: '' },
      username: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
    },
    sms: {
      provider: { type: String, default: 'twilio' },
      apiKeyMasked: { type: String },
    },
    push: {
      fcmKeyMasked: { type: String },
    },
    webhooks: [
      {
        url: { type: String },
        active: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const AdminNotificationSettings = mongoose.model<IAdminNotificationSettings>(
  'AdminNotificationSettings',
  adminNotificationSettingsSchema
);
