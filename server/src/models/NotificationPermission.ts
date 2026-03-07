import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationPermission extends Document {
  name: string;
  description: string;
  allowed: string[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationPermissionSchema = new Schema<INotificationPermission>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    allowed: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export const NotificationPermission = mongoose.model<INotificationPermission>(
  'NotificationPermission',
  notificationPermissionSchema
);
