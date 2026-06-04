import mongoose from 'mongoose';
import { User } from '../models/User';
import { Order } from '../models/Order';
import type { IOrder } from '../models/Order';
import { deliverBuyerNotification } from './buyerNotificationService';
import { deliverSellerNotification } from './sellerNotificationService';
import { buyerEventFromOrderStatus } from './buyerNotificationAssistant.service';
import type { BuyerNotificationEvent } from './buyerNotificationAssistant.service';
import {
  buildOrderStatusEmailInput,
  generateOrderStatusEmail,
  generateSellerPayoutEmail,
  resolveEmailOrderStatus,
} from './orderStatusEmail.service';
import { sendRichNotificationEmail, isEmailConfigured } from './emailService';
import { getClientUrl } from '../config/publicEnv';
import { buyerEventCategory, buyerEventAccent } from '../email/eventCategories';
import type { EmailCategory } from '../email/copyEngine';

function orderDeepLink(orderId: string): string {
  return `${getClientUrl()}/orders/${orderId}`;
}

function sellerOrderLink(orderId: string): string {
  return `${getClientUrl()}/seller/orders?order=${orderId}`;
}

async function sendRuleBasedEmail(params: {
  to: string;
  name: string;
  subject: string;
  body: string;
  actionUrl: string;
  category: EmailCategory;
  eventKey: string;
}): Promise<void> {
  if (!isEmailConfigured()) return;
  const firstName = params.name.split(' ')[0] || 'there';
  const paragraphs = params.body.split('\n').filter((line, i, arr) => {
    if (line === '' && i > 0 && arr[i - 1] === '') return false;
    return true;
  });
  const message = paragraphs.slice(1).join('\n').trim() || params.body;

  await sendRichNotificationEmail({
    to: params.to,
    subject: params.subject,
    name: firstName,
    category: params.category,
    headline: params.subject,
    message,
    actionUrl: params.actionUrl,
    actionLabel: 'View order',
    accent: buyerEventAccent(params.eventKey as BuyerNotificationEvent),
    preheader: message.slice(0, 120),
    metaRows: [],
  });
}

function mapBuyerEvent(status: string, emailStatus: ReturnType<typeof resolveEmailOrderStatus>): BuyerNotificationEvent | null {
  if (emailStatus === 'REFUNDED') return 'refund_initiated';
  if (emailStatus === 'COMPLETED') return 'delivery_confirmed';
  const base = buyerEventFromOrderStatus(status);
  if (base) return base;
  if (status === 'completed') return 'delivery_confirmed';
  return null;
}

/**
 * Unified buyer + seller notifications for order lifecycle (in-app, push, rule-based email).
 */
export async function notifyOrderLifecycle(params: {
  order: IOrder & { sellerId?: { fullName?: string; email?: string } };
  actorUserId: string;
  /** Force email template phase (e.g. after escrow release) */
  forceEmailStatus?: ReturnType<typeof resolveEmailOrderStatus>;
  notifySellerPayout?: boolean;
}): Promise<void> {
  const { order, actorUserId, forceEmailStatus, notifySellerPayout } = params;
  const orderId = String(order._id);
  const buyerId = String(order.buyerId);

  const [buyer, seller] = await Promise.all([
    User.findById(buyerId).select('email fullName').lean(),
    order.sellerId && mongoose.Types.ObjectId.isValid(String(order.sellerId))
      ? User.findById(order.sellerId).select('email fullName').lean()
      : null,
  ]);

  const emailInput = buildOrderStatusEmailInput(
    order as Parameters<typeof buildOrderStatusEmailInput>[0],
    buyer?.fullName,
    seller?.fullName || (order.sellerId as { fullName?: string })?.fullName,
  );
  if (forceEmailStatus) emailInput.order_status = forceEmailStatus;

  const emailCopy = generateOrderStatusEmail(emailInput);
  const buyerEvent = mapBuyerEvent(order.status, emailInput.order_status);

  if (buyerEvent) {
    await deliverBuyerNotification(
      buyerEvent,
      {
        buyerId,
        orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        sellerName: emailInput.seller_name,
      },
      actorUserId,
      { skipEmail: true },
    );

    if (buyer?.email) {
      void sendRuleBasedEmail({
        to: buyer.email,
        name: buyer.fullName || 'Customer',
        subject: emailCopy.subject,
        body: emailCopy.email_body,
        actionUrl: orderDeepLink(orderId),
        category: buyerEventCategory(buyerEvent),
        eventKey: buyerEvent,
      }).catch(() => {});
    }
  }

  if (notifySellerPayout && seller?.email && emailInput.payout_status === 'COMPLETED') {
    const sellerCopy = generateSellerPayoutEmail(emailInput);
    await deliverSellerNotification(
      'funds_released',
      {
        sellerId: String(order.sellerId),
        orderId,
        orderNumber: order.orderNumber,
        amount: order.fees?.sellerAmount,
        currency: order.payment?.currency || order.currencySnapshot?.currency || 'USD',
      },
      actorUserId,
    );
    void sendRuleBasedEmail({
      to: seller.email,
      name: seller.fullName || 'Seller',
      subject: sellerCopy.subject,
      body: sellerCopy.email_body,
      actionUrl: sellerOrderLink(orderId),
      category: 'payment',
      eventKey: 'funds_released',
    }).catch(() => {});
  }
}

export async function notifyBuyerOrderStatusChangeEnhanced(params: {
  buyerId: unknown;
  orderId?: string;
  orderNumber: string;
  newStatus: string;
  previousStatus?: string | null;
  actorUserId: string;
}): Promise<void> {
  const { buyerId, orderId, orderNumber, newStatus, previousStatus, actorUserId } = params;
  if (previousStatus && previousStatus === newStatus) return;

  const notifyStatuses = new Set(['packed', 'shipped', 'delivered', 'completed', 'cancelled']);
  if (!notifyStatuses.has(newStatus)) return;

  if (!orderId) {
    const event = buyerEventFromOrderStatus(newStatus);
    if (!event) return;
    await deliverBuyerNotification(
      event,
      { buyerId: String(buyerId), orderNumber, status: newStatus },
      actorUserId,
    );
    return;
  }

  const order = await Order.findById(orderId).populate('sellerId', 'fullName email').lean();
  if (!order) return;

  await notifyOrderLifecycle({
    order: order as IOrder & { sellerId?: { fullName?: string; email?: string } },
    actorUserId,
    notifySellerPayout: newStatus === 'completed' || String(order.escrow?.status) === 'RELEASED',
  });
}
