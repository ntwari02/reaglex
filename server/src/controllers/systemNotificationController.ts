import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SystemNotification } from '../models/SystemNotification';
import { User } from '../models/User';
import mongoose from 'mongoose';

const getCurrentUserOid = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

/**
 * Which system inbox rows apply to this user (sellers, buyers, admins — plus `everyone`).
 */
async function buildAudienceOrConditions(
  userId: mongoose.Types.ObjectId,
  role: string,
): Promise<Record<string, unknown>[]> {
  const or: Record<string, unknown>[] = [];

  if (role === 'seller') {
    const seller = await User.findById(userId).select('isSellerVerified sellerVerificationStatus').lean();
    const isVerified = seller?.isSellerVerified || false;
    or.push({ targetAudience: 'everyone' });
    or.push({ targetAudience: 'all_sellers' });
    or.push({ targetAudience: 'specific_seller', targetSellerId: userId });
    or.push({ targetAudience: 'specific_user', targetUserId: userId });
    if (isVerified) or.push({ targetAudience: 'verified_sellers' });
    else or.push({ targetAudience: 'pending_sellers' });
  } else if (role === 'buyer') {
    or.push({ targetAudience: 'everyone' });
    or.push({ targetAudience: 'all_buyers' });
    or.push({ targetAudience: 'specific_user', targetUserId: userId });
  } else if (role === 'admin') {
    or.push({ targetAudience: 'everyone' });
    or.push({ targetAudience: 'all_admins' });
    or.push({ targetAudience: 'specific_user', targetUserId: userId });
  } else {
    or.push({ targetAudience: 'everyone' });
  }

  return or;
}

function expiryOkFilter(): Record<string, unknown> {
  return {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  };
}

/**
 * Get notifications for the authenticated user (seller, buyer, or admin).
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getCurrentUserOid(req);
    if (!userId || !req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { unreadOnly = false, limit = 50 } = req.query;
    const role = String(req.user.role);

    const audienceOr = await buildAudienceOrConditions(userId, role);

    const filter: Record<string, unknown> = {
      $and: [{ $or: audienceOr }, expiryOkFilter()],
    };

    if (unreadOnly === 'true') {
      (filter.$and as Record<string, unknown>[]).push({
        readBy: { $ne: userId },
      });
    }

    const notifications = await SystemNotification.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const unreadIds = notifications
      .filter((n) => !n.readBy?.some((id) => id.toString() === userId.toString()))
      .map((n) => n._id);

    if (unreadIds.length > 0) {
      await SystemNotification.updateMany({ _id: { $in: unreadIds } }, { $addToSet: { readBy: userId } });
    }

    return res.json({ notifications });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getCurrentUserOid(req);
    if (!userId || !req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const role = String(req.user.role);
    const audienceOr = await buildAudienceOrConditions(userId, role);
    const allowed = await SystemNotification.findOne({
      _id: notificationId,
      $and: [{ $or: audienceOr }, expiryOkFilter()],
    }).lean();

    if (!allowed) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await SystemNotification.updateOne({ _id: notificationId }, { $addToSet: { readBy: userId } });

    return res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
}

export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getCurrentUserOid(req);
    if (!userId || !req.user?.role) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const role = String(req.user.role);
    const audienceOr = await buildAudienceOrConditions(userId, role);

    const filter: Record<string, unknown> = {
      $and: [{ $or: audienceOr }, expiryOkFilter(), { readBy: { $ne: userId } }],
    };

    const count = await SystemNotification.countDocuments(filter);

    return res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ message: 'Failed to get unread count' });
  }
}

/**
 * Admin: create an in-app system notification row (no email blast — use Marketing Center for that).
 */
export async function adminCreateSystemInboxBroadcast(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const body = req.body as Record<string, unknown>;
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    const allowedAudiences = [
      'all_sellers',
      'verified_sellers',
      'pending_sellers',
      'specific_seller',
      'all_buyers',
      'all_admins',
      'everyone',
      'specific_user',
    ] as const;

    const targetAudience = String(body.targetAudience || 'everyone');
    if (!allowedAudiences.includes(targetAudience as (typeof allowedAudiences)[number])) {
      return res.status(400).json({ message: 'Invalid targetAudience' });
    }

    const type = (body.type as string) || 'system_announcement';
    const priority = (body.priority as string) || 'medium';

    const doc: Record<string, unknown> = {
      title: title.slice(0, 240),
      message: message.slice(0, 8000),
      type,
      priority,
      targetAudience,
      createdBy: new mongoose.Types.ObjectId(req.user.id),
      readBy: [],
    };

    if (body.expiresAt) {
      doc.expiresAt = new Date(String(body.expiresAt));
    }

    const tid = body.targetUserId ? String(body.targetUserId) : '';
    if (targetAudience === 'specific_user' && tid && mongoose.Types.ObjectId.isValid(tid)) {
      doc.targetUserId = new mongoose.Types.ObjectId(tid);
    }
    if (targetAudience === 'specific_seller' && tid && mongoose.Types.ObjectId.isValid(tid)) {
      doc.targetSellerId = new mongoose.Types.ObjectId(tid);
    }

    const created = await SystemNotification.create(doc);
    return res.status(201).json({ ok: true, id: String(created._id) });
  } catch (error: any) {
    console.error('adminCreateSystemInboxBroadcast error:', error);
    return res.status(500).json({ message: error?.message || 'Failed to create notification' });
  }
}
