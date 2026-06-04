import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { ReturnCase } from '../models/ReturnCase';
import { RefundRequest } from '../models/RefundRequest';
import { User } from '../models/User';
import { completeAdminOrder } from '../services/orderLifecycle.service';
import { deliverBuyerNotification } from '../services/buyerNotificationService';
import { sendRichNotificationEmail, isEmailConfigured } from '../services/emailService';
import { getClientUrl } from '../config/publicEnv';

const TICK_MS = Number(process.env.ORDER_AUTOCOMPLETE_TICK_MS || 15 * 60 * 1000);
const GRACE_HOURS = Number(process.env.ORDER_DELIVERED_GRACE_HOURS || 72);
const REMINDER_1_HOURS = Number(process.env.ORDER_REMINDER_1_HOURS || 24);
const REMINDER_2_HOURS = Number(process.env.ORDER_REMINDER_2_HOURS || 48);
const FINAL_WARNING_HOURS = Number(process.env.ORDER_FINAL_WARNING_HOURS || 68);

let started = false;

function buyerOrderUrl(orderId: string): string {
  return `${getClientUrl()}/orders/${orderId}`;
}

function elapsedHours(from?: Date): number {
  if (!from) return 0;
  return Math.max(0, (Date.now() - new Date(from).getTime()) / 3600000);
}

async function sendReminderEmail(params: {
  buyerId: string;
  orderId: string;
  orderNumber: string;
  deliveredAt: Date;
  stage: 'd1' | 'd2' | 'final';
}): Promise<void> {
  if (!isEmailConfigured()) return;
  const user = await User.findById(params.buyerId).select('email fullName').lean();
  if (!user?.email) return;
  const firstName = String(user.fullName || 'there').split(' ')[0];
  const remainingHours = Math.max(
    0,
    Math.ceil((new Date(params.deliveredAt).getTime() + GRACE_HOURS * 3600000 - Date.now()) / 3600000),
  );
  const subject =
    params.stage === 'final'
      ? `Final reminder: order ${params.orderNumber} auto-completes soon`
      : `Reminder: confirm order ${params.orderNumber}`;
  const message =
    params.stage === 'final'
      ? `Your order was marked delivered on ${new Date(params.deliveredAt).toLocaleString()}. If you do not report an issue, it will be completed automatically in about ${remainingHours} hour(s).`
      : `Your order was marked delivered on ${new Date(params.deliveredAt).toLocaleString()}. Please confirm delivery or report an issue before auto-completion.`;

  await sendRichNotificationEmail({
    to: user.email,
    subject,
    name: firstName,
    category: 'order',
    headline: subject,
    message,
    actionUrl: buyerOrderUrl(params.orderId),
    actionLabel: 'Review order',
    accent: params.stage === 'final' ? 'warning' : 'brand',
    preheader: message.slice(0, 120),
    metaRows: [{ label: 'Order', value: `#${params.orderNumber}` }],
  });
}

async function hasBlockingCase(orderId: string): Promise<boolean> {
  const oid = new mongoose.Types.ObjectId(orderId);
  const [openReturn, openRefund] = await Promise.all([
    ReturnCase.exists({ orderId: oid, status: { $nin: ['resolved', 'rejected', 'refund_processed'] } }),
    RefundRequest.exists({ orderId: oid, status: { $in: ['pending', 'approved'] } }),
  ]);
  return Boolean(openReturn || openRefund);
}

async function ensureDeliverySchedule(order: any): Promise<Date | null> {
  const now = new Date();
  const deliveredAt = order.autoCompletion?.deliveredAt || order.updatedAt || now;
  const eligibleAt = order.autoCompletion?.eligibleAt || new Date(new Date(deliveredAt).getTime() + GRACE_HOURS * 3600000);
  const state = order.autoCompletion?.state || 'scheduled';

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        'autoCompletion.deliveredAt': deliveredAt,
        'autoCompletion.eligibleAt': eligibleAt,
        'autoCompletion.state': state,
        'autoCompletion.reminderStagesSent': Array.isArray(order.autoCompletion?.reminderStagesSent)
          ? order.autoCompletion.reminderStagesSent
          : [],
      },
    },
  );
  return deliveredAt;
}

