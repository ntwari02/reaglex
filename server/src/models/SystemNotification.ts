import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemNotification extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'policy_update' | 'system_announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: 'all_sellers' | 'verified_sellers' | 'pending_sellers' | 'specific_seller';
  targetSellerId?: mongoose.Types.ObjectId;
  isRead: boolean;
  readBy: mongoose.Types.ObjectId[];
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemNotificationSchema = new Schema<ISystemNotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'error', 'success', 'policy_update', 'system_announcement'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['all_sellers', 'verified_sellers', 'pending_sellers', 'specific_seller'],
      required: true,
      index: true,
    },
    targetSellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    isRead: { type: Boolean, default: false },
    readBy: { type: [Schema.Types.ObjectId], default: [] },
    actionRequired: { type: Boolean, default: false },
    actionUrl: { type: String },
    actionText: { type: String },
    expiresAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Indexes
systemNotificationSchema.index({ targetAudience: 1, targetSellerId: 1, createdAt: -1 });
systemNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SystemNotification = mongoose.model<ISystemNotification>('SystemNotification', systemNotificationSchema);

