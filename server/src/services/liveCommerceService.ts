import mongoose from 'mongoose';
import { LiveCommerceSession, ILiveCommerceSession } from '../models/LiveCommerceSession';
import { getLiveCommerceSettings, type LivePermissionMode } from '../models/LiveCommerceSettings';
import { User } from '../models/User';

export function estimateLiveSessionScore(input: {
  clips: number;
  viewers?: number;
  productsTagged?: number;
}) {
  const viewers = Math.max(0, Number(input.viewers || 0));
  const score = Math.round(
    input.clips * 5 + viewers * 0.02 + Number(input.productsTagged || 0) * 3
  );
  return { score };
}

export async function isLiveGloballyEnabled(): Promise<boolean> {
  const { isSystemFeatureEnabled } = await import('./systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('live_commerce'))) return false;
  const settings = await getLiveCommerceSettings();
  return Boolean(settings.globallyEnabled);
}

export function resolveLivePermissionMode(settings: {
  livePermissionMode?: LivePermissionMode;
  requireSellerApproval?: boolean;
}): LivePermissionMode {
  if (settings.livePermissionMode === 'allowlist' || settings.livePermissionMode === 'verified_sellers') {
    return settings.livePermissionMode;
  }
  return settings.requireSellerApproval === false ? 'verified_sellers' : 'allowlist';
}

export async function canSellerGoLive(sellerId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isLiveGloballyEnabled())) {
    return { ok: false, reason: 'Live commerce is disabled platform-wide' };
  }
  const settings = await getLiveCommerceSettings();
  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    return { ok: false, reason: 'Invalid seller' };
  }
  const user = await User.findById(sellerId)
    .select('role sellerVerificationStatus liveCommerceApproved emailVerified fullName')
    .lean();
  if (!user || user.role !== 'seller') {
    return { ok: false, reason: 'Seller account required' };
  }
  if (!user.emailVerified) {
    return { ok: false, reason: 'Verify your email before going live' };
  }
  if (user.sellerVerificationStatus !== 'approved') {
    return { ok: false, reason: 'Complete seller verification first' };
  }

  const permissionMode = resolveLivePermissionMode(settings);
  if (permissionMode === 'allowlist' && !(user as { liveCommerceApproved?: boolean }).liveCommerceApproved) {
    return {
      ok: false,
      reason:
        'Live access not enabled for your store. Admin must approve your seller account once — you will not need approval for each session.',
    };
  }
  return { ok: true };
}

/** Lean seller fields used when serializing a live session for the API */
export type LiveSessionSellerInfo = {
  _id?: mongoose.Types.ObjectId | string;
  storeName?: string;
  name?: string;
  email?: string;
  sellerVerificationStatus?: string;
  sellerRating?: number;
};

export function serializeLiveSession(
  session: ILiveCommerceSession | Record<string, unknown>,
  seller?: LiveSessionSellerInfo | null
) {
  const s = session as ILiveCommerceSession;
  return {
    id: String(s._id),
    sellerId: String(s.sellerId),
    seller: seller
      ? {
          id: String((seller as { _id?: unknown; id?: unknown })._id || (seller as { id?: unknown }).id),
          name: seller.storeName || seller.name || seller.email || 'Seller',
          verified: seller.sellerVerificationStatus === 'approved',
          rating: seller.sellerRating ?? 4.8,
        }
      : null,
    title: s.title,
    subtitle: s.subtitle || '',
    mode: s.mode,
    status: s.status,
    thumbnailUrl: s.thumbnailUrl || '',
    streamUrl: s.playbackUrl || s.streamUrl || '',
    streamProvider: s.streamProvider || 'webrtc',
    streamId: s.streamId || '',
    playbackUrl: s.playbackUrl || s.streamUrl || '',
    ingestUrl: s.ingestUrl || '',
    hasStreamKey: Boolean(s.streamKey),
    pinnedProductId: s.pinnedProductId ? String(s.pinnedProductId) : null,
    productIds: (s.productIds || []).map((id) => String(id)),
    viewerCount: s.viewerCount || 0,
    currentPrice: s.currentPrice || 0,
    highestBid: s.highestBid || 0,
    reservePrice: s.reservePrice,
    minBidIncrement: s.minBidIncrement || 1,
    auctionEndsAt: s.auctionEndsAt,
    startedAt: s.startedAt,
    scheduledAt: s.scheduledAt,
    features: s.features,
    isPrivate: s.isPrivate,
    escrowProtected: s.escrowProtected !== false,
    aiInsight: s.aiInsight || '',
    bidCount: Array.isArray(s.bids) ? s.bids.length : 0,
    adminFrozen: Boolean(s.adminFrozen),
  };
}

export async function discoverLiveSessions(limit = 12) {
  const enabled = await isLiveGloballyEnabled();
  if (!enabled) return { enabled: false, sessions: [] };

  const { liveDiscoverFilter } = await import('./liveSellerPresence');
  const liveFilter = liveDiscoverFilter();

  const sessions = await LiveCommerceSession.find({
    $or: [
      liveFilter,
      {
        status: { $in: ['starting_soon', 'scheduled'] },
        isPrivate: false,
        adminFrozen: false,
      },
    ],
  })
    .sort({ status: 1, viewerCount: -1, startedAt: -1 })
    .limit(limit)
    .lean();

  const sellerIds = [...new Set(sessions.map((s) => String(s.sellerId)))];
  const sellers = await User.find({ _id: { $in: sellerIds } })
    .select('storeName name email sellerVerificationStatus sellerRating')
    .lean();
  const sellerMap = new Map(sellers.map((u) => [String(u._id), u]));

  return {
    enabled: true,
    sessions: sessions.map((s) =>
      serializeLiveSession(s as ILiveCommerceSession, sellerMap.get(String(s.sellerId)) || null)
    ),
  };
}

const ANTI_SNIPE_MS = 30_000;

export async function placeBid(input: {
  sessionId: string;
  userId: string;
  amount: number;
  autoMax?: number;
}) {
  const { isSystemFeatureEnabled } = await import('./systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('live_commerce_auctions'))) {
    throw new Error('Live auctions are disabled platform-wide');
  }

  const session = await LiveCommerceSession.findById(input.sessionId);
  if (!session) throw new Error('Session not found');
  if (session.adminFrozen) throw new Error('Auction is frozen');
  if (session.status !== 'live') throw new Error('Session is not live');
  if (!session.features?.bidding) throw new Error('Bidding disabled');
  if (session.mode !== 'auction' && session.mode !== 'flash_deal') {
    throw new Error('Bidding not available for this session type');
  }

  const minNext = (session.highestBid || session.currentPrice || 0) + (session.minBidIncrement || 1);
  if (input.amount < minNext) {
    throw new Error(`Minimum bid is ${minNext}`);
  }

  session.bids.push({
    userId: new mongoose.Types.ObjectId(input.userId),
    amount: input.amount,
    autoMax: input.autoMax,
    createdAt: new Date(),
  });
  session.highestBid = input.amount;
  session.currentPrice = input.amount;

  if (session.auctionEndsAt) {
    const ends = new Date(session.auctionEndsAt).getTime();
    if (ends - Date.now() < ANTI_SNIPE_MS) {
      session.auctionEndsAt = new Date(Date.now() + ANTI_SNIPE_MS);
    }
  }

  await session.save();
  return serializeLiveSession(session);
}
