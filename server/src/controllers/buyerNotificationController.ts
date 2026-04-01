import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { MessageThread } from '../models/MessageThread';
import { SystemNotification } from '../models/SystemNotification';

type BuyerNotificationType = 'order' | 'message' | 'system';

interface BuyerNotificationItem {
  id: string;
  type: BuyerNotificationType;
  title: string;
  message: string;
  time: string;
  createdAt: string;
  unread: boolean;
  orderId?: string;
  threadId?: string;
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Order placed',
  processing: 'Order is being processed',
  packed: 'Order packed',
  shipped: 'Order shipped',
  delivered: 'Order delivered',
  cancelled: 'Order cancelled',
};

function getBuyerId(req: AuthenticatedRequest): mongoose.Types.ObjectId | null {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
}

function formatRelativeTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

async function buildBuyerNotifications(
  buyerId: mongoose.Types.ObjectId,
  limit: number,
): Promise<BuyerNotificationItem[]> {
  const [orders, threads] = await Promise.all([
    Order.find({ buyerId } as any)
      .select('_id orderNumber status total updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean(),
    MessageThread.find({ buyerId } as any)
      .populate('sellerId', 'fullName storeName')
      .select('_id sellerId subject lastMessageAt lastMessagePreview buyerUnreadCount createdAt updatedAt')
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const orderItems: BuyerNotificationItem[] = orders.map((o: any) => {
    const status = String(o.status || 'pending');
    const createdAt = o.updatedAt || o.createdAt || new Date();
    const orderNumber = o.orderNumber || String(o._id);
    const unread =
      ['pending', 'processing', 'packed', 'shipped'].includes(status) &&
      Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;

    return {
      id: `order:${o._id}`,
      type: 'order',
      title: `Order ${orderNumber}`,
      message: ORDER_STATUS_LABEL[status] || `Order status updated: ${status}`,
      time: formatRelativeTime(createdAt),
      createdAt: new Date(createdAt).toISOString(),
      unread,
      orderId: String(orderNumber),
    };
  });

  const messageItems: BuyerNotificationItem[] = threads.map((t: any) => {
    const sellerName =
      t?.sellerId?.storeName ||
      t?.sellerId?.fullName ||
      'Seller';
    const createdAt = t.lastMessageAt || t.updatedAt || t.createdAt || new Date();
    const preview = String(t.lastMessagePreview || '').trim();

    return {
      id: `thread:${t._id}`,
      type: 'message',
      title: `New message from ${sellerName}`,
      message: preview || 'You have a new message in your inbox.',
      time: formatRelativeTime(createdAt),
      createdAt: new Date(createdAt).toISOString(),
      unread: Number(t.buyerUnreadCount || 0) > 0,
      threadId: String(t._id),
    };
  });

  const sysFilter: Record<string, unknown> = {
    $and: [
      {
        $or: [
          { targetAudience: 'everyone' },
          { targetAudience: 'all_buyers' },
          { targetAudience: 'specific_user', targetUserId: buyerId },
        ],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
      },
    ],
  };

  const sysRows = await SystemNotification.find(sysFilter).sort({ createdAt: -1 }).limit(limit).lean();

  const systemItems: BuyerNotificationItem[] = sysRows.map((n: any) => {
    const createdAt = n.createdAt || new Date();
    const unread = !n.readBy?.some((id: mongoose.Types.ObjectId) => id.toString() === buyerId.toString());
    return {
      id: `system:${n._id}`,
      type: 'system',
      title: String(n.title || 'Announcement'),
      message: String(n.message || ''),
      time: formatRelativeTime(createdAt),
      createdAt: new Date(createdAt).toISOString(),
      unread,
      orderId: undefined,
      threadId: undefined,
    };
  });

  return [...orderItems, ...messageItems, ...systemItems]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

export async function getBuyerNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });

    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
    const notifications = await buildBuyerNotifications(buyerId, limit);
    return res.json({ notifications });
  } catch (error: any) {
    console.error('getBuyerNotifications error:', error);
    return res.status(500).json({ message: 'Failed to fetch buyer notifications' });
  }
}

export async function getBuyerUnreadNotificationCount(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });

    const notifications = await buildBuyerNotifications(buyerId, 100);
    const count = notifications.filter((n) => n.unread).length;
    return res.json({ count });
  } catch (error: any) {
    console.error('getBuyerUnreadNotificationCount error:', error);
    return res.status(500).json({ message: 'Failed to fetch unread notification count' });
  }
}
