import mongoose, { Document, Schema } from 'mongoose';

export interface IAbandonedCartReminderLog {
  step: number;
  channel: string;
  scheduledAt?: Date;
  sentAt?: Date;
  delayedReason?: string;
}

export interface IAbandonedCartTimelineEvent {
  event: 'cart_created' | 'abandoned' | 'reminder_scheduled' | 'email_sent' | 'opened' | 'recovered' | 'cancelled';
  at: Date;
  meta?: Record<string, unknown>;
}

export interface IAbandonedCart extends Document {
  userId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  items: number;
  total: number;
  abandonedAt: Date;
  remindersSent: number;
  recovered: boolean;
  nextReminderAt?: Date;
  userTimezone?: string;
  primaryCategory?: string;
  reminderLog?: IAbandonedCartReminderLog[];
  engagementPattern?: {
    openRate?: number;
    ignoreRate?: number;
    lastEmailOpenAt?: Date;
  };
  lastCartActivityAt?: Date;
  checkoutStarted?: boolean;
  timeline?: IAbandonedCartTimelineEvent[];
  aiSuggestedSendAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const abandonedCartSchema = new Schema<IAbandonedCart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    items: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    abandonedAt: { type: Date, default: Date.now },
    remindersSent: { type: Number, default: 0 },
    recovered: { type: Boolean, default: false },
    nextReminderAt: { type: Date, index: true },
    userTimezone: { type: String },
    primaryCategory: { type: String },
    reminderLog: {
      type: [
        new Schema(
          {
            step: { type: Number },
            channel: { type: String },
            scheduledAt: { type: Date },
            sentAt: { type: Date },
            delayedReason: { type: String },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    engagementPattern: {
      openRate: { type: Number },
      ignoreRate: { type: Number },
      lastEmailOpenAt: { type: Date },
    },
    lastCartActivityAt: { type: Date, index: true },
    checkoutStarted: { type: Boolean, default: false },
    aiSuggestedSendAt: { type: Date },
    timeline: {
      type: [
        new Schema(
          {
            event: {
              type: String,
              enum: ['cart_created', 'abandoned', 'reminder_scheduled', 'email_sent', 'opened', 'recovered', 'cancelled'],
            },
            at: { type: Date, default: Date.now },
            meta: { type: Schema.Types.Mixed },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

abandonedCartSchema.index({ abandonedAt: -1 });
abandonedCartSchema.index({ recovered: 1 });

export const AbandonedCart = mongoose.model<IAbandonedCart>(
  'AbandonedCart',
  abandonedCartSchema
);
