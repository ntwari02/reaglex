import mongoose, { Document, Schema } from 'mongoose';

export interface INegotiationSession extends Document {
  buyerId: mongoose.Types.ObjectId;
  sellerId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  quantity: number;
  targetPrice: number;
  currency: string;
  aiCounterOffer?: number;
  status: 'open' | 'accepted' | 'rejected' | 'expired';
  transcript: Array<{ actor: 'buyer' | 'ai' | 'seller'; message: string; at: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const negotiationSessionSchema = new Schema<INegotiationSession>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    targetPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    aiCounterOffer: { type: Number, min: 0 },
    status: { type: String, enum: ['open', 'accepted', 'rejected', 'expired'], default: 'open', index: true },
    transcript: {
      type: [
        new Schema(
          {
            actor: { type: String, enum: ['buyer', 'ai', 'seller'], required: true },
            message: { type: String, required: true },
            at: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const NegotiationSession = mongoose.model<INegotiationSession>(
  'NegotiationSession',
  negotiationSessionSchema
);
