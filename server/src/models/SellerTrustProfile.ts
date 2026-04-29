import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerTrustProfile extends Document {
  sellerId: mongoose.Types.ObjectId;
  trustScore: number;
  badge: 'new' | 'improving' | 'trusted' | 'elite';
  stats: {
    verifiedListings: number;
    suspiciousListings: number;
    successfulOrders: number;
    disputesOpened: number;
    confirmedFraudCases: number;
    returnsCount: number;
    avgImageVideoConfidence: number;
  };
  updatedAt: Date;
  createdAt: Date;
}

const sellerTrustProfileSchema = new Schema<ISellerTrustProfile>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    trustScore: { type: Number, default: 50, index: true },
    badge: { type: String, enum: ['new', 'improving', 'trusted', 'elite'], default: 'new', index: true },
    stats: {
      verifiedListings: { type: Number, default: 0 },
      suspiciousListings: { type: Number, default: 0 },
      successfulOrders: { type: Number, default: 0 },
      disputesOpened: { type: Number, default: 0 },
      confirmedFraudCases: { type: Number, default: 0 },
      returnsCount: { type: Number, default: 0 },
      avgImageVideoConfidence: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export const SellerTrustProfile = mongoose.model<ISellerTrustProfile>(
  'SellerTrustProfile',
  sellerTrustProfileSchema,
);

