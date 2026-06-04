import mongoose from 'mongoose';
import { User } from '../models/User';
import {
  generateBuyerNotificationCopy,
  type BuyerNotificationContext,
  type BuyerNotificationEvent,
} from './buyerNotificationAssistant.service';
import { createSystemInboxAndFanout } from './systemInboxFanout';
import { safeSendPushToUser } from './pushNotificationService';
import { sendRichNotificationEmail, isEmailConfigured } from './emailService';
import { buyerEventCategory, buyerEventAccent } from '../email/eventCategories';
import { enhanceTransactionalEmailCopy } from '../email/emailCopyAi.service';
import { getClientUrl } from '../config/publicEnv';
import { pickVisualVariant } from '../utils/notificationVisual';
import { prepareInAppNotificationPayload } from '../utils/notificationDisplay';
import { normalizeMediaUrls } from '../email/emailUrls';

type EmailPref = 'orderUpdates' | 'promotions' | 'securityAlerts';
type PushPref = 'orderUpdates' | 'messages' | 'promotions';

const EVENT_EMAIL: Partial<Record<BuyerNotificationEvent, EmailPref>> = {
  order_placed: 'orderUpdates',
  order_packed: 'orderUpdates',
  order_shipped: 'orderUpdates',
  order_delivered: 'orderUpdates',
  order_cancelled: 'orderUpdates',
  refund_initiated: 'orderUpdates',
  delivery_confirmed: 'orderUpdates',
  return_submitted: 'orderUpdates',
  return_update: 'orderUpdates',
  dispute_update: 'orderUpdates',
  payment_notice: 'orderUpdates',
  live_now: 'promotions',
};

const EVENT_PUSH: Partial<Record<BuyerNotificationEvent, PushPref>> = {
  new_message: 'messages',
  live_now: 'promotions',
};

async function buyerChannels(
  buyerId: string,
  event: BuyerNotificationEvent
): Promise<{ inapp: boolean; push: boolean; email: boolean }> {
  const user = await User.findById(buyerId).select('email notifications').lean();
  if (!user) return { inapp: false, push: false, email: false };

  const n = (user as { notifications?: Record<string, Record<string, boolean>> }).notifications;
  const emailKey = EVENT_EMAIL[event] || 'orderUpdates';
  const pushKey = EVENT_PUSH[event] || 'orderUpdates';

  const emailOn = n?.email?.[emailKey] !== false;
  const pushOn =
    pushKey === 'messages'
      ? n?.push?.messages !== false
      : pushKey === 'promotions'
        ? n?.push?.promotions !== false
        : n?.push?.orderUpdates !== false;

  return { inapp: true, push: pushOn, email: emailOn && Boolean(user.email) };
}

export async function deliverBuyerNotification(
  event: BuyerNotificationEvent,
  ctx: BuyerNotificationContext,
  createdBy?: string,
  options?: { skipEmail?: boolean },
): Promise<void> {
  if (!ctx.buyerId || !mongoose.Types.ObjectId.isValid(ctx.buyerId)) return;

  const channels = await buyerChannels(ctx.buyerId, event);
  if (!channels.inapp && !channels.push && !channels.email) return;

  const productImages = normalizeMediaUrls(ctx.productImages);
  const enrichedCtx = { ...ctx, productImages };
  const copy = generateBuyerNotificationCopy(event, enrichedCtx);
  const entityId = ctx.orderId || ctx.caseNumber || ctx.liveSessionId || '';
  const visualVariant = pickVisualVariant(`${ctx.buyerId}:${event}:${entityId || copy.title}:${Date.now()}`);
  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const creator =
    createdBy && mongoose.Types.ObjectId.isValid(createdBy)
      ? createdBy
      : admin?._id || ctx.buyerId;

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
    });
    await createSystemInboxAndFanout({
      title: inApp.title,
      message: inApp.message,
      type: copy.inboxType,
      priority: inApp.priority,
      targetAudience: 'specific_user',
      targetUserId: ctx.buyerId,
      createdBy: creator,
      actionUrl: inApp.actionUrl,
      actionText: inApp.actionText,
      metadata: inApp.metadata,
    });
  }

  if (channels.push) {
    void safeSendPushToUser(ctx.buyerId, {
      title: copy.title,
      body: copy.message,
      url: copy.deepLink,
      category: copy.pushCategory,
      data: { event, orderId: ctx.orderId },
      priority: copy.priority === 'high' ? 'high' : 'default',
    });
  }

  if (channels.email && !options?.skipEmail && isEmailConfigured()) {
    const user = await User.findById(ctx.buyerId).select('email fullName').lean();
    if (user?.email) {
      const actionUrl = copy.deepLink.startsWith('http')
        ? copy.deepLink
        : `${getClientUrl()}${copy.deepLink.startsWith('/') ? copy.deepLink : `/${copy.deepLink}`}`;
      const firstName = String((user as { fullName?: string }).fullName || 'there').split(' ')[0];
      const category = buyerEventCategory(event);
      void (async () => {
        const enhanced = await enhanceTransactionalEmailCopy({
          userId: ctx.buyerId,
          firstName,
          category,
          eventKey: event,
          headline: copy.title,
          message: copy.message,
          actionLabel: copy.actionLabel,
        });
        const metaRows = [];
        if (ctx.orderNumber) metaRows.push({ label: 'Order', value: `#${ctx.orderNumber}` });
        if (ctx.caseNumber) metaRows.push({ label: 'Case', value: ctx.caseNumber });

        await sendRichNotificationEmail({
          to: user.email,
          subject: copy.title,
          name: firstName,
          category,
          headline: copy.title,
          message: enhanced.message,
          actionUrl,
          actionLabel: enhanced.actionLabel,
          accent: buyerEventAccent(event),
          preheader: enhanced.message.slice(0, 120),
          metaRows: metaRows.length ? metaRows : undefined,
        });
      })().catch(() => {});
    }
  }
}

export async function deliverBuyerNotificationFromLegacy(
  type: string,
  buyerId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const p = payload || {};
  const map: Record<string, BuyerNotificationEvent> = {
    PAYMENT_RECEIVED: 'order_placed',
    DELIVERY_CONFIRMED: 'delivery_confirmed',
    AUTO_RELEASE_NOTICE: 'payment_notice',
    REFUND_INITIATED: 'refund_initiated',
  };
  const event = map[type];
  if (!event) return;

  await deliverBuyerNotification(
    event,
    {
      buyerId,
      orderId: p.orderId ? String(p.orderId) : undefined,
      orderNumber: p.orderNumber ? String(p.orderNumber) : undefined,
      amount: p.amount != null ? Number(p.amount) : undefined,
      currency: p.currency ? String(p.currency) : undefined,
    },
    p.createdBy ? String(p.createdBy) : buyerId
  );
}
