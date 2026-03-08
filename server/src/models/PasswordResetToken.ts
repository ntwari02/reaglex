import mongoose, { Document, Schema } from 'mongoose';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token?: string;  // optional: used for legacy reset links
  code?: string;   // 6-digit code sent by email
  expiresAt: Date;
  createdAt: Date;
}

const schema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: false, sparse: true },
    code: { type: String, required: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ token: 1 }, { sparse: true });
schema.index({ userId: 1, code: 1 });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>('PasswordResetToken', schema);