async function processDelivered(order: any): Promise<void> {
  const orderId = String(order._id);
  const buyerId = String(order.buyerId || '');
  if (!mongoose.Types.ObjectId.isValid(buyerId)) return;

  const deliveredAt = await ensureDeliverySchedule(order);
  if (!deliveredAt) return;

  const blockedByCase = await hasBlockingCase(orderId);
  if (blockedByCase || order.escrow?.disputeRaisedAt) {
    await Order.updateOne(
      { _id: order._id },
      { $set: { 'autoCompletion.state': 'blocked', 'autoCompletion.reason': blockedByCase ? 'open_return_or_refund' : 'active_dispute' } },
    );
    return;
  }

  const hours = elapsedHours(deliveredAt);
  const stages: Array<{ stage: 'd1' | 'd2' | 'final'; at: number }> = [
    { stage: 'd1', at: REMINDER_1_HOURS },
    { stage: 'd2', at: REMINDER_2_HOURS },
    { stage: 'final', at: FINAL_WARNING_HOURS },
  ];
  const sentStages = new Set((order.autoCompletion?.reminderStagesSent || []) as Array<'d1' | 'd2' | 'final'>);

  for (const entry of stages) {
    if (hours < entry.at || sentStages.has(entry.stage)) continue;
    await deliverBuyerNotification(
      'order_delivered',
      { buyerId, orderId, orderNumber: order.orderNumber, status: 'delivered' },
      'AUTO_SYSTEM',
      { skipEmail: true },
    );
    await sendReminderEmail({
      buyerId,
      orderId,
      orderNumber: order.orderNumber,
      deliveredAt,
      stage: entry.stage,
    });
    await Order.updateOne(
      { _id: order._id },
      {
        $addToSet: { 'autoCompletion.reminderStagesSent': entry.stage },
        $set: { 'autoCompletion.lastReminderSentAt': new Date() },
      },
    );
  }

  const eligibleAt = order.autoCompletion?.eligibleAt || new Date(new Date(deliveredAt).getTime() + GRACE_HOURS * 3600000);
  if (new Date() < new Date(eligibleAt)) return;

  await completeAdminOrder(orderId, 'AUTO_SYSTEM', { releasePayout: true });
  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        'autoCompletion.state': 'completed',
        'autoCompletion.reason': 'buyer_silent',
        'autoCompletion.completedAt': new Date(),
        'autoCompletion.completionSource': 'auto_system',
      },
      $push: {
        timeline: {
          status: 'auto_completed',
          date: new Date(),
          time: new Date().toISOString(),
        },
      },
    },
  );
}

async function tick(): Promise<{ processed: number }> {
  const deliveredOrders = await Order.find({
    status: 'delivered',
    $or: [{ 'autoCompletion.state': { $exists: false } }, { 'autoCompletion.state': 'scheduled' }],
    'escrow.status': { $nin: ['REFUNDED', 'DISPUTED'] },
  })
    .select('_id orderNumber buyerId status escrow autoCompletion updatedAt')
    .limit(60)
    .lean();

  for (const order of deliveredOrders as any[]) {
    await processDelivered(order);
  }

  return { processed: deliveredOrders.length };
}

export function startDeliveryAutoCompleteWorker(): void {
  if (started) return;
  started = true;
  const run = () => {
    void tick().catch((e) => console.error('[deliveryAutoCompleteWorker]', e));
  };
  run();
  setInterval(run, TICK_MS);
}

export async function runDeliveryAutoCompleteOnce(): Promise<{ processed: number }> {
  return tick();
}
