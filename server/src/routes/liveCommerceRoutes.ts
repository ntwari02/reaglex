import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import {
  LiveCommerceSession,
  ILiveCommerceSession,
  LiveSessionMode,
} from '../models/LiveCommerceSession';
import type { StreamProviderType } from '../streaming/types';
import { LiveCommerceSettings, getLiveCommerceSettings } from '../models/LiveCommerceSettings';
import { User } from '../models/User';
import {
  canSellerGoLive,
  discoverLiveSessions,
  estimateLiveSessionScore,
  isLiveGloballyEnabled,
  placeBid,
  resolveLivePermissionMode,
  serializeLiveSession,
} from '../services/liveCommerceService';
import { clearWebRTCRoom } from '../socket/webrtcSignaling';
import { getLiveChatHistory } from '../services/liveCommerceChat';
import { notifySellerWentLive } from '../services/liveCommerceNotify';
import { Product } from '../models/Product';
import { StreamProviderFactory } from '../streaming/StreamProviderFactory';
import {
  attachStreamToSession,
  endStreamForSession,
  getDefaultProvider,
} from '../streaming/streamSessionService';
import { assertProviderAllowed, getStreamingConfig, PROVIDER_LABELS } from '../streaming/streamingSettings';

const router = Router();

const LIVE_MODES: LiveSessionMode[] = ['showcase', 'auction', 'flash_deal', 'private'];

type CreateLiveSessionBody = {
  title?: string;
  subtitle?: string;
  mode?: LiveSessionMode;
  streamUrl?: string;
  streamProvider?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  productIds?: string[];
  reservePrice?: number;
  minBidIncrement?: number;
  scheduledAt?: string;
  features?: {
    chat?: boolean;
    bidding?: boolean;
    reactions?: boolean;
    replay?: boolean;
    instantBuy?: boolean;
    autoBid?: boolean;
  };
  isPrivate?: boolean;
  auctionDurationMinutes?: number;
};

function parseSessionMode(mode: unknown): LiveSessionMode {
  const m = String(mode || 'showcase') as LiveSessionMode;
  return LIVE_MODES.includes(m) ? m : 'showcase';
}

