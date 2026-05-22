import mongoose, { Document, Schema } from 'mongoose';
import type { StreamProviderType } from '../streaming/types';

export type LivePermissionMode = 'allowlist' | 'verified_sellers';

export interface ILiveCommerceSettings extends Document {
  globallyEnabled: boolean;
  /** @deprecated use livePermissionMode — kept for backward compat */
  requireSellerApproval: boolean;
  /** allowlist = one-time admin approval per seller; verified_sellers = any verified seller */
  livePermissionMode: LivePermissionMode;
  minSalesThreshold: number;
  maxDurationMinutes: number;
  streaming: {
    defaultProvider: StreamProviderType;
    webrtcMaxViewers: number;
    providers: Record<
      StreamProviderType,
      { enabled: boolean }
    >;
  };
  features: {
    auctions: boolean;
    instantBuy: boolean;
    reactions: boolean;
    tipping: boolean;
    aiInsights: boolean;
    chat: boolean;
    replay: boolean;
    recording: boolean;
    autoBidding: boolean;
  };
  updatedAt: Date;
}

const providerFlagSchema = new Schema(
  { enabled: { type: Boolean, default: false } },
  { _id: false }
);

const liveCommerceSettingsSchema = new Schema<ILiveCommerceSettings>(
  {
    globallyEnabled: { type: Boolean, default: true },
    requireSellerApproval: { type: Boolean, default: true },
    livePermissionMode: {
      type: String,
      enum: ['allowlist', 'verified_sellers'],
      default: 'allowlist',
    },
    minSalesThreshold: { type: Number, default: 0 },
    maxDurationMinutes: { type: Number, default: 180 },
    streaming: {
      defaultProvider: {
        type: String,
        enum: ['webrtc', 'youtube', 'livekit', 'agora', 'mux', 'aws-ivs', 'cloudflare', 'vimeo', 'selfhosted'],
        default: 'webrtc',
      },
      webrtcMaxViewers: { type: Number, default: 10 },
      providers: {
        webrtc: { type: providerFlagSchema, default: () => ({ enabled: true }) },
        youtube: { type: providerFlagSchema, default: () => ({ enabled: true }) },
        livekit: { type: providerFlagSchema, default: () => ({ enabled: false }) },
        agora: { type: providerFlagSchema, default: () => ({ enabled: false }) },
        mux: { type: providerFlagSchema, default: () => ({ enabled: false }) },
        'aws-ivs': { type: providerFlagSchema, default: () => ({ enabled: false }) },
        cloudflare: { type: providerFlagSchema, default: () => ({ enabled: false }) },
        vimeo: { type: providerFlagSchema, default: () => ({ enabled: false }) },
        selfhosted: { type: providerFlagSchema, default: () => ({ enabled: false }) },
      },
    },
    features: {
      auctions: { type: Boolean, default: true },
      instantBuy: { type: Boolean, default: true },
      reactions: { type: Boolean, default: true },
      tipping: { type: Boolean, default: false },
      aiInsights: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      replay: { type: Boolean, default: true },
      recording: { type: Boolean, default: true },
      autoBidding: { type: Boolean, default: true },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export async function getLiveCommerceSettings() {
  let doc = await LiveCommerceSettings.findOne();
  if (!doc) doc = await LiveCommerceSettings.create({});
  return doc;
}

export const LiveCommerceSettings = mongoose.model<ILiveCommerceSettings>(
  'LiveCommerceSettings',
  liveCommerceSettingsSchema
);
