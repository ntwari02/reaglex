import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminStaffAudit extends Document {
  actorId: mongoose.Types.ObjectId;
  actorEmail: string;
  action: string;
  targetUserId?: mongoose.Types.ObjectId;
  targetEmail?: string;
  detail?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const adminStaffAuditSchema = new Schema<IAdminStaffAudit>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetEmail: { type: String },
    detail: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminStaffAuditSchema.index({ createdAt: -1 });

export const AdminStaffAudit = mongoose.model<IAdminStaffAudit>(
  'AdminStaffAudit',
  adminStaffAuditSchema,
);
