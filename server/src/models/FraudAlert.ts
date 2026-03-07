import mongoose, { Document, Schema } from 'mongoose';

export interface IFraudAlert extends Document {
  type: 'seller' | 'buyer' | 'payment' | 'dispute';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityName: string;
  entityId: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
}

const fraudAlertSchema = new Schema<IFraudAlert>(
  {
    type: {
      type: String,
      enum: ['seller', 'buyer', 'payment', 'dispute'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    entityName: { type: String, required: true },
    entityId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const FraudAlert = mongoose.model<IFraudAlert>('FraudAlert', fraudAlertSchema);
