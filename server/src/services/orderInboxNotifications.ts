import mongoose from 'mongoose';
import { createSystemInboxAndFanout } from './systemInboxFanout';

const NOTIFY_STATUSES = new Set(['packed', 'shipped', 'delivered', 'cancelled']);

const STATUS_MESSAGE: Record<string, string> = {
  packed: 'Your order has been packed and is getting ready to ship.',
  shipped: 'Your order is on the way.',
  delivered: 'Your order was delivered. Thank you for shopping with us.',
  cancelled: 'Your order status was updated to cancelled. Contact support if you need help.',
};

/**
 * When order status changes, add a buyer-specific system inbox row + real-time fan-out.
 */
export async function notifyBuyerOrderStatusChange(params: {
  buyerId: mongoose.Types.ObjectId | string;
  orderNumber: string;
  newStatus: string;
  previousStatus?: string | null;
  actorUserId: string;
}): Promise<void> {
  const { buyerId, orderNumber, newStatus, previousStatus, actorUserId } = params;
  if (previousStatus && previousStatus === newStatus) return;
  if (!NOTIFY_STATUSES.has(newStatus)) return;
  const msg = STATUS_MESSAGE[newStatus] || `Your order status is now: ${newStatus}.`;
  await createSystemInboxAndFanout({
    title: `Order ${orderNumber}`,
    message: msg,
    type: newStatus === 'cancelled' ? 'warning' : 'success',
    priority: newStatus === 'cancelled' ? 'high' : 'medium',
    targetAudience: 'specific_user',
    targetUserId: buyerId,
    createdBy: actorUserId,
  });
}
