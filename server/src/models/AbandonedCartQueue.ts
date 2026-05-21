import mongoose, { Document, Schema } from 'mongoose';

export type QueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface IAbandonedCartQueue extends Document {
  userId: mongoose.Types.ObjectId;
  cartId: mongoose.Types.ObjectId;
  reminderStep: number;
  status: QueueStatus;
  scheduledSendAt: Date;
  attemptCount: number;
  lastAttemptAt?: Date;
  cancelled: boolean;
  completed: boolean;
  cancelReason?: string;
  subject?: string;
  template?: string;
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const abandonedCartQueueSchema = new Schema<IAbandonedCartQueue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cartId: { type: Schema.Types.ObjectId, ref: 'AbandonedCart', required: true, index: true },
    reminderStep: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    scheduledSendAt: { type: Date, required: true, index: true },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    cancelled: { type: Boolean, default: false, index: true },
    completed: { type: Boolean, default: false },
    cancelReason: { type: String },
    subject: { type: String },
    template: { type: String },
    couponCode: { type: String },
  },
  { timestamps: true }
);

abandonedCartQueueSchema.index({ status: 1, cancelled: 1, scheduledSendAt: 1 });
abandonedCartQueueSchema.index({ cartId: 1, reminderStep: 1, status: 1 });

export const AbandonedCartQueue = mongoose.model<IAbandonedCartQueue>(
  'AbandonedCartQueue',
  abandonedCartQueueSchema
);
