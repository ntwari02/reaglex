import {
  buyerEventFromOrderStatus,
  type BuyerNotificationEvent,
} from './buyerNotificationAssistant.service';
import { deliverBuyerNotification } from './buyerNotificationService';

const NOTIFY_STATUSES = new Set(['packed', 'shipped', 'delivered', 'cancelled']);

/**
 * Order status change → buyer in-app + push + email (respecting preferences).
 */
export async function notifyBuyerOrderStatusChange(params: {
  buyerId: unknown;
  orderId?: string;
  orderNumber: string;
  newStatus: string;
  previousStatus?: string | null;
  actorUserId: string;
}): Promise<void> {
  const { buyerId, orderId, orderNumber, newStatus, previousStatus, actorUserId } = params;
  if (previousStatus && previousStatus === newStatus) return;
  if (!NOTIFY_STATUSES.has(newStatus)) return;

  const event = buyerEventFromOrderStatus(newStatus) as BuyerNotificationEvent | null;
  if (!event) return;

  await deliverBuyerNotification(
    event,
    {
      buyerId: String(buyerId),
      orderId,
      orderNumber,
      status: newStatus,
    },
    actorUserId
  );
}
