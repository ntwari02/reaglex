import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveCommerceSession extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  status: 'scheduled' | 'live' | 'ended';
  streamUrl?: string;
  clips: Array<{ url: string; productId?: mongoose.Types.ObjectId; createdAt: Date }>;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const liveCommerceSessionSchema = new Schema<ILiveCommerceSession>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled', index: true },
    streamUrl: { type: String, trim: true },
    clips: {
      type: [
        new Schema(
          {
            url: { type: String, required: true },
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export const LiveCommerceSession = mongoose.model<ILiveCommerceSession>(
  'LiveCommerceSession',
  liveCommerceSessionSchema
);
