/**
 * Push notification dispatcher.
 *
 * Two transports are supported transparently:
 *  - Expo Push (mobile app) — for users with a native ExpoPushToken
 *  - Web Push (PWA browser) — for users who opted in via the web app
 *
 * No external SDK is required for Expo (HTTP POST). Web Push uses the
 * `web-push` library with VAPID keys from env (VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY, VAPID_SUBJECT). When VAPID is not configured we
 * silently skip web push delivery — this keeps local/dev environments
 * working without any extra setup.
 */
import mongoose from 'mongoose';
import webpush, { type PushSubscription as WebPushSubscriptionPayload } from 'web-push';
import { PushDevice } from '../models/PushDevice';
import { User } from '../models/User';
import { WebPushSubscription } from '../models/WebPushSubscription';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

let vapidConfigured = false;
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const pub = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const prv = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject =
    String(process.env.VAPID_SUBJECT || process.env.VAPID_CONTACT || '').trim() ||
    'mailto:notifications@spacilly.com';
  if (!pub || !prv) return false;
  try {
    webpush.setVapidDetails(subject, pub, prv);
    vapidConfigured = true;
    return true;
  } catch (e) {
    console.error('[push] failed to set VAPID details', e);
    return false;
  }
}

export function isWebPushConfigured(): boolean {
  return ensureVapidConfigured();
}

export function getWebPushPublicKey(): string {
  return String(process.env.VAPID_PUBLIC_KEY || '').trim();
}

export interface PushMessageInput {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** "default" | "high" | null */
  priority?: 'default' | 'high';
  /** iOS only */
  sound?: 'default' | null;
  /** Android channel id */
  channelId?: string;
  /** Click-through URL stored under data.url */
  url?: string;
  badge?: number;
  ttl?: number;
  /** Used by marketing flows so the notification can be tracked / categorized */
  category?: string;
}

export interface PushSendResult {
  totalTokens: number;
  delivered: number;
  failed: number;
  errors: string[];
}

