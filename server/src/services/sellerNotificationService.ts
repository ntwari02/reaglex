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
import { sendRichNotificationEmail, isEmailConfigured } from './emailService';
import { enhanceTransactionalEmailCopy } from '../email/emailCopyAi.service';
import { sellerEventCategory, sellerEventAccent } from '../email/eventCategories';
import { getClientUrl } from '../config/publicEnv';
import { pickVisualVariant } from '../utils/notificationVisual';
import { prepareInAppNotificationPayload } from '../utils/notificationDisplay';
import { normalizeMediaUrls } from '../email/emailUrls';

type PreferenceKey = 'newOrders' | 'newDisputes' | 'paymentReceived' | 'lowStock' | 'newMessages' | 'newReviews';

const EVENT_PREF: Partial<Record<SellerNotificationEvent, PreferenceKey>> = {
  new_order: 'newOrders',
  dispute_opened: 'newDisputes',
  return_opened: 'newDisputes',
  payout_received: 'paymentReceived',
  funds_released: 'paymentReceived',
  order_cancelled: 'newOrders',
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
  const ids = order.items
    .map((it: { productId?: unknown }) => it.productId)
    .filter((id): id is mongoose.Types.ObjectId | string => Boolean(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
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
  const rawThumbs = ctx.productImages?.length
    ? ctx.productImages
    : ctx.orderId
      ? await orderProductThumbnails(ctx.orderId)
      : [];
  const productImages = normalizeMediaUrls(rawThumbs);

  const enriched: SellerNotificationContext = {
    ...ctx,
    reminderCount,
    productImages,
  };

  const copy = await generateSellerNotificationCopy(event, enriched);
  const visualSeed = `${ctx.sellerId}:${event}:${entityId || copy.title}:${Date.now()}`;
  const visualVariant = pickVisualVariant(visualSeed);
  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const creator = createdBy && mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : admin?._id || ctx.sellerId;

  if (channels.inapp) {
    const inApp = prepareInAppNotificationPayload({
      title: copy.title,
      message: copy.message,
      actionUrl: copy.deepLink,
      actionLabel: copy.actionLabel,
      tone: copy.tone,
      priority: copy.priority,
      category: event,
      eventKey: event,
      entityId: entityId || undefined,
      productThumbnails: productImages,
      visualStyle: copy.visualStyle,
      visualVariant,
      copySource: copy.source,
    });
    await createSystemInboxAndFanout({
      title: inApp.title,
      message: inApp.message,
      type: copy.inboxType,
      priority: inApp.priority,
      targetAudience: 'specific_seller',
      targetSellerId: ctx.sellerId,
      createdBy: creator,
      actionUrl: inApp.actionUrl,
      actionText: inApp.actionText,
      actionRequired: copy.priority === 'high',
      metadata: inApp.metadata,
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
    const seller = await User.findById(ctx.sellerId).select('email fullName').lean();
    if (seller?.email) {
      const actionUrl = copy.deepLink.startsWith('http')
        ? copy.deepLink
        : `${getClientUrl()}${copy.deepLink.startsWith('/') ? copy.deepLink : `/${copy.deepLink}`}`;
      const firstName = String((seller as { fullName?: string }).fullName || 'there').split(' ')[0];
      const category = sellerEventCategory(event);
      void (async () => {
        let message = copy.message;
        let actionLabel = copy.actionLabel;
        if (copy.source !== 'gemini') {
          const enhanced = await enhanceTransactionalEmailCopy({
            userId: ctx.sellerId,
            firstName,
            category,
            eventKey: event,
            headline: copy.title,
            message: copy.message,
            actionLabel: copy.actionLabel,
          });
          message = enhanced.message;
          actionLabel = enhanced.actionLabel;
        }
        await sendRichNotificationEmail({
          to: seller.email,
          subject: copy.title,
          name: firstName,
          category,
          headline: copy.title,
          message,
          actionUrl,
          actionLabel,
          accent: sellerEventAccent(event),
          preheader: message.slice(0, 120),
        });
      })().catch(() => {});
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
    sellerId: new mongoose.Types.ObjectId(sellerId),
    status: { $in: ['processing', 'packed', 'confirmed'] as string[] },
    updatedAt: { $lt: cutoff },
  } as Record<string, unknown>)
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
