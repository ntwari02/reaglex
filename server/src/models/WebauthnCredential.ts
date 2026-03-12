import mongoose, { Document, Schema } from 'mongoose';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

export interface IWebauthnCredential extends Document {
  userId: mongoose.Types.ObjectId;
  credentialID: string;   // base64url
  credentialPublicKey: Buffer;
  counter: number;
  deviceType?: string;
  backedUp?: boolean;
  transports?: AuthenticatorTransportFuture[];
  createdAt: Date;
}

const webauthnCredentialSchema = new Schema<IWebauthnCredential>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    credentialID: { type: String, required: true, unique: true },
    credentialPublicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true, default: 0 },
    deviceType: { type: String },
    backedUp: { type: Boolean },
    transports: [{ type: String }],
  },
  { timestamps: true }
);

webauthnCredentialSchema.index({ userId: 1 });
webauthnCredentialSchema.index({ credentialID: 1 }, { unique: true });

export const WebauthnCredential = mongoose.model<IWebauthnCredential>(
  'WebauthnCredential',
  webauthnCredentialSchema
);

