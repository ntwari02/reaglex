import mongoose, { Document, Schema } from 'mongoose';

export interface IActiveSession extends Document {
  userId: mongoose.Types.ObjectId;
  tokenId: string; // JWT jti – one active session per user for admin/seller
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  lastActiveAt: Date;
  createdAt: Date;
}

const activeSessionSchema = new Schema<IActiveSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tokenId: { type: String, required: true },
    deviceId: { type: String, required: true },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// `userId` already has `unique: true`, so a duplicate explicit index is unnecessary.

export const ActiveSession = mongoose.model<IActiveSession>('ActiveSession', activeSessionSchema);
