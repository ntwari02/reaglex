import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { SellerSettings } from '../models/SellerSettings';
import { SystemNotification } from '../models/SystemNotification';
import { User } from '../models/User';
import {
  generateSellerNotificationCopy,
  type SellerNotificationContext,
  type SellerNotificationEvent,
} from './sellerNotificationAssistant.service';
import { createSystemInboxAndFanout } from './systemInboxFanout';
import { safeSendPushToUser } from './pushNotificationService';
import { sendNotificationEmail, isEmailConfigured } from './emailService';
import { pickVisualVariant } from '../utils/notificationVisual';

type PreferenceKey = 'newOrders' | 'newDisputes' | 'paymentReceived' | 'lowStock' | 'newMessages' | 'newReviews';

const EVENT_PREF: Partial<Record<SellerNotificationEvent, PreferenceKey>> = {
  new_order: 'newOrders',
  dispute_opened: 'newDisputes',
  return_opened: 'newDisputes',
  payout_received: 'paymentReceived',
  funds_released: 'paymentReceived',
  low_stock: 'lowStock',
  new_message: 'newMessages',
  new_review: 'newReviews',
};

const shippingScanCache = new Map<string, number>();
const SHIPPING_SCAN_COOLDOWN_MS = 60 * 60 * 1000;

async function sellerPrefs(sellerId: string) {
  const row = await SellerSettings.findOne({ sellerId }).select('notificationPreferences').lean();
  return row?.notificationPreferences;
}

async function sellerChannels(
  sellerId: string,
  event: SellerNotificationEvent
): Promise<{ inapp: boolean; push: boolean; email: boolean }> {
  const key = EVENT_PREF[event];
  const prefs = await sellerPrefs(sellerId);
  if (!key || !prefs) return { inapp: true, push: true, email: true };

  const pushEnabled = prefs.push?.enabled !== false;
  const pushEvent =
    key === 'newOrders'
      ? prefs.push?.newOrders !== false
      : key === 'newDisputes'
        ? prefs.push?.newDisputes !== false
        : key === 'newMessages'
          ? prefs.push?.newMessages !== false
          : key === 'newReviews'
            ? prefs.push?.newReviews !== false
            : key === 'lowStock'
              ? prefs.push?.lowStock !== false
              : pushEnabled;

  const emailEvent = prefs.email?.[key] !== false;

  return {
    inapp: true,
    push: pushEnabled && pushEvent,
    email: emailEvent,
  };
}

async function countRecentReminders(
  sellerId: string,
  eventKey: string,
  entityId?: string
): Promise<number> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const filter: Record<string, unknown> = {
    targetAudience: 'specific_seller',
    targetSellerId: new mongoose.Types.ObjectId(sellerId),
    'metadata.eventKey': eventKey,
    createdAt: { $gte: since },
  };
  if (entityId) filter['metadata.entityId'] = entityId;
  return SystemNotification.countDocuments(filter);
}

async function orderProductThumbnails(orderId: string): Promise<string[]> {
  const order = await Order.findById(orderId).select('items').lean();
  if (!order?.items?.length) return [];
  const ids = order.items.map((it: { productId?: unknown }) => it.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } })
    .select('image images')
    .limit(3)
    .lean();
  return products
    .map((p) => String(p.image || (Array.isArray(p.images) ? p.images[0] : '') || ''))
    .filter(Boolean);
}

