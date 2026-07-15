import mongoose from 'mongoose';
import { AbandonedCart } from '../models/AbandonedCart';
import { AbandonedCartQueue } from '../models/AbandonedCartQueue';
import { getOrCreateCartSettings, settingsToClient } from '../models/AbandonedCartSettings';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { generateMarketingEmailCopy } from '../email/emailCopyAi.service';
import { isEmailConfigured, sendAbandonedCartEmail } from '../services/emailService';
import { getClientUrl } from '../config/publicEnv';
import { formatUsdAsCurrency } from '../utils/money';
import { recordFlowRun } from '../models/MarketingAutomationSettings';
import { safeSendPushToUser } from '../services/pushNotificationService';
import { inferPrimaryCategory } from '../services/abandonedCartRecovery.service';
import {
  appendTimeline,
  cancelPendingQueueJobs,
  computeScheduledSendAt,
  delayToMs,
  emitRecoveryEvent,
  enqueueReminder,
  generateRecoveryCoupon,
  getStepConfig,
  parseCooldownMs,
  preSendSafetyChecks,
} from '../services/cartRecoveryEngine.service';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { isMarketingFlowEnabled } from '../models/MarketingAutomationSettings';
import { assertBuyerMarketingEligible } from '../services/marketingRecipient.service';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Spacilly';
const WORKER_INTERVAL_MS = 60 * 1000;

function getBoolEnv(name: string, fallback: boolean) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  return fallback;
}

type CartLine = { productId: string; quantity: number };

async function buildCartLinesFromActivity(
  userId: string,
  since: Date
): Promise<{ lines: CartLine[]; lastCartAddAt: Date | null }> {
  const events = await RecommendationActivity.find({
    userId: new mongoose.Types.ObjectId(userId),
    eventType: { $in: ['cart_add', 'cart_remove', 'purchase'] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: 1 })
    .limit(1200)
    .lean();

  const state = new Map<string, { quantity: number; lastType: string; lastAt: Date }>();
  let lastCartAddAt: Date | null = null;

  for (const e of events as any[]) {
    const pid = e?.productId ? String(e.productId) : '';
    const type = String(e?.eventType || '');
    const at = new Date(e?.createdAt || Date.now());
    if (type === 'purchase') continue;
    if (!pid) continue;
    if (type === 'cart_add') {
      const qty = Math.max(1, Number(e?.meta?.quantity ?? 1) || 1);
      state.set(pid, { quantity: qty, lastType: 'cart_add', lastAt: at });
      if (!lastCartAddAt || at > lastCartAddAt) lastCartAddAt = at;
    } else if (type === 'cart_remove') {
      state.set(pid, { quantity: 0, lastType: 'cart_remove', lastAt: at });
    }
  }

  const lines: CartLine[] = [];
  for (const [pid, v] of state.entries()) {
    if (v.lastType === 'cart_add' && v.quantity > 0) lines.push({ productId: pid, quantity: v.quantity });
  }
  return { lines: lines.slice(0, 12), lastCartAddAt };
}

async function discoverAndEnqueue(): Promise<number> {
  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled || settings.globalPause) return 0;

  const lookback = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const candidates = await RecommendationActivity.aggregate([
    { $match: { eventType: 'cart_add', createdAt: { $gte: lookback } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', lastAdd: { $max: '$createdAt' } } },
    { $limit: 80 },
  ]);

  let enqueued = 0;
  for (const row of candidates as any[]) {
    const userId = String(row._id);
    if (!mongoose.Types.ObjectId.isValid(userId)) continue;
    const buyerGate = await assertBuyerMarketingEligible(userId);
    if (!buyerGate.ok) continue;

    const { lines, lastCartAddAt } = await buildCartLinesFromActivity(userId, lookback);
    if (!lines.length || !lastCartAddAt) continue;

    const user = await User.findById(userId)
      .select('email fullName accountStatus notifications preferences country')
      .lean();
    if (!user?.email || (user as any).accountStatus === 'banned') continue;

    const safety = await preSendSafetyChecks({
      userId,
      cartId: 'new',
      abandonedAt: lastCartAddAt,
      lastCartActivityAt: lastCartAddAt,
    });
    if (!safety.ok && safety.reason !== 'cart_recovered') continue;

    let cart = await AbandonedCart.findOne({ userId: new mongoose.Types.ObjectId(userId), recovered: false })
      .sort({ abandonedAt: -1 });

    const ids = lines.map((l) => l.productId).filter(mongoose.Types.ObjectId.isValid);
    const products = ids.length
      ? await Product.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } })
          .select('_id name price discount images category')
          .lean()
      : [];
    const byId = new Map(products.map((p: any) => [String(p._id), p]));
    let total = 0;
    let items = 0;
    for (const l of lines) {
      const p: any = byId.get(String(l.productId));
      if (!p) continue;
      total += Number(p.price || 0) * l.quantity;
      items += l.quantity;
    }
    const primaryCategory = inferPrimaryCategory(
      products.map((p: any) => ({ category: p.category }))
    );

    if (!cart) {
      cart = await AbandonedCart.create({
        userId: new mongoose.Types.ObjectId(userId),
        customerName: String((user as any).fullName || 'Shopper'),
        customerEmail: String(user.email).toLowerCase(),
        items,
        total,
        abandonedAt: lastCartAddAt,
        lastCartActivityAt: lastCartAddAt,
        remindersSent: 0,
        recovered: false,
        primaryCategory,
        timeline: [
          { event: 'cart_created', at: lastCartAddAt },
          { event: 'abandoned', at: lastCartAddAt },
        ],
      });
      void emitRecoveryEvent('cart.abandoned', {
        cartId: String(cart._id),
        userId,
        total,
        items,
      });
    } else {
      await AbandonedCart.updateOne(
        { _id: cart._id },
        { $set: { items, total, lastCartActivityAt: lastCartAddAt, primaryCategory } }
      );
    }

    const step = Number(cart.remindersSent || 0) + 1;
    const cooldownMs = parseCooldownMs(settings.cooldownPeriod);
    const lastSent = (cart.reminderLog || []).slice(-1)[0]?.sentAt;
    if (lastSent && Date.now() - new Date(lastSent).getTime() < cooldownMs) continue;

    const result = await enqueueReminder({
      userId,
      cartId: String(cart._id),
      reminderStep: step,
      lastCartActivityAt: lastCartAddAt,
      cartTotal: total,
      primaryCategory,
      user: user as any,
    });
    if (result.queued) enqueued += 1;
  }
  return enqueued;
}