function isLikelyExpoToken(token: string): boolean {
  const t = String(token || '').trim();
  return t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[');
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function postExpoBatch(messages: any[]): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `expo_http_${res.status}:${text.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function isPromoCategory(category?: string): boolean {
  return (
    category === 'recommendation' ||
    category === 'cart_pulse' ||
    category === 'browse_abandon' ||
    category === 'winback' ||
    category === 'abandoned_cart' ||
    category === 'live'
  );
}

function isMessageCategory(category?: string): boolean {
  return category === 'message' || category === 'messages';
}

function isOrderCategory(category?: string): boolean {
  return (
    category === 'order' ||
    category === 'seller' ||
    category === 'return' ||
    category === 'refund'
  );
}

async function buildUserOptInMap(
  ids: mongoose.Types.ObjectId[],
  msg: PushMessageInput,
): Promise<Map<string, boolean>> {
  const allowedByUser = new Map<string, boolean>();
  if (!ids.length) return allowedByUser;
  const users = await User.find({ _id: { $in: ids } })
    .select('_id notifications')
    .lean();
  for (const u of users as any[]) {
    const allow = u?.notifications?.push;
    if (!allow) {
      allowedByUser.set(String(u._id), true);
      continue;
    }
    allowedByUser.set(
      String(u._id),
      isPromoCategory(msg.category)
        ? Boolean(allow.promotions ?? true)
        : isMessageCategory(msg.category)
          ? Boolean(allow.messages ?? true)
          : isOrderCategory(msg.category)
            ? Boolean(allow.orderUpdates ?? true)
            : Boolean(allow.orderUpdates ?? allow.messages ?? true),
    );
  }
  return allowedByUser;
}

async function sendExpoBatch(
  ids: mongoose.Types.ObjectId[],
  msg: PushMessageInput,
  allowedByUser: Map<string, boolean>,
): Promise<PushSendResult> {
  const out: PushSendResult = { totalTokens: 0, delivered: 0, failed: 0, errors: [] };
  const devices = await PushDevice.find({ userId: { $in: ids }, enabled: true }).lean();
  if (!devices.length) return out;

  const expoTokens: { token: string; deviceId: any; userId: string }[] = [];
  for (const d of devices as any[]) {
    const t = String(d.token || '').trim();
    if (!t || !isLikelyExpoToken(t)) continue;
    if (allowedByUser.get(String(d.userId)) === false) continue;
    expoTokens.push({ token: t, deviceId: d._id, userId: String(d.userId) });
  }
  out.totalTokens = expoTokens.length;
  if (!expoTokens.length) return out;

  const messages = expoTokens.map((t) => ({
    to: t.token,
    title: msg.title,
    body: msg.body,
    sound: msg.sound === null ? null : 'default',
    priority: msg.priority || 'high',
    channelId: msg.channelId || 'default',
    data: {
      ...(msg.data || {}),
      url: msg.url || (msg.data as any)?.url || '',
      category: msg.category || (msg.data as any)?.category || '',
    },
    badge: typeof msg.badge === 'number' ? msg.badge : undefined,
    ttl: typeof msg.ttl === 'number' ? msg.ttl : undefined,
  }));

  for (const batch of chunk(messages, 90)) {
    const result = await postExpoBatch(batch);
    if (!result.ok) {
      out.failed += batch.length;
      out.errors.push(String(result.error || 'unknown'));
      continue;
    }
    const tickets = Array.isArray(result.data?.data) ? result.data.data : [];
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const ref = expoTokens[i];
      if (!ticket || ticket.status === 'ok') {
        out.delivered += 1;
        continue;
      }
      out.failed += 1;
      const detail = String(ticket.message || ticket.details?.error || 'expo_error');
      out.errors.push(detail);
      if (
        detail.includes('DeviceNotRegistered') ||
        ticket.details?.error === 'DeviceNotRegistered' ||
        detail.includes('InvalidCredentials')
      ) {
        try {
          await PushDevice.updateOne(
            { _id: ref?.deviceId },
            { $set: { enabled: false }, $inc: { failureCount: 1 } },
          );
        } catch {
          /* no-op */
        }
      } else if (ref?.deviceId) {
        try {
          await PushDevice.updateOne({ _id: ref.deviceId }, { $inc: { failureCount: 1 } });
        } catch {
          /* no-op */
        }
      }
    }
  }
  return out;
}

async function sendWebPushBatch(
  ids: mongoose.Types.ObjectId[],
  msg: PushMessageInput,
  allowedByUser: Map<string, boolean>,
): Promise<PushSendResult> {
  const out: PushSendResult = { totalTokens: 0, delivered: 0, failed: 0, errors: [] };
  if (!ensureVapidConfigured()) return out;

  const subs = await WebPushSubscription.find({ userId: { $in: ids }, enabled: true }).lean();
  if (!subs.length) return out;

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    url: msg.url || (msg.data as any)?.url || '/',
    category: msg.category || '',
    badge: typeof msg.badge === 'number' ? msg.badge : undefined,
    data: msg.data || {},
  });

  const ttl = typeof msg.ttl === 'number' ? msg.ttl : 60 * 60 * 24; // 24h default
  const urgency = msg.priority === 'high' ? 'high' : 'normal';

  const targets: { sub: WebPushSubscriptionPayload; subId: any }[] = [];
  for (const s of subs as any[]) {
    if (allowedByUser.get(String(s.userId)) === false) continue;
    targets.push({
      sub: {
        endpoint: String(s.endpoint),
        keys: { p256dh: String(s.p256dh), auth: String(s.auth) },
      },
      subId: s._id,
    });
  }
  out.totalTokens = targets.length;
  if (!targets.length) return out;

  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(t.sub, payload, { TTL: ttl, urgency: urgency as any });
        out.delivered += 1;
        try {
          await WebPushSubscription.updateOne(
            { _id: t.subId },
            { $set: { lastSeenAt: new Date(), failureCount: 0 } },
          );
        } catch {
          /* no-op */
        }
      } catch (e: any) {
        out.failed += 1;
        const status = Number(e?.statusCode || 0);
        out.errors.push(`web_push_${status || 'err'}:${String(e?.message || '').slice(0, 120)}`);
        if (status === 404 || status === 410) {
          // Subscription gone — disable it.
          try {
            await WebPushSubscription.updateOne({ _id: t.subId }, { $set: { enabled: false } });
          } catch {
            /* no-op */
          }
        } else {
          try {
            await WebPushSubscription.updateOne({ _id: t.subId }, { $inc: { failureCount: 1 } });
          } catch {
            /* no-op */
          }
        }
      }
    }),
  );

  return out;
}

/**
 * Send a push notification to every enabled device (Expo + Web Push) for
 * the given user(s). Silently no-ops when no transport is configured or
 * no devices are registered.
 */
export async function sendPushToUsers(
  userIds: Array<string | mongoose.Types.ObjectId>,
  msg: PushMessageInput,
): Promise<PushSendResult> {
  const out: PushSendResult = { totalTokens: 0, delivered: 0, failed: 0, errors: [] };
  const ids = (userIds || [])
    .map((u) => String(u || ''))
    .filter((s) => mongoose.Types.ObjectId.isValid(s))
    .map((s) => new mongoose.Types.ObjectId(s));
  if (!ids.length) return out;

  const allowedByUser = await buildUserOptInMap(ids, msg);

  const [expoResult, webResult] = await Promise.all([
    sendExpoBatch(ids, msg, allowedByUser),
    sendWebPushBatch(ids, msg, allowedByUser),
  ]);

  out.totalTokens = expoResult.totalTokens + webResult.totalTokens;
  out.delivered = expoResult.delivered + webResult.delivered;
  out.failed = expoResult.failed + webResult.failed;
  out.errors = [...expoResult.errors, ...webResult.errors];
  return out;
}

/**
 * Convenience wrapper that targets exactly one user.
 */
export async function sendPushToUser(
  userId: string | mongoose.Types.ObjectId,
  msg: PushMessageInput,
): Promise<PushSendResult> {
  return sendPushToUsers([userId], msg);
}

/**
 * Broadcast a push to all opted-in buyers (used for admin announcements).
 * Filters by `User.notifications.push.promotions` so we don't spam users.
 */
export async function broadcastPushToBuyers(msg: PushMessageInput, limit = 5000): Promise<PushSendResult> {
  const users = await User.find({ role: 'buyer', accountStatus: { $ne: 'banned' } })
    .select('_id')
    .limit(Math.max(1, Math.min(50000, limit)))
    .lean();
  return sendPushToUsers(
    (users as any[]).map((u) => u._id),
    msg,
  );
}

/**
 * Best-effort silent send: never throws, always returns a summary.
 */
export async function safeSendPushToUser(
  userId: string | mongoose.Types.ObjectId,
  msg: PushMessageInput,
): Promise<PushSendResult> {
  try {
    return await sendPushToUser(userId, msg);
  } catch (e) {
    return { totalTokens: 0, delivered: 0, failed: 0, errors: [String((e as any)?.message || e)] };
  }
}
