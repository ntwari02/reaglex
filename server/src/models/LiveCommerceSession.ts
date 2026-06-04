import mongoose, { Document, Schema } from 'mongoose';
import type { StreamProviderType } from '../streaming/types';

export type LiveSessionMode = 'showcase' | 'auction' | 'flash_deal' | 'private';
export type LiveSessionStatus =
  | 'scheduled'
  | 'starting_soon'
  | 'live'
  | 'paused'
  | 'ended'
  | 'replay_available'
  | 'restricted'
  | 'removed';

export interface ILiveBid {
  userId: mongoose.Types.ObjectId;
  amount: number;
  autoMax?: number;
  createdAt: Date;
}

export interface ILiveTimelineEvent {
  offsetMs: number;
  type: 'pin' | 'unpin' | 'reaction' | 'status' | 'comment';
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface ILiveCommerceSession extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  mode: LiveSessionMode;
  status: LiveSessionStatus;
  thumbnailUrl?: string;
  /** @deprecated use playbackUrl — kept for backward compatibility */
  streamUrl?: string;
  streamProvider?: StreamProviderType;
  streamId?: string;
  playbackUrl?: string;
  streamKey?: string;
  ingestUrl?: string;
  productIds: mongoose.Types.ObjectId[];
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  /** Updated while seller is broadcasting (heartbeat). */
  sellerLastHeartbeatAt?: Date;
  auctionEndsAt?: Date;
  viewerCount: number;
  currentPrice: number;
  highestBid: number;
  reservePrice?: number;
  minBidIncrement: number;
  bids: ILiveBid[];
  features: {
    chat: boolean;
    bidding: boolean;
    reactions: boolean;
    replay: boolean;
    instantBuy: boolean;
    autoBid: boolean;
  };
  isPrivate: boolean;
  pinnedProductId?: mongoose.Types.ObjectId;
  escrowProtected: boolean;
  aiInsight?: string;
  clips: Array<{ url: string; productId?: mongoose.Types.ObjectId; createdAt: Date }>;
  adminFrozen: boolean;
  timeline: ILiveTimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const liveCommerceSessionSchema = new Schema<ILiveCommerceSession>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    mode: {
      type: String,
      enum: ['showcase', 'auction', 'flash_deal', 'private'],
      default: 'showcase',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'scheduled',
        'starting_soon',
        'live',
        'paused',
        'ended',
        'replay_available',
        'restricted',
        'removed',
      ],
      default: 'scheduled',
      index: true,
    },
    thumbnailUrl: { type: String, trim: true },
    streamUrl: { type: String, trim: true },
    streamProvider: {
      type: String,
      enum: ['webrtc', 'youtube', 'mux', 'aws-ivs', 'cloudflare', 'agora', 'livekit', 'vimeo', 'selfhosted'],
      default: 'webrtc',
    },
    streamId: { type: String, trim: true },
    playbackUrl: { type: String, trim: true },
    streamKey: { type: String, trim: true },
    ingestUrl: { type: String, trim: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    sellerLastHeartbeatAt: { type: Date },
    auctionEndsAt: { type: Date },
    viewerCount: { type: Number, default: 0 },
    currentPrice: { type: Number, default: 0 },
    highestBid: { type: Number, default: 0 },
    reservePrice: { type: Number },
    minBidIncrement: { type: Number, default: 1 },
    bids: {
      type: [
        new Schema(
          {
            userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            amount: { type: Number, required: true },
            autoMax: { type: Number },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    features: {
      chat: { type: Boolean, default: true },
      bidding: { type: Boolean, default: true },
      reactions: { type: Boolean, default: true },
      replay: { type: Boolean, default: true },
      instantBuy: { type: Boolean, default: true },
      autoBid: { type: Boolean, default: true },
    },
    isPrivate: { type: Boolean, default: false },
    pinnedProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    escrowProtected: { type: Boolean, default: true },
    aiInsight: { type: String, trim: true },
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
    adminFrozen: { type: Boolean, default: false },
    timeline: {
      type: [
        new Schema(
          {
            offsetMs: { type: Number, required: true },
            type: { type: String, enum: ['pin', 'unpin', 'reaction', 'status', 'comment'], required: true },
            payload: { type: Schema.Types.Mixed, default: {} },
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

liveCommerceSessionSchema.index({ status: 1, mode: 1, startedAt: -1 });

export const LiveCommerceSession = mongoose.model<ILiveCommerceSession>(
  'LiveCommerceSession',
  liveCommerceSessionSchema
);
