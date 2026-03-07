import mongoose, { Document, Schema } from 'mongoose';

export type AdminSystemAlertType = 'server' | 'api' | 'payment' | 'warehouse' | 'security';
export type AdminSystemAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AdminSystemAlertStatus = 'open' | 'assigned' | 'resolved';

export interface IAdminSystemAlert extends Document {
  type: AdminSystemAlertType;
  title: string;
  description: string;
  severity: AdminSystemAlertSeverity;
  status: AdminSystemAlertStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSystemAlertSchema = new Schema<IAdminSystemAlert>(
  {
    type: {
      type: String,
      enum: ['server', 'api', 'payment', 'warehouse', 'security'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'resolved'],
      default: 'open',
      index: true,
    },
    assignedTo: { type: String, trim: true },
  },
  { timestamps: true }
);

adminSystemAlertSchema.index({ title: 'text', description: 'text' });

export const AdminSystemAlert = mongoose.model<IAdminSystemAlert>(
  'AdminSystemAlert',
  adminSystemAlertSchema
);
