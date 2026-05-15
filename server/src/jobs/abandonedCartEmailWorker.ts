import mongoose from 'mongoose';
import { AbandonedCart } from '../models/AbandonedCart';
import { AbandonedCartSettings } from '../models/AbandonedCartSettings';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { isEmailConfigured, sendAbandonedCartEmail } from '../services/emailService';
import { getClientUrl } from '../config/publicEnv';
import { formatUsdAsCurrency } from '../utils/money';
import {
  isMarketingFlowEnabled,
  isMarketingFlowPushEnabled,
  recordFlowRun,
} from '../models/MarketingAutomationSettings';
import { safeSendPushToUser } from '../services/pushNotificationService';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Reaglex';

function getBoolEnv(name: string, fallback: boolean) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  return fallback;
}

function timingToMs(timing: string): number {
  const t = String(timing || '').trim().toLowerCase();
  if (t === '30m' || t === '30min' || t === '30mins') return 30 * 60 * 1000;
  if (t === '1h' || t === '1hr' || t === '1hour') return 60 * 60 * 1000;
  if (t === '2h' || t === '2hr') return 2 * 60 * 60 * 1000;
  if (t === '6h' || t === '6hr') return 6 * 60 * 60 * 1000;
  if (t === '12h' || t === '12hr') return 12 * 60 * 60 * 1000;
  if (t === '24h' || t === '24hr' || t === '1d') return 24 * 60 * 60 * 1000;
  if (t === '48h' || t === '48hr' || t === '2d') return 48 * 60 * 60 * 1000;
  return 60 * 60 * 1000; // default 1 hour
}

async function getSettings() {
  let doc = await AbandonedCartSettings.findOne().lean();
  if (!doc) {
    doc = await (AbandonedCartSettings as any).create({});
    doc = await AbandonedCartSettings.findOne().lean();
  }
  const enabled = Boolean((doc as any)?.autoReminderEnabled ?? true);
  const reminderTiming = String((doc as any)?.reminderTiming ?? '1hr');
  return { enabled, reminderTiming };
}

type CartLine = { productId: string; quantity: number };

async function buildCartLinesFromActivity(userId: string, since: Date): Promise<{ lines: CartLine[]; lastCartAddAt: Date | null }> {
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
    if (type === 'purchase') {
      // Purchase after cart activity typically means cart recovered.
      // We handle purchase gating separately; keep parsing to compute latest cart snapshot.
      continue;
    }
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

async function userPurchasedAfter(userId: string, after: Date): Promise<boolean> {
  const row = await RecommendationActivity.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    eventType: 'purchase',
    createdAt: { $gte: after },
  })
    .select('_id')
    .lean();
  return Boolean(row?._id);
}