export async function deliverSellerNotification(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
  createdBy?: string
): Promise<void> {
  if (!ctx.sellerId || !mongoose.Types.ObjectId.isValid(ctx.sellerId)) return;

  const channels = await sellerChannels(ctx.sellerId, event);
  if (!channels.inapp && !channels.push && !channels.email) return;

  const entityId = ctx.orderId || ctx.caseNumber || ctx.disputeNumber || '';
  const reminderCount = await countRecentReminders(ctx.sellerId, event, entityId || undefined);
  const enriched: SellerNotificationContext = {
    ...ctx,
    reminderCount,
    productImages: ctx.productImages?.length
      ? ctx.productImages
      : ctx.orderId
        ? await orderProductThumbnails(ctx.orderId)
        : [],
  };

  const copy = generateSellerNotificationCopy(event, enriched);
  const visualSeed = `${ctx.sellerId}:${event}:${entityId || copy.title}:${Date.now()}`;
  const visualVariant = pickVisualVariant(visualSeed);
  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const creator = createdBy && mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : admin?._id || ctx.sellerId;

  if (channels.inapp) {
    await createSystemInboxAndFanout({
      title: copy.title,
      message: copy.message,
      type: copy.inboxType,
      priority: copy.priority,
      targetAudience: 'specific_seller',
      targetSellerId: ctx.sellerId,
      createdBy: creator,
      actionUrl: copy.deepLink,
      actionText: copy.actionLabel,
      actionRequired: copy.priority === 'high',
      metadata: {
        category: event,
        tone: copy.tone,
        eventKey: event,
        entityId: entityId || undefined,
        productThumbnails: enriched.productImages?.slice(0, 3),
        visualStyle: copy.visualStyle,
        visualVariant,
      },
    });
  }

  if (channels.push) {
    void safeSendPushToUser(ctx.sellerId, {
      title: copy.title,
      body: copy.message,
      url: copy.deepLink,
      category: event === 'new_message' ? 'message' : 'order',
      data: { event, entityId },
      priority: copy.priority === 'high' ? 'high' : 'default',
    });
  }

  if (channels.email && isEmailConfigured()) {
    const seller = await User.findById(ctx.sellerId).select('email').lean();
    if (seller?.email) {
      void sendNotificationEmail({
        to: seller.email,
        subject: copy.title,
        body: `${copy.message}\n\n${copy.actionLabel}: ${copy.deepLink}`,
      }).catch(() => {});
    }
  }
}

/** Scan unshipped orders and nudge seller with calm, varied copy. */
export async function checkSellerShippingReminders(sellerId: string): Promise<void> {
  const last = shippingScanCache.get(sellerId) || 0;
  if (Date.now() - last < SHIPPING_SCAN_COOLDOWN_MS) return;
  shippingScanCache.set(sellerId, Date.now());

  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const stale = await Order.find({
    sellerId,
    status: { $in: ['processing', 'packed', 'confirmed'] },
    updatedAt: { $lt: cutoff },
  })
    .select('_id orderNumber updatedAt')
    .sort({ updatedAt: 1 })
    .limit(5)
    .lean();

  if (!stale.length) return;

  const primary = stale[0];
  const hoursSinceUpdate = Math.max(
    1,
    Math.round((Date.now() - new Date(primary.updatedAt || Date.now()).getTime()) / (60 * 60 * 1000))
  );

  await deliverSellerNotification(
    stale.length > 1 ? 'shipping_delay' : 'shipping_soon',
    {
      sellerId,
      orderId: String(primary._id),
      orderNumber: String(primary.orderNumber || ''),
      affectedCount: stale.length,
      hoursSinceUpdate,
    },
    sellerId
  );
}

export async function deliverSellerNotificationFromLegacy(
  type: string,
  sellerId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const p = payload || {};
  const orderId = p.orderId ? String(p.orderId) : undefined;
  const orderNumber = p.orderNumber ? String(p.orderNumber) : undefined;

  const map: Record<string, SellerNotificationEvent> = {
    NEW_ORDER_PAID: 'new_order',
    FUNDS_RELEASED: 'funds_released',
    PAYOUT_CONFIRMED: 'payout_received',
    ORDER_REFUNDED: 'order_refunded',
    AUTO_RELEASE_FUNDS: 'funds_released',
  };

  const event = map[type];
  if (!event) return;

  await deliverSellerNotification(
    event,
    {
      sellerId,
      orderId,
      orderNumber,
      amount: p.amount != null ? Number(p.amount) : undefined,
      currency: p.currency ? String(p.currency) : undefined,
    },
    p.createdBy ? String(p.createdBy) : sellerId
  );
}
