import mongoose, { Document, Schema } from 'mongoose';

export interface IAbandonedCart extends Document {
  userId: mongoose.Types.ObjectId;
  customerName: string;
  customerEmail: string;
  items: number;
  total: number;
  abandonedAt: Date;
  remindersSent: number;
  recovered: boolean;
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
  },
  { timestamps: true }
);

abandonedCartSchema.index({ abandonedAt: -1 });
abandonedCartSchema.index({ recovered: 1 });

export const AbandonedCart = mongoose.model<IAbandonedCart>(
  'AbandonedCart',
  abandonedCartSchema
);
