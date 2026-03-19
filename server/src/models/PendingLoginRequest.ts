import mongoose, { Document, Schema } from 'mongoose';

export type PendingLoginStatus = 'pending' | 'approved' | 'rejected';

export interface IPendingLoginRequest extends Document {
  requestId: string;
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  status: PendingLoginStatus;
  emailApprovalToken?: string;
  emailApprovalExpires?: Date;
  /** One-time token for second device to exchange for JWT after approval */
  approvalToken?: string;
  approvalTokenExpires?: Date;
  createdAt: Date;
  expiresAt: Date;
}

const pendingLoginRequestSchema = new Schema<IPendingLoginRequest>(
  {
    requestId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: String, required: true },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    emailApprovalToken: { type: String },
    emailApprovalExpires: { type: Date },
    approvalToken: { type: String },
    approvalTokenExpires: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingLoginRequestSchema.index({ userId: 1, status: 1 });
pendingLoginRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL optional

export const PendingLoginRequest = mongoose.model<IPendingLoginRequest>(
  'PendingLoginRequest',
  pendingLoginRequestSchema
);