async function processQueueItem(queueId: string): Promise<'sent' | 'skipped' | 'failed'> {
  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled || settings.globalPause) {
    await cancelPendingQueueJobs('campaign_disabled');
    return 'skipped';
  }

  const job = await AbandonedCartQueue.findOneAndUpdate(
    { _id: queueId, status: 'PENDING', cancelled: false },
    { $set: { status: 'PROCESSING', lastAttemptAt: new Date() }, $inc: { attemptCount: 1 } },
    { new: true }
  );
  if (!job) return 'skipped';

  const cart = await AbandonedCart.findById(job.cartId).lean();
  if (!cart || cart.recovered) {
    await AbandonedCartQueue.updateOne(
      { _id: job._id },
      { $set: { status: 'CANCELLED', cancelled: true, cancelReason: 'cart_recovered' } }
    );
    return 'skipped';
  }

  const userId = String(job.userId);
  const lastActivity = cart.lastCartActivityAt
    ? new Date(cart.lastCartActivityAt)
    : new Date(cart.abandonedAt);

  const safety = await preSendSafetyChecks({
    userId,
    cartId: String(cart._id),
    abandonedAt: new Date(cart.abandonedAt),
    lastCartActivityAt: lastActivity,
  });
  if (!safety.ok) {
    await AbandonedCartQueue.updateOne(
      { _id: job._id },
      { $set: { status: 'CANCELLED', cancelled: true, cancelReason: safety.reason } }
    );
    if (safety.reason === 'cart_purchased' || safety.reason === 'cart_recovered') {
      await AbandonedCart.updateOne({ _id: cart._id }, { $set: { recovered: true } });
      void emitRecoveryEvent('cart.recovered', { cartId: String(cart._id), userId, reason: safety.reason });
    }
    return 'skipped';
  }

  const user = await User.findById(userId)
    .select('email fullName preferences notifications country')
    .lean();
  if (!user?.email) {
    await AbandonedCartQueue.updateOne(
      { _id: job._id },
      { $set: { status: 'CANCELLED', cancelled: true, cancelReason: 'no_user' } }
    );
    return 'skipped';
  }

  const lookback = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const { lines } = await buildCartLinesFromActivity(userId, lookback);
  const ids = lines.map((l) => l.productId).filter(mongoose.Types.ObjectId.isValid);
  const products = ids.length
    ? await Product.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select('_id name price discount images category')
        .lean()
    : [];
  const byId = new Map(products.map((p: any) => [String(p._id), p]));
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const emailProducts = (
    await Promise.all(
      lines.map(async (l) => {
        const p: any = byId.get(String(l.productId));
        if (!p) return null;
        const img = Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : '';
        const imageUrl =
          img && !img.startsWith('http')
            ? `${(process.env.SERVER_URL || '').replace(/\/$/, '')}${img.startsWith('/') ? img : `/${img}`}`
            : img;
        const conv = await formatUsdAsCurrency(Number(p.price || 0), displayCurrency);
        return {
          id: String(p._id),
          name: String(p.name || ''),
          imageUrl,
          price: Number(p.price || 0),
          priceText: conv.formatted,
          discount: Number(p.discount || 0),
          quantity: Number(l.quantity || 1),
          category: p.category,
          viewUrl: `${CLIENT_URL}/products/${encodeURIComponent(String(p._id))}?src=abandoned_cart_email`,
        };
      })
    )
  ).filter(Boolean) as any[];

  if (!emailProducts.length) {
    await AbandonedCartQueue.updateOne(
      { _id: job._id },
      { $set: { status: 'CANCELLED', cancelled: true, cancelReason: 'cart_deleted' } }
    );
    return 'skipped';
  }

  const settingsDoc = await getOrCreateCartSettings();
  const incentives = settingsDoc.incentives || {};
  let couponCode: string | undefined;
  if (incentives.dynamicCoupon && job.reminderStep >= 3) {
    couponCode = generateRecoveryCoupon(
      String(incentives.couponPrefix || 'COMEBACK'),
      userId,
      job.reminderStep
    );
    await AbandonedCartQueue.updateOne({ _id: job._id }, { $set: { couponCode } });
  }

  const template = job.template || 'waiting';
  const firstName = String((user as any).fullName || 'there').split(' ')[0];
  const copy = await generateMarketingEmailCopy({
    userId,
    firstName,
    campaign: 'abandoned_cart',
    cartTemplate: template,
    products: emailProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      discount: p.discount,
    })),
  });
  for (const p of emailProducts as any[]) {
    if (copy.productDescriptions[p.id]) p.description = copy.productDescriptions[p.id];
    p.ctaLabel = copy.ctaLabel;
  }

  try {
    await sendAbandonedCartEmail({
      to: String(user.email),
      name: firstName,
      subject: copy.subject,
      headline: copy.headline,
      intro: copy.intro,
      cartCtaLabel: copy.ctaLabel,
      products: emailProducts,
      cartUrl: `${CLIENT_URL}/cart`,
    });

    await RecommendationEmailHistory.create({
      userId: new mongoose.Types.ObjectId(userId),
      email: String(user.email).toLowerCase(),
      campaign: 'abandoned_cart',
      subject: copy.subject,
      frequency: 'daily',
      mode: 'mixed',
      productIds: emailProducts.map((p) => new mongoose.Types.ObjectId(p.id)),
      products: emailProducts.map((p) => ({
        productId: new mongoose.Types.ObjectId(p.id),
        score: 1,
        reason: 'abandoned_cart',
      })),
      status: 'sent',
      sentAt: new Date(),
    });

    const step = job.reminderStep;
    await AbandonedCart.updateOne(
      { _id: cart._id },
      {
        $set: { remindersSent: step, items: emailProducts.reduce((s, p) => s + p.quantity, 0) },
        $push: {
          reminderLog: {
            step,
            channel: 'email',
            scheduledAt: job.scheduledSendAt,
            sentAt: new Date(),
          },
        },
      }
    );
    await appendTimeline(String(cart._id), 'email_sent', { step, template });

    await AbandonedCartQueue.updateOne(
      { _id: job._id },
      { $set: { status: 'COMPLETED', completed: true } }
    );

    void emitRecoveryEvent('email.sent', {
      cartId: String(cart._id),
      userId,
      step,
      scheduledSendAt: job.scheduledSendAt,
    });

    if (step < settings.maxReminders) {
      const nextStep = step + 1;
      const { scheduledSendAt } = await computeScheduledSendAt({
        lastCartActivityAt: lastActivity,
        stepIndex: nextStep - 1,
        cartTotal: Number(cart.total || 0),
        primaryCategory: cart.primaryCategory,
        user: user as any,
      });
      const cooldownMs = parseCooldownMs(settings.cooldownPeriod);
      const stepCfg = getStepConfig(settings, nextStep - 1);
      const stepDelay = delayToMs(stepCfg.delayValue, stepCfg.delayUnit);
      await enqueueReminder({
        userId,
        cartId: String(cart._id),
        reminderStep: nextStep,
        lastCartActivityAt: new Date(Date.now() + cooldownMs - stepDelay),
        cartTotal: Number(cart.total || 0),
        primaryCategory: cart.primaryCategory,
        user: user as any,
      });
    }

    void safeSendPushToUser(userId, {
      title: 'Your cart is waiting',
      body: `${emailProducts.length} item${emailProducts.length > 1 ? 's' : ''} still in your cart.`,
      category: 'abandoned_cart',
      data: { campaign: 'abandoned_cart', step: String(step) },
      url: '/cart',
    });

    return 'sent';
  } catch (e) {
    await AbandonedCartQueue.updateOne({ _id: job._id }, { $set: { status: 'FAILED' } });
    console.error('[abandoned-cart-email] send failed', queueId, e);
    return 'failed';
  }
}

