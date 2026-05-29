import mongoose from 'mongoose';
import { LiveSessionComment, ILiveSessionComment } from '../models/LiveSessionComment';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { User } from '../models/User';

const MAX_TEXT = 500;
const HISTORY_LIMIT = 80;

export type LiveChatMessagePayload = {
  id: string;
  sessionId: string;
  userId?: string;
  displayName: string;
  text: string;
  isSellerReply: boolean;
  isHost?: boolean;
  replyToId?: string;
  replyToName?: string;
  at: number;
};

function serializeComment(
  doc: ILiveSessionComment | Record<string, unknown>,
  replyMap?: Map<string, string>
): LiveChatMessagePayload {
  const d = doc as ILiveSessionComment;
  const replyId = d.replyToId ? String(d.replyToId) : undefined;
  return {
    id: String(d._id),
    sessionId: String(d.sessionId),
    userId: d.userId ? String(d.userId) : undefined,
    displayName: d.displayName,
    text: d.text,
    isSellerReply: Boolean(d.isSellerReply),
    isHost: Boolean((d as { isHost?: boolean }).isHost),
    replyToId: replyId,
    replyToName: replyId && replyMap ? replyMap.get(replyId) : undefined,
    at: new Date(d.createdAt).getTime(),
  };
}

export async function getLiveChatHistory(sessionId: string): Promise<LiveChatMessagePayload[]> {
  const session = await LiveCommerceSession.findById(sessionId).select('sellerId').lean();
  const sellerId = session ? String(session.sellerId) : '';

  const rows = await LiveSessionComment.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  const reversed = rows.reverse();
  const replyMap = new Map<string, string>();
  reversed.forEach((r) => replyMap.set(String(r._id), r.displayName));
  return reversed.map((r) => {
    const msg = serializeComment(r, replyMap);
    if (sellerId && r.userId && String(r.userId) === sellerId) msg.isHost = true;
    return msg;
  });
}

export async function postLiveChatMessage(input: {
  sessionId: string;
  userId?: string;
  guestId?: string;
  displayName: string;
  text: string;
  isSellerReply?: boolean;
  replyToId?: string;
}): Promise<LiveChatMessagePayload | null> {
  const text = String(input.text || '').trim().slice(0, MAX_TEXT);
  if (!text || !mongoose.Types.ObjectId.isValid(input.sessionId)) return null;

  const session = await LiveCommerceSession.findById(input.sessionId).lean();
  if (!session || session.status !== 'live') return null;
  const { isSystemFeatureEnabled } = await import('./systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('live_commerce_chat'))) return null;
  if (session.features?.chat === false) return null;

  let replyToId: mongoose.Types.ObjectId | undefined;
  let replyToName: string | undefined;
  if (input.replyToId && mongoose.Types.ObjectId.isValid(input.replyToId)) {
    const parent = await LiveSessionComment.findById(input.replyToId).lean();
    if (parent && String(parent.sessionId) === input.sessionId) {
      replyToId = parent._id as mongoose.Types.ObjectId;
      replyToName = parent.displayName;
    }
  }

  const isHost = Boolean(
    input.userId && String(input.userId) === String(session.sellerId)
  );

  const doc = await LiveSessionComment.create({
    sessionId: new mongoose.Types.ObjectId(input.sessionId),
    userId: input.userId ? new mongoose.Types.ObjectId(input.userId) : undefined,
    guestId: input.guestId,
    displayName: String(input.displayName || 'Guest').slice(0, 64),
    text,
    isSellerReply: Boolean(input.isSellerReply) || (isHost && Boolean(replyToId)),
    replyToId,
  });

  const payload = serializeComment(doc.toObject());
  payload.isHost = isHost;
  if (replyToName) payload.replyToName = replyToName;

  const offsetMs = session.startedAt
    ? Math.max(0, Date.now() - new Date(session.startedAt).getTime())
    : 0;
  await LiveCommerceSession.updateOne(
    { _id: session._id },
    {
      $push: {
        timeline: {
          offsetMs,
          type: 'comment',
          payload: { commentId: payload.id, displayName: payload.displayName, text: payload.text },
          createdAt: new Date(),
        },
      },
    }
  );

  return payload;
}

export async function resolveDisplayName(userId?: string, fallback = 'Guest'): Promise<string> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return fallback;
  const u = await User.findById(userId).select('fullName email').lean();
  return (u as { fullName?: string })?.fullName || (u as { email?: string })?.email?.split('@')[0] || fallback;
}
