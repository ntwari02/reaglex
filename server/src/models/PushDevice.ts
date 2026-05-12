import mongoose, { Document, Schema } from 'mongoose';

/**
 * Push notification device token registry.
 * Stores Expo / FCM / APNs tokens scoped to a user. Used by marketing
 * automation, order events and admin broadcasts to deliver in-app pushes.
 */
export type PushPlatform = 'ios' | 'android' | 'web' | 'unknown';
export type PushProvider = 'expo' | 'fcm' | 'apns';

export interface IPushDevice extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  provider: PushProvider;
  platform: PushPlatform;
  deviceId?: string;
  appVersion?: string;
  enabled: boolean;
  lastSeenAt: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const pushDeviceSchema = new Schema<IPushDevice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, trim: true },
    provider: {
      type: String,
      enum: ['expo', 'fcm', 'apns'],
      default: 'expo',
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'unknown'],
      default: 'unknown',
    },
    deviceId: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

pushDeviceSchema.index({ token: 1 }, { unique: true });
pushDeviceSchema.index({ userId: 1, enabled: 1 });

export const PushDevice = mongoose.model<IPushDevice>('PushDevice', pushDeviceSchema);
