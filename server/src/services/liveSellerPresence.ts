import mongoose from 'mongoose';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { endStreamForSession } from '../streaming/streamSessionService';
import { broadcastLiveEnded } from '../socket/liveCommerceSockets';

const HEARTBEAT_TIMEOUT_MS = 45_000;
const DISCONNECT_GRACE_MS = 5_000;

type PresenceEntry = {
  sessionId: string;
  sellerId: string;
  lastBeat: number;
  disconnectTimer?: ReturnType<typeof setTimeout>;
};

const presenceBySession = new Map<string, PresenceEntry>();
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

export function ensurePresenceWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    void sweepStaleSessions();
  }, 15_000);
}

export async function registerSellerPresence(sessionId: string, sellerId: string) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return;
  const now = Date.now();
  const existing = presenceBySession.get(sessionId);
  if (existing?.disconnectTimer) {
    clearTimeout(existing.disconnectTimer);
  }
  presenceBySession.set(sessionId, { sessionId, sellerId, lastBeat: now });
  await LiveCommerceSession.updateOne(
    { _id: sessionId, sellerId, status: 'live' },
    { $set: { sellerLastHeartbeatAt: new Date(now) } }
  );
  ensurePresenceWatchdog();
}

export async function touchSellerHeartbeat(sessionId: string, sellerId: string) {
  const session = await LiveCommerceSession.findById(sessionId).select('sellerId status').lean();
  if (!session || session.status !== 'live' || String(session.sellerId) !== sellerId) {
    return { ok: false as const };
  }
  await registerSellerPresence(sessionId, sellerId);
  return { ok: true as const };
}

export function scheduleSellerDisconnect(sessionId: string, sellerId: string) {
  const entry = presenceBySession.get(sessionId);
  if (!entry || entry.sellerId !== sellerId) return;

  if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer);
  entry.disconnectTimer = setTimeout(() => {
    void endSellerLive(sessionId, sellerId, 'seller_disconnected');
  }, DISCONNECT_GRACE_MS);
}

export function cancelSellerDisconnect(sessionId: string) {
  const entry = presenceBySession.get(sessionId);
  if (entry?.disconnectTimer) {
    clearTimeout(entry.disconnectTimer);
    entry.disconnectTimer = undefined;
  }
}

export async function endSellerLive(
  sessionId: string,
  sellerId: string,
  reason: 'seller_disconnected' | 'heartbeat_timeout' | 'seller_ended' | 'network_lost'
) {
  const session = await LiveCommerceSession.findById(sessionId).lean();
  if (!session || session.status !== 'live' || String(session.sellerId) !== sellerId) {
    presenceBySession.delete(sessionId);
    return;
  }

  presenceBySession.delete(sessionId);
  await endStreamForSession(sessionId);
  broadcastLiveEnded(sessionId, { status: 'ended', reason });
}

async function sweepStaleSessions() {
  const now = Date.now();
  for (const [sessionId, entry] of presenceBySession.entries()) {
    if (now - entry.lastBeat > HEARTBEAT_TIMEOUT_MS) {
      await endSellerLive(sessionId, entry.sellerId, 'heartbeat_timeout');
    }
  }

  const stale = await LiveCommerceSession.find({
    status: 'live',
    sellerLastHeartbeatAt: { $lt: new Date(now - HEARTBEAT_TIMEOUT_MS) },
  })
    .select('_id sellerId')
    .limit(20)
    .lean();

  await Promise.allSettled(
    stale.map((s) => endSellerLive(String(s._id), String(s.sellerId), 'network_lost'))
  );
}

export function clearSellerPresence(sessionId: string) {
  const entry = presenceBySession.get(sessionId);
  if (entry?.disconnectTimer) clearTimeout(entry.disconnectTimer);
  presenceBySession.delete(sessionId);
}

export async function getSellerActiveLiveSessionId(sellerId: string): Promise<string | null> {
  const row = await LiveCommerceSession.findOne({
    sellerId,
    status: { $in: ['live', 'starting_soon', 'paused'] },
  })
    .select('_id')
    .sort({ createdAt: -1 })
    .lean();
  return row ? String(row._id) : null;
}