async function processDueQueue(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled || settings.globalPause) {
    await cancelPendingQueueJobs('campaign_disabled');
    return stats;
  }

  const due = await AbandonedCartQueue.find({
    status: 'PENDING',
    cancelled: false,
    completed: false,
    scheduledSendAt: { $lte: new Date() },
  })
    .sort({ scheduledSendAt: 1 })
    .limit(40)
    .lean();

  for (const job of due as any[]) {
    const outcome = await processQueueItem(String(job._id));
    if (outcome === 'sent') stats.sent += 1;
    else if (outcome === 'failed') stats.failed += 1;
    else stats.skipped += 1;
  }
  return stats;
}

async function tick(): Promise<{ sent: number; skipped: number; failed: number; discovered: number }> {
  const enabledByEnv = getBoolEnv('SEND_ABANDONED_CART_EMAIL', true);
  if (!enabledByEnv || !isEmailConfigured()) {
    return { sent: 0, skipped: 0, failed: 0, discovered: 0 };
  }
  if (!(await isMarketingFlowEnabled('abandoned_cart'))) {
    return { sent: 0, skipped: 0, failed: 0, discovered: 0 };
  }
  const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('abandoned_cart_emails'))) {
    return { sent: 0, skipped: 0, failed: 0, discovered: 0 };
  }

  const settings = settingsToClient(await getOrCreateCartSettings());
  if (!settings.enabled || settings.globalPause) {
    await cancelPendingQueueJobs('campaign_disabled');
    return { sent: 0, skipped: 0, failed: 0, discovered: 0 };
  }

  const discovered = await discoverAndEnqueue();
  const stats = await processDueQueue();
  return { ...stats, discovered };
}

export async function runAbandonedCartOnce(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
  discovered?: number;
}> {
  const stats = await tick();
  await recordFlowRun('abandoned_cart', stats);
  return stats;
}

let started = false;
export function startAbandonedCartEmailWorker() {
  if (started) return;
  started = true;
  void runAbandonedCartOnce();
  setInterval(() => void runAbandonedCartOnce(), WORKER_INTERVAL_MS);
  console.log(`[abandoned-cart-email] queue worker started (${APP_NAME}) — 1min tick, admin settings SSOT`);
}
