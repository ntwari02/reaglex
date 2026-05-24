import mongoose from 'mongoose';
import { User } from '../models/User';
import {
  generateBuyerNotificationCopy,
  type BuyerNotificationContext,
  type BuyerNotificationEvent,
} from './buyerNotificationAssistant.service';
import { createSystemInboxAndFanout } from './systemInboxFanout';
import { safeSendPushToUser } from './pushNotificationService';
import { sendNotificationEmail, isEmailConfigured } from './emailService';
import { pickVisualVariant } from '../utils/notificationVisual';

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
  createdBy?: string
): Promise<void> {
  if (!ctx.buyerId || !mongoose.Types.ObjectId.isValid(ctx.buyerId)) return;

  const channels = await buyerChannels(ctx.buyerId, event);
  if (!channels.inapp && !channels.push && !channels.email) return;

  const copy = generateBuyerNotificationCopy(event, ctx);
  const entityId = ctx.orderId || ctx.caseNumber || ctx.liveSessionId || '';
  const visualVariant = pickVisualVariant(`${ctx.buyerId}:${event}:${entityId || copy.title}:${Date.now()}`);
  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  const creator =
    createdBy && mongoose.Types.ObjectId.isValid(createdBy)
      ? createdBy
      : admin?._id || ctx.buyerId;

  if (channels.inapp) {
    await createSystemInboxAndFanout({
      title: copy.title,
      message: copy.message,
      type: copy.inboxType,
      priority: copy.priority,
      targetAudience: 'specific_user',
      targetUserId: ctx.buyerId,
      createdBy: creator,
      actionUrl: copy.deepLink,
      actionText: copy.actionLabel,
      metadata: {
        category: event,
        tone: copy.tone,
        eventKey: event,
        entityId: ctx.orderId || ctx.caseNumber || ctx.liveSessionId,
        visualVariant,
      },
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

  if (channels.email && isEmailConfigured()) {
    const user = await User.findById(ctx.buyerId).select('email').lean();
    if (user?.email) {
      void sendNotificationEmail({
        to: user.email,
        subject: copy.title,
        body: `${copy.message}\n\n${copy.actionLabel}: ${copy.deepLink}`,
      }).catch(() => {});
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
