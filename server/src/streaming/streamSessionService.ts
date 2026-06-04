import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { StreamProviderFactory } from './StreamProviderFactory';
import type { StreamCreateOptions, StreamProviderType } from './types';

export async function attachStreamToSession(
  sessionId: string,
  providerType?: string,
  options?: StreamCreateOptions & { sellerOnly?: boolean }
) {
  const session = await LiveCommerceSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  const provider = StreamProviderFactory.create(providerType);
  const stream = await provider.createStream({
    title: session.title,
    sessionId: String(session._id),
    ...options,
  });

  session.streamProvider = stream.provider;
  session.streamId = stream.streamId;
  session.playbackUrl = stream.playbackUrl;
  session.streamUrl = stream.playbackUrl;
  session.streamKey = stream.streamKey;
  session.ingestUrl = stream.ingestUrl;
  if (!session.startedAt) session.startedAt = new Date();
  if (session.status === 'scheduled') session.status = 'live';

  await session.save();
  return { session, stream };
}

export async function endStreamForSession(sessionId: string) {
  const session = await LiveCommerceSession.findById(sessionId);
  if (!session) throw new Error('Session not found');

  if (session.streamProvider && session.streamId) {
    const provider = StreamProviderFactory.create(session.streamProvider);
    await provider.endStream(session.streamId).catch(() => {});
  }
  if (session.streamProvider === 'webrtc') {
    const { clearWebRTCRoom } = await import('../socket/webrtcSignaling');
    clearWebRTCRoom(String(session._id));
  }

  session.status = session.features?.replay ? 'replay_available' : 'ended';
  session.endedAt = new Date();
  await session.save();

  try {
    const { broadcastLiveEnded } = await import('../socket/liveCommerceSockets');
    broadcastLiveEnded(String(session._id), { status: session.status, reason: 'seller_ended' });
  } catch {
    /* socket not ready */
  }

  try {
    const { clearSellerPresence } = await import('../services/liveSellerPresence');
    clearSellerPresence(String(session._id));
  } catch {
    /* noop */
  }

  return session;
}

export async function refreshPlaybackUrl(sessionId: string) {
  const session = await LiveCommerceSession.findById(sessionId);
  if (!session?.streamId || !session.streamProvider) {
    throw new Error('No stream attached');
  }
  const provider = StreamProviderFactory.create(session.streamProvider);
  const playbackUrl = await provider.getPlaybackUrl(session.streamId, {
    isLive: session.status === 'live',
  });
  session.playbackUrl = playbackUrl;
  session.streamUrl = playbackUrl;
  await session.save();
  return playbackUrl;
}

export async function getDefaultProvider(): Promise<StreamProviderType> {
  const { getStreamingConfig } = await import('./streamingSettings');
  const config = await getStreamingConfig();
  return config.defaultProvider;
}