async function processOneUser(userId: string, cutoff: Date): Promise<'sent' | 'skipped' | 'failed'> {
  const user = await User.findById(userId).select('email fullName accountStatus notifications preferences').lean();
  if (!user?.email) return 'skipped';
  if ((user as any).accountStatus === 'banned') return 'skipped';

  const promoAllowed = Boolean((user as any)?.notifications?.email?.promotions ?? true);
  if (!promoAllowed) return 'skipped';

  const lookback = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const { lines, lastCartAddAt } = await buildCartLinesFromActivity(String(userId), lookback);
  if (!lines.length || !lastCartAddAt) return 'skipped';
  if (lastCartAddAt > cutoff) return 'skipped';

  const purchased = await userPurchasedAfter(String(userId), lastCartAddAt);
  if (purchased) {
    await AbandonedCart.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), recovered: false },
      { $set: { recovered: true } },
    );
    return 'skipped';
  }

  const existing = await AbandonedCart.findOne({ userId: new mongoose.Types.ObjectId(userId), recovered: false })
    .sort({ abandonedAt: -1 })
    .lean();
  if (existing?.abandonedAt && (Date.now() - new Date(existing.abandonedAt).getTime()) < 12 * 60 * 60 * 1000) {
    return 'skipped';
  }

  const ids = lines.map((l) => l.productId).filter(mongoose.Types.ObjectId.isValid).map((id) => new mongoose.Types.ObjectId(id));
  const products = ids.length
    ? await Product.find({ _id: { $in: ids }, status: { $in: ['in_stock', 'low_stock'] } })
        .select('_id name price discount images')
        .lean()
    : [];

  const byId = new Map(products.map((p: any) => [String(p._id), p]));
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const emailProducts = lines
    .map((l) => {
      const p: any = byId.get(String(l.productId));
      if (!p) return null;
      const img = Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : '';
      const imageUrl = img && !img.startsWith('http')
        ? `${(process.env.SERVER_URL || '').replace(/\/$/, '')}${img.startsWith('/') ? img : `/${img}`}`
        : img;
      return {
        id: String(p._id),
        name: String(p.name || ''),
        imageUrl,
        price: Number(p.price || 0),
        priceText: '',
        discount: Number(p.discount || 0),
        quantity: Number(l.quantity || 1),
        viewUrl: `${CLIENT_URL}/products/${encodeURIComponent(String(p._id))}?src=abandoned_cart_email`,
      };
    })
    .filter(Boolean) as any[];

  if (!emailProducts.length) return 'skipped';
  for (const ep of emailProducts as any[]) {
    const conv = await formatUsdAsCurrency(Number(ep.price || 0), displayCurrency);
    ep.priceText = conv.formatted;
  }
  const total = emailProducts.reduce((sum: number, p: any) => sum + (Number(p.price || 0) * Number(p.quantity || 1)), 0);

  await (AbandonedCart as any).create({
    userId: new mongoose.Types.ObjectId(userId),
    customerName: String((user as any).fullName || 'Shopper'),
    customerEmail: String(user.email).toLowerCase(),
    items: emailProducts.reduce((sum: number, p: any) => sum + (Number(p.quantity || 1)), 0),
    total,
    abandonedAt: lastCartAddAt,
    remindersSent: 1,
    recovered: false,
  });

  await sendAbandonedCartEmail({
    to: String(user.email),
    name: String((user as any).fullName || 'there').split(' ')[0],
    subject: `You left items in your cart – ${APP_NAME}`,
    products: emailProducts,
    cartUrl: `${CLIENT_URL}/cart`,
  });

  if (await isMarketingFlowPushEnabled('abandoned_cart')) {
    void safeSendPushToUser(userId, {
      title: 'Your cart is waiting',
      body: `${emailProducts.length} item${emailProducts.length > 1 ? 's' : ''} still in your cart — tap to checkout.`,
      category: 'abandoned_cart',
      data: { campaign: 'abandoned_cart' },
      url: `/cart`,
    });
  }

  return 'sent';
}

async function tick(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  const enabledByEnv = getBoolEnv('SEND_ABANDONED_CART_EMAIL', true);
  if (!enabledByEnv) return stats;
  if (!isEmailConfigured()) return stats;
  if (!(await isMarketingFlowEnabled('abandoned_cart'))) return stats;

  const settings = await getSettings();
  if (!settings.enabled) return stats;

  const ageMs = timingToMs(settings.reminderTiming);
  const cutoff = new Date(Date.now() - ageMs);
  const lookback = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const candidates = await RecommendationActivity.aggregate([
    {
      $match: {
        eventType: 'cart_add',
        createdAt: { $gte: lookback, $lte: cutoff },
      },
    },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', lastCartAddAt: { $first: '$createdAt' } } },
    { $limit: 80 },
  ]);

  for (const c of candidates as any[]) {
    const userId = String(c._id || '');
    if (!mongoose.Types.ObjectId.isValid(userId)) continue;
    try {
      const outcome = await processOneUser(userId, cutoff);
      if (outcome === 'sent') stats.sent += 1;
      else if (outcome === 'failed') stats.failed += 1;
      else stats.skipped += 1;
    } catch (e) {
      stats.failed += 1;
      console.error('[abandoned-cart-email] user failed', userId, e);
    }
  }
  return stats;
}

export async function runAbandonedCartOnce(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = await tick();
  await recordFlowRun('abandoned_cart', stats);
  return stats;
}

let started = false;
export function startAbandonedCartEmailWorker() {
  if (started) return;
  started = true;
  void runAbandonedCartOnce();
  setInterval(() => void runAbandonedCartOnce(), 10 * 60 * 1000);
  console.log(`[abandoned-cart-email] worker started (${APP_NAME})`);
}

