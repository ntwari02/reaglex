import mongoose from 'mongoose';
import { User } from '../models/User';
import { SystemNotification } from '../models/SystemNotification';
import { websocketService } from './websocketService';

const MAX_FANOUT_USERS = 25_000;

export type CreatedSystemInboxLean = {
  _id: mongoose.Types.ObjectId | string;
  title: string;
  message?: string;
  type?: string;
  priority?: string;
  targetAudience: string;
  targetUserId?: mongoose.Types.ObjectId | null;
  targetSellerId?: mongoose.Types.ObjectId | null;
};

/**
 * Resolve which user IDs should receive a system inbox row (for WebSocket fan-out).
 */
export async function resolveSystemInboxRecipientUserIds(doc: CreatedSystemInboxLean): Promise<string[]> {
  const aud = doc.targetAudience;

  const pickIds = async (filter: Record<string, unknown>): Promise<string[]> => {
    const rows = await User.find(filter).select('_id').limit(MAX_FANOUT_USERS).lean();
    return rows.map((r) => String(r._id));
  };

  if (aud === 'specific_user' && doc.targetUserId) {
    return [String(doc.targetUserId)];
  }
  if (aud === 'specific_seller' && doc.targetSellerId) {
    return [String(doc.targetSellerId)];
  }
  if (aud === 'all_buyers') {
    return pickIds({ role: 'buyer' });
  }
  if (aud === 'all_sellers') {
    return pickIds({ role: 'seller' });
  }
  if (aud === 'all_admins') {
    return pickIds({ role: 'admin' });
  }
  if (aud === 'verified_sellers') {
    return pickIds({ role: 'seller', isSellerVerified: true });
  }
  if (aud === 'pending_sellers') {
    return pickIds({
      role: 'seller',
      $or: [{ isSellerVerified: false }, { isSellerVerified: { $exists: false } }],
    });
  }
  if (aud === 'everyone') {
    return pickIds({});
  }

  return [];
}

/**
 * Push real-time hint to connected clients so bell + panels refresh without polling only.
 */
export function emitSystemInboxRealtime(userIds: string[], doc: CreatedSystemInboxLean): void {
  if (!userIds.length) return;
  const payload = {
    notificationId: String(doc._id),
    title: doc.title,
    message: doc.message || '',
    type: doc.type || 'system_announcement',
    priority: doc.priority || 'medium',
    createdAt: new Date().toISOString(),
  };
  websocketService.emitSystemInboxNotification(userIds, payload);
}

export async function fanoutAfterSystemInboxCreate(doc: CreatedSystemInboxLean): Promise<void> {
  try {
    const userIds = await resolveSystemInboxRecipientUserIds(doc);
    emitSystemInboxRealtime(userIds, doc);
  } catch (e) {
    console.error('[systemInboxFanout] fanout error:', e);
  }
}

/**
 * Create a system inbox row and notify connected recipients (used by tickets, orders, admin tools).
 */
export async function createSystemInboxAndFanout(params: {
  title: string;
  message: string;
  type?: string;
  priority?: string;
  targetAudience: CreatedSystemInboxLean['targetAudience'];
  targetUserId?: mongoose.Types.ObjectId | string | null;
  targetSellerId?: mongoose.Types.ObjectId | string | null;
  createdBy: mongoose.Types.ObjectId | string;
  expiresAt?: Date | null;
}): Promise<mongoose.Document | null> {
  const doc: Record<string, unknown> = {
    title: params.title.slice(0, 240),
    message: params.message.slice(0, 8000),
    type: params.type || 'system_announcement',
    priority: params.priority || 'medium',
    targetAudience: params.targetAudience,
    createdBy: new mongoose.Types.ObjectId(String(params.createdBy)),
    readBy: [],
  };
  if (params.expiresAt) doc.expiresAt = params.expiresAt;
  const tid = params.targetUserId ? String(params.targetUserId) : '';
  const sid = params.targetSellerId ? String(params.targetSellerId) : '';
  if (params.targetAudience === 'specific_user' && tid && mongoose.Types.ObjectId.isValid(tid)) {
    doc.targetUserId = new mongoose.Types.ObjectId(tid);
  }
  if (params.targetAudience === 'specific_seller' && sid && mongoose.Types.ObjectId.isValid(sid)) {
    doc.targetSellerId = new mongoose.Types.ObjectId(sid);
  }

  const created = await SystemNotification.create(doc);
  const lean = created.toObject() as unknown as CreatedSystemInboxLean;
  await fanoutAfterSystemInboxCreate(lean);
  return created;
}
