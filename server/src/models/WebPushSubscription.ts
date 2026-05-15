import mongoose, { Document, Schema } from 'mongoose';

/**
 * Web Push (PWA) browser subscription record.
 *
 * Stored separately from Expo/FCM device tokens because the payload shape
 * is different (endpoint + p256dh + auth keys) and we send via the
 * standard Web Push protocol using VAPID.
 */
export interface IWebPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  enabled: boolean;
  lastSeenAt: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const webPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

webPushSubscriptionSchema.index({ userId: 1, enabled: 1 });

export const WebPushSubscription = mongoose.model<IWebPushSubscription>(
  'WebPushSubscription',
  webPushSubscriptionSchema,
);