router.get('/settings/public', async (_req, res: Response) => {
  try {
    const settings = await getLiveCommerceSettings();
    const globallyOn = await isLiveGloballyEnabled();
    const streaming = await getStreamingConfig();
    return res.json({
      enabled: globallyOn,
      livePermissionMode: resolveLivePermissionMode(settings),
      features: settings.features,
      streaming: {
        defaultProvider: streaming.defaultProvider,
        enabledProviders: streaming.enabledProviders,
        webrtcMaxViewers: streaming.webrtcMaxViewers,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/seller/end-stale-live', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Seller only' });
    }
    const { endStaleSellerLiveSessions } = await import('../services/liveSellerPresence');
    const ended = await endStaleSellerLiveSessions(req.user.id);
    return res.json({ success: true, ended });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/seller/live-status', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const gate = await canSellerGoLive(req.user.id);
    const user = await User.findById(req.user.id)
      .select('liveCommerceApproved sellerVerificationStatus role')
      .lean();
    const settings = await getLiveCommerceSettings();
    const permissionMode = resolveLivePermissionMode(settings);
    const { getSellerActiveLiveSessionId, endStaleSellerLiveSessions } = await import(
      '../services/liveSellerPresence'
    );
    let activeId = await getSellerActiveLiveSessionId(req.user.id);
    if (!activeId) {
      await endStaleSellerLiveSessions(req.user.id);
    }
    let activeSession = null;
    if (activeId) {
      const row = await LiveCommerceSession.findById(activeId).lean();
      if (row) {
        const sellerDoc = await User.findById(req.user.id)
          .select('storeName name email sellerVerificationStatus sellerRating')
          .lean();
        activeSession = serializeLiveSession(row, sellerDoc);
      }
    }
    return res.json({
      canGoLive: gate.ok,
      reason: gate.reason || null,
      liveCommerceApproved: Boolean((user as { liveCommerceApproved?: boolean })?.liveCommerceApproved),
      permissionMode,
      globallyEnabled: settings.globallyEnabled,
      activeSession,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/discover', async (req, res: Response) => {
  try {
    const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));
    const data = await discoverLiveSessions(limit);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/session/:sessionId', async (req, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Invalid session id' });
    }
    const enabled = await isLiveGloballyEnabled();
    const session = await LiveCommerceSession.findById(sessionId).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!enabled && session.status === 'live') {
      return res.status(403).json({ message: 'Live commerce is disabled' });
    }
    const seller = await User.findById(session.sellerId)
      .select('storeName name email sellerVerificationStatus sellerRating')
      .lean();
    return res.json({
      enabled,
      session: serializeLiveSession(session, seller),
      recentBids: (session.bids || []).slice(-8).reverse(),
      timeline: session.timeline || [],
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Seller only' });
    }
    const gate = await canSellerGoLive(req.user.id);
    if (!gate.ok) return res.status(403).json({ message: gate.reason });

    const { forceEndSellerLiveSessions } = await import('../services/liveSellerPresence');
    await forceEndSellerLiveSessions(req.user.id);

    const body = req.body as CreateLiveSessionBody;
    const {
      title,
      subtitle,
      mode: modeInput,
      streamUrl,
      streamProvider,
      youtubeVideoId,
      youtubeUrl,
      thumbnailUrl,
      productIds = [],
      reservePrice,
      minBidIncrement,
      scheduledAt,
      features = {},
      isPrivate = false,
      auctionDurationMinutes = 30,
    } = body;

    if (!title) return res.status(400).json({ message: 'title is required' });

    const sessionMode = parseSessionMode(modeInput);
    const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
    if (
      (sessionMode === 'auction' || sessionMode === 'flash_deal') &&
      !(await isSystemFeatureEnabled('live_commerce_auctions'))
    ) {
      return res.status(503).json({
        message: 'Live auctions are disabled platform-wide',
        code: 'FEATURE_DISABLED',
      });
    }
    let resolvedProvider =
      (streamProvider as StreamProviderType) || (await getDefaultProvider());
    try {
      await assertProviderAllowed(resolvedProvider);
    } catch {
      const fallback = await getDefaultProvider();
      try {
        await assertProviderAllowed(fallback);
        resolvedProvider = fallback;
      } catch (providerErr: any) {
        return res.status(400).json({
          message: providerErr?.message || 'No streaming providers are enabled',
        });
      }
    }

    const settings = await getLiveCommerceSettings();
    const chatPlatformOn = await isSystemFeatureEnabled('live_commerce_chat');
    const auctionsOn = await isSystemFeatureEnabled('live_commerce_auctions');
    const now = new Date();
    const auctionEndsAt =
      sessionMode === 'auction' || sessionMode === 'flash_deal'
        ? new Date(now.getTime() + Math.min(settings.maxDurationMinutes, Number(auctionDurationMinutes) || 30) * 60_000)
        : undefined;

    let session: ILiveCommerceSession = await LiveCommerceSession.create({
      sellerId: new mongoose.Types.ObjectId(req.user.id),
      title: String(title),
      subtitle: String(subtitle || ''),
      mode: sessionMode,
      status: scheduledAt ? 'scheduled' : 'starting_soon',
      streamProvider: resolvedProvider,
      thumbnailUrl: String(thumbnailUrl || ''),
      productIds: (Array.isArray(productIds) ? productIds : [])
        .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
        .map((id) => new mongoose.Types.ObjectId(String(id))),
      scheduledAt: scheduledAt ? new Date(String(scheduledAt)) : undefined,
      startedAt: scheduledAt ? undefined : now,
      auctionEndsAt,
      reservePrice: reservePrice != null ? Math.max(0, Number(reservePrice)) : undefined,
      minBidIncrement: Math.max(1, Number(minBidIncrement) || 1),
      currentPrice: reservePrice != null ? Number(reservePrice) : 0,
      features: {
        chat: chatPlatformOn && features.chat !== false,
        bidding:
          auctionsOn &&
          (sessionMode === 'auction' || sessionMode === 'flash_deal') &&
          features.bidding !== false,
        reactions: features.reactions !== false,
        replay: features.replay !== false,
        instantBuy: auctionsOn && features.instantBuy !== false,
        autoBid: auctionsOn && features.autoBid !== false,
      },
      isPrivate: Boolean(isPrivate) || sessionMode === 'private',
      aiInsight: 'Demand trending · viewers engaging now',
      clips: [],
      timeline: [],
    });

    if (!scheduledAt) {
      try {
        const attached = await attachStreamToSession(String(session._id), session.streamProvider, {
          youtubeVideoId: String(youtubeVideoId || ''),
          youtubeUrl: String(youtubeUrl || streamUrl || ''),
          title: session.title,
        });
        session = attached.session;
        session.status = 'live';
        session.sellerLastHeartbeatAt = new Date();
        await session.save();
      } catch (streamErr: any) {
        await LiveCommerceSession.deleteOne({ _id: session._id });
        return res.status(400).json({
          message: streamErr?.message || 'Could not attach stream to session',
        });
      }
      notifySellerWentLive(String(session._id), req.user.id).catch((err) => {
        console.warn('[live] notifySellerWentLive failed:', err?.message);
      });
    }

    const seller = await User.findById(req.user.id)
      .select('storeName name email sellerVerificationStatus sellerRating')
      .lean();

    return res.status(201).json({
      success: true,
      session: serializeLiveSession(session, seller),
    });
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    const status =
      err?.name === 'ValidationError' || /not enabled|required|invalid/i.test(msg) ? 400 : 500;
    return res.status(status).json({
      message: status === 400 ? msg : 'Failed to start live session',
      error: msg,
    });
  }
});

