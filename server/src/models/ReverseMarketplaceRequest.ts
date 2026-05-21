import mongoose, { Document, Schema } from 'mongoose';

export interface IReverseMarketplaceRequest extends Document {
  buyerId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  budgetMax: number;
  currency: string;
  status: 'open' | 'awarded' | 'closed';
  bids: Array<{
    sellerId: mongoose.Types.ObjectId;
    amount: number;
    message?: string;
    etaDays?: number;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const reverseMarketplaceRequestSchema = new Schema<IReverseMarketplaceRequest>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    budgetMax: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['open', 'awarded', 'closed'], default: 'open', index: true },
    bids: {
      type: [
        new Schema(
          {
            sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            amount: { type: Number, required: true, min: 0 },
            message: { type: String },
            etaDays: { type: Number, min: 0 },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const ReverseMarketplaceRequest = mongoose.model<IReverseMarketplaceRequest>(
  'ReverseMarketplaceRequest',
  reverseMarketplaceRequestSchema
);
