import mongoose from 'mongoose';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { endStreamForSession } from '../streaming/streamSessionService';
import { broadcastLiveEnded } from '../socket/liveCommerceSockets';

/** YouTube-style: ~3 missed 10s heartbeats before auto-end */
const HEARTBEAT_TIMEOUT_MS = 90_000;
/** Socket blip / refresh — cancel if seller rejoins within this window */
const DISCONNECT_GRACE_MS = 25_000;
const NEW_STREAM_GRACE_MS = 120_000;

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
  }, 20_000);
}

export async function registerSellerPresence(sessionId: string, sellerId: string) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return;
  const now = Date.now();
  const existing = presenceBySession.get(sessionId);
  if (existing?.disconnectTimer) {
    clearTimeout(existing.disconnectTimer);
    existing.disconnectTimer = undefined;
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
  let entry = presenceBySession.get(sessionId);
  if (!entry) {
    entry = { sessionId, sellerId, lastBeat: Date.now() };
    presenceBySession.set(sessionId, entry);
  } else if (entry.sellerId !== sellerId) {
    return;
  }

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

export async function endStaleSellerLiveSessions(sellerId: string): Promise<string[]> {
  const now = Date.now();
  const heartbeatCutoff = new Date(now - HEARTBEAT_TIMEOUT_MS);
  const newStreamGrace = new Date(now - NEW_STREAM_GRACE_MS);

  const rows = await LiveCommerceSession.find({
    sellerId,
    status: { $in: ['live', 'starting_soon', 'paused'] },
    $or: [
      { sellerLastHeartbeatAt: { $lt: heartbeatCutoff } },
      { sellerLastHeartbeatAt: null, startedAt: { $lt: newStreamGrace } },
      { sellerLastHeartbeatAt: { $exists: false }, startedAt: { $lt: newStreamGrace } },
    ],
  })
    .select('_id')
    .lean();

  const ended: string[] = [];
  for (const row of rows) {
    const id = String(row._id);
    await endSellerLive(id, sellerId, 'network_lost');
    ended.push(id);
  }
  return ended;
}

/** End every in-progress seller session (live, starting_soon, paused). */
export async function forceEndSellerLiveSessions(sellerId: string): Promise<string[]> {
  const rows = await LiveCommerceSession.find({
    sellerId,
    status: { $in: ['live', 'starting_soon', 'paused'] },
  })
    .select('_id status')
    .lean();

  const ended: string[] = [];
  for (const row of rows) {
    const id = String(row._id);
    if (row.status === 'live') {
      await endSellerLive(id, sellerId, 'seller_ended');
    } else {
      await LiveCommerceSession.updateOne(
        { _id: row._id, sellerId },
        { $set: { status: 'ended', endedAt: new Date() } }
      );
      clearSellerPresence(id);
      broadcastLiveEnded(id, { status: 'ended', reason: 'seller_ended' });
    }
    ended.push(id);
  }
  return ended;
}

async function sweepStaleSessions() {
  const now = Date.now();

  for (const [sessionId, entry] of presenceBySession.entries()) {
    if (now - entry.lastBeat > HEARTBEAT_TIMEOUT_MS) {
      await endSellerLive(sessionId, entry.sellerId, 'heartbeat_timeout');
    }
  }

  const heartbeatCutoff = new Date(now - HEARTBEAT_TIMEOUT_MS);
  const newStreamGrace = new Date(now - NEW_STREAM_GRACE_MS);

  const stale = await LiveCommerceSession.find({
    status: 'live',
    $or: [
      { sellerLastHeartbeatAt: { $lt: heartbeatCutoff } },
      {
        sellerLastHeartbeatAt: { $exists: false },
        startedAt: { $lt: newStreamGrace },
      },
      {
        sellerLastHeartbeatAt: null,
        startedAt: { $lt: newStreamGrace },
      },
    ],
  })
    .select('_id sellerId')
    .limit(30)
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
    .select('_id sellerLastHeartbeatAt startedAt status')
    .sort({ createdAt: -1 })
    .lean();

  if (!row) return null;

  const id = String(row._id);
  if (row.status !== 'live') {
    const started = row.startedAt ? new Date(row.startedAt).getTime() : 0;
    const staleStarting =
      row.status === 'starting_soon' &&
      started > 0 &&
      Date.now() - started > NEW_STREAM_GRACE_MS;
    if (staleStarting) {
      await LiveCommerceSession.updateOne(
        { _id: row._id, sellerId },
        { $set: { status: 'ended', endedAt: new Date() } }
      );
      clearSellerPresence(id);
      return null;
    }
    return id;
  }

  const lastBeat = row.sellerLastHeartbeatAt
    ? new Date(row.sellerLastHeartbeatAt).getTime()
    : 0;
  const started = row.startedAt ? new Date(row.startedAt).getTime() : 0;
  const fresh =
    (lastBeat && Date.now() - lastBeat < HEARTBEAT_TIMEOUT_MS) ||
    (!lastBeat && started && Date.now() - started < NEW_STREAM_GRACE_MS);

  if (!fresh) {
    await endSellerLive(id, sellerId, 'network_lost');
    return null;
  }

  return id;
}

/** Sessions buyers should see in discover (actually broadcasting). */
export function liveDiscoverFilter() {
  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const newStreamGrace = new Date(Date.now() - NEW_STREAM_GRACE_MS);
  return {
    status: 'live' as const,
    isPrivate: false,
    adminFrozen: false,
    $or: [
      { sellerLastHeartbeatAt: { $gte: heartbeatCutoff } },
      { sellerLastHeartbeatAt: null, startedAt: { $gte: newStreamGrace } },
      { sellerLastHeartbeatAt: { $exists: false }, startedAt: { $gte: newStreamGrace } },
    ],
  };
}