router.get('/session/:sessionId/comments', async (req, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: 'Invalid session id' });
    }
    const messages = await getLiveChatHistory(sessionId);
    return res.json({ messages });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get(
  '/session/:sessionId/seller-products',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const session = await LiveCommerceSession.findById(req.params.sessionId).lean();
      if (!session) return res.status(404).json({ message: 'Session not found' });
      if (String(session.sellerId) !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Seller only' });
      }
      const filter: Record<string, unknown> = { sellerId: session.sellerId };
      if (session.productIds?.length) {
        filter._id = { $in: session.productIds };
      }
      const products = await Product.find(filter)
        .select('title name price images image thumbnail')
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean();
      return res.json({
        products: products.map((p) => ({
          id: String(p._id),
          title: (p as any).title || (p as any).name,
          price: (p as any).price,
          image: (p as any).images?.[0] || (p as any).image || (p as any).thumbnail,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
);

router.post('/session/:sessionId/bid', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { amount, autoMax } = req.body as { amount?: number; autoMax?: number };
    const session = await placeBid({
      sessionId: req.params.sessionId,
      userId: req.user.id,
      amount: Math.max(0, Number(amount) || 0),
      autoMax: autoMax != null ? Number(autoMax) : undefined,
    });
    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

router.get('/providers', async (_req, res: Response) => {
  try {
    const config = await getStreamingConfig();
    const providers = config.enabledProviders.map((id) => ({
      id,
      label: PROVIDER_LABELS[id],
      enabled: true,
    }));
    return res.json({
      defaultProvider: config.defaultProvider,
      providers,
      enabledProviders: config.enabledProviders,
      webrtcMaxViewers: config.webrtcMaxViewers,
      allProviders: StreamProviderFactory.supportedProviders().map((id) => ({
        id,
        label: PROVIDER_LABELS[id],
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/session/:sessionId/stream/start', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const session = await LiveCommerceSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.sellerId) !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    const { streamProvider, youtubeVideoId, youtubeUrl } = req.body as Record<string, string>;
    if (streamProvider) await assertProviderAllowed(streamProvider);
    const result = await attachStreamToSession(
      String(session._id),
      streamProvider || session.streamProvider,
      {
        youtubeVideoId,
        youtubeUrl,
        title: session.title,
      }
    );
    result.session.status = 'live';
    await result.session.save();

    const seller = await User.findById(req.user.id)
      .select('storeName name email sellerVerificationStatus sellerRating')
      .lean();

    return res.json({
      success: true,
      session: serializeLiveSession(result.session, seller),
      stream: result.stream,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

router.post(
  '/session/:sessionId/seller-heartbeat',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== 'seller') {
        return res.status(403).json({ message: 'Seller only' });
      }
      const { touchSellerHeartbeat } = await import('../services/liveSellerPresence');
      const result = await touchSellerHeartbeat(req.params.sessionId, req.user.id);
      if (!result.ok) return res.status(404).json({ message: 'Live session not found' });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
);

router.post('/session/:sessionId/stream/end', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const session = await LiveCommerceSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.sellerId) !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    const ended = await endStreamForSession(String(session._id));
    const { clearSellerPresence } = await import('../services/liveSellerPresence');
    clearSellerPresence(String(session._id));
    return res.json({ success: true, session: serializeLiveSession(ended) });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
});

router.get('/session/:sessionId/stream/credentials', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const session = await LiveCommerceSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.sellerId) !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    return res.json({
      streamProvider: session.streamProvider,
      streamId: session.streamId,
      playbackUrl: session.playbackUrl,
      ingestUrl: session.ingestUrl,
      streamKey: session.streamKey,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/session/:sessionId/replay', async (req, res: Response) => {
  try {
    const session = await LiveCommerceSession.findById(req.params.sessionId).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });
    return res.json({
      playbackUrl: session.playbackUrl || session.streamUrl,
      streamProvider: session.streamProvider || 'youtube',
      timeline: session.timeline || [],
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/session/:sessionId/clip', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const { sessionId } = req.params;
    const { url, productId } = req.body as { url?: string; productId?: string };
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ message: 'Invalid sessionId' });
    if (!url) return res.status(400).json({ message: 'url is required' });

    const session = await LiveCommerceSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.sellerId) !== req.user.id) return res.status(403).json({ message: 'Access denied' });
    session.clips.push({
      url: String(url),
      productId: mongoose.Types.ObjectId.isValid(String(productId || ''))
        ? new mongoose.Types.ObjectId(productId)
        : undefined,
      createdAt: new Date(),
    } as any);
    await session.save();
    const score = estimateLiveSessionScore({
      clips: session.clips.length,
      viewers: session.viewerCount,
      productsTagged: session.productIds?.length,
    });
    return res.json({ success: true, clips: session.clips, liveScore: score.score });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to add clip', error: err.message });
  }
});

/* ── Admin ─────────────────────────────────────────────────────────────── */

router.get('/admin/settings', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await getLiveCommerceSettings();
    return res.json({ settings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/admin/settings', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await getLiveCommerceSettings();
    const body = req.body as Partial<typeof settings>;
    if (body.globallyEnabled != null) settings.globallyEnabled = Boolean(body.globallyEnabled);
    if (body.requireSellerApproval != null) {
      settings.requireSellerApproval = Boolean(body.requireSellerApproval);
    }
    if (body.livePermissionMode === 'allowlist' || body.livePermissionMode === 'verified_sellers') {
      settings.livePermissionMode = body.livePermissionMode;
      settings.requireSellerApproval = body.livePermissionMode === 'allowlist';
    }
    if (body.minSalesThreshold != null) settings.minSalesThreshold = Number(body.minSalesThreshold);
    if (body.maxDurationMinutes != null) settings.maxDurationMinutes = Number(body.maxDurationMinutes);
    if (body.features) Object.assign(settings.features, body.features);
    if (body.streaming) {
      const s = body.streaming as {
        defaultProvider?: string;
        webrtcMaxViewers?: number;
        providers?: Record<string, { enabled?: boolean }>;
      };
      if (!settings.streaming) settings.streaming = {} as any;
      if (s.defaultProvider) settings.streaming.defaultProvider = s.defaultProvider as any;
      if (s.webrtcMaxViewers != null) settings.streaming.webrtcMaxViewers = Number(s.webrtcMaxViewers);
      if (s.providers) {
        for (const [key, val] of Object.entries(s.providers)) {
          if (settings.streaming.providers?.[key as keyof typeof settings.streaming.providers]) {
            (settings.streaming.providers as any)[key].enabled = Boolean(val?.enabled);
          }
        }
      }
    }
    await settings.save();
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/admin/sessions', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const sessions = await LiveCommerceSession.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ sessions });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/session/:sessionId', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, adminFrozen } = req.body as { status?: string; adminFrozen?: boolean };
    const session = await LiveCommerceSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (status) session.status = status as any;
    if (adminFrozen != null) session.adminFrozen = Boolean(adminFrozen);
    if (status === 'ended') {
      session.endedAt = new Date();
      clearWebRTCRoom(String(session._id));
    }
    await session.save();
    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/admin/sellers/live-permissions', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const filter: Record<string, unknown> = { role: 'seller' };
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ];
    }
    const sellers = await User.find(filter)
      .select('fullName email sellerVerificationStatus liveCommerceApproved createdAt')
      .sort({ liveCommerceApproved: -1, fullName: 1, email: 1 })
      .limit(Math.min(100, Number(req.query.limit) || 50))
      .lean();
    const settings = await getLiveCommerceSettings();
    return res.json({
      permissionMode: resolveLivePermissionMode(settings),
      sellers: sellers.map((s) => ({
        id: String(s._id),
        storeName: s.fullName || '',
        email: s.email,
        sellerVerificationStatus: s.sellerVerificationStatus,
        liveCommerceApproved: Boolean(s.liveCommerceApproved),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/seller/:sellerId/live-permission', authenticate, authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { approved } = req.body as { approved?: boolean };
    const user = await User.findByIdAndUpdate(
      req.params.sellerId,
      { liveCommerceApproved: Boolean(approved) },
      { new: true }
    ).select('liveCommerceApproved fullName email');
    if (!user) return res.status(404).json({ message: 'Seller not found' });
    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
