import mongoose from 'mongoose';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { isEmailConfigured, sendRecommendationDealsEmail } from '../services/emailService';
import { generateMarketingEmailCopy } from '../email/emailCopyAi.service';
import { buildMarketingEmailContent } from '../email/marketingEmailBuilder';
import { getClientUrl } from '../config/publicEnv';
import { getPersonalizationGate } from '../services/personalizationGate.service';
import {
  isMarketingFlowEnabled,
  isMarketingFlowPushEnabled,
  recordFlowRun,
} from '../models/MarketingAutomationSettings';
import { safeSendPushToUser } from '../services/pushNotificationService';
import { assertBuyerMarketingEligible } from '../services/marketingRecipient.service';
import {
  assertRecommendationLaneSend,
  getRecentMarketingCopyContext,
} from '../services/marketingEmailOrchestration.service';
import { marketingDayKey } from '../email/copyEngine';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Spacilly';

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function hoursSince(date?: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

async function purchasedAfter(userId: mongoose.Types.ObjectId, after: Date) {
  const row = await RecommendationActivity.findOne({
    userId,
    eventType: 'purchase',
    createdAt: { $gte: after },
  })
    .select('_id')
    .lean();
  return Boolean(row?._id);
}

async function buildCartPulseProducts(userId: mongoose.Types.ObjectId, maxProducts: number) {
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const cartAdds = await RecommendationActivity.find({
    userId,
    eventType: 'cart_add',
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const cartIds = [...new Set(cartAdds.map((e: any) => String(e?.productId || '')).filter(Boolean))]
    .filter(mongoose.Types.ObjectId.isValid)
    .slice(0, 8)
    .map((id) => new mongoose.Types.ObjectId(id));

  // Seed categories/tags from cart items + activity payload
  const seedCategories = new Set<string>();
  const seedTags = new Set<string>();
  for (const e of cartAdds as any[]) {
    const c = String(e?.category || '').trim();
    if (c) seedCategories.add(c);
    for (const t of (Array.isArray(e?.tags) ? e.tags : [])) {
      const tt = String(t || '').trim();
      if (tt) seedTags.add(tt);
    }
  }

  if (cartIds.length) {
    const cartProducts = await Product.find({ _id: { $in: cartIds } })
      .select('_id category tags')
      .lean();
    for (const p of cartProducts as any[]) {
      if (p?.category) seedCategories.add(String(p.category));
      for (const t of (p?.tags || [])) seedTags.add(String(t));
    }
  }

  const pickedIds: mongoose.Types.ObjectId[] = [];
  const seen = new Set<string>();

  // 1) Always include the cart items first (if still in stock)
  if (cartIds.length) {
    const cartProducts = await Product.find({ _id: { $in: cartIds }, status: { $in: ['in_stock', 'low_stock'] } })
      .select('_id')
      .lean();
    for (const p of cartProducts as any[]) {
      const id = String(p._id);
      if (seen.has(id)) continue;
      seen.add(id);
      pickedIds.push(p._id);
    }
  }

  // 2) Similar products by category/tags, boosted by discount/views
  const or: any[] = [];
  if (seedCategories.size) or.push({ category: { $in: [...seedCategories] } });
  if (seedTags.size) or.push({ tags: { $in: [...seedTags] } });
  if (or.length) {
    const similar = await Product.find({
      status: { $in: ['in_stock', 'low_stock'] },
      ...(pickedIds.length ? { _id: { $nin: pickedIds } } : {}),
      $or: or,
    })
      .select('_id')
      .sort({ discount: -1, views: -1, createdAt: -1 })
      .limit(maxProducts * 3)
      .lean();
    for (const p of similar as any[]) {
      if (pickedIds.length >= maxProducts) break;
      const id = String(p._id);
      if (seen.has(id)) continue;
      seen.add(id);
      pickedIds.push(p._id);
    }
  }

  // 3) Fill remainder with trending deals
  if (pickedIds.length < maxProducts) {
    const trending = await Product.find({
      status: { $in: ['in_stock', 'low_stock'] },
      ...(pickedIds.length ? { _id: { $nin: pickedIds } } : {}),
    })
      .select('_id')
      .sort({ discount: -1, views: -1, createdAt: -1 })
      .limit(maxProducts * 2)
      .lean();
    for (const p of trending as any[]) {
      if (pickedIds.length >= maxProducts) break;
      const id = String(p._id);
      if (seen.has(id)) continue;
      seen.add(id);
      pickedIds.push(p._id);
    }
  }

  const products = pickedIds.length
    ? await Product.find({ _id: { $in: pickedIds } })
        .select('_id name price discount images description category tags')
        .lean()
    : [];

  const byId = new Map(products.map((p: any) => [String(p._id), p]));
  return pickedIds.map((id) => byId.get(String(id))).filter(Boolean) as any[];
}

async function sendCartPulse(userId: string, lastCartAddAt: Date): Promise<'sent' | 'skipped' | 'failed'> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 'skipped';
  const uid = new mongoose.Types.ObjectId(userId);

  if (!isEmailConfigured()) return 'skipped';

  const laneGate = await assertRecommendationLaneSend(userId, 'cart_pulse', {
    triggerAt: lastCartAddAt,
  });
  if (!laneGate.ok) return 'skipped';

  // If purchased after the cart add, skip.
  if (await purchasedAfter(uid, lastCartAddAt)) return 'skipped';

  const eligibility = await assertBuyerMarketingEligible(userId, { checkDailyCap: true });
  if (!eligibility.ok) return 'skipped';
  const user = await User.findById(uid).select('fullName email notifications accountStatus preferences').lean();
  if (!user?.email) return 'skipped';

  const maxProducts = getIntEnv('CART_PULSE_MAX_PRODUCTS', 16);
  const products = await buildCartPulseProducts(uid, maxProducts);
  if (!products.length) return 'skipped';
  const gate = await getPersonalizationGate(userId);

  const firstName = String((user as any).fullName || 'shopper').split(' ')[0];
  const copyContext = await getRecentMarketingCopyContext(userId);
  const copy = await generateMarketingEmailCopy({
    userId,
    firstName,
    campaign: 'cart_pulse',
    mode: 'mixed',
    allowPersonalized: gate.allowPersonalized,
    recentSubjects: copyContext.subjects,
    recentCampaigns: copyContext.campaigns,
    copyDayKey: marketingDayKey(),
    products: products.map((p: any) => ({
      id: String(p._id),
      name: String(p.name || ''),
      category: p.category ? String(p.category) : undefined,
      discount: Number(p.discount || 0),
    })),
  });
  const history = await RecommendationEmailHistory.create({
    userId: uid,
    email: user.email,
    campaign: 'cart_pulse',
    subject: copy.subject,
    frequency: 'daily',
    mode: 'mixed',
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: 0, reason: 'Cart pulse' })),
    status: 'sent',
    error: gate.allowPersonalized ? undefined : `low_confidence:${gate.confidenceScore}:${gate.confidenceReason}`,
  });

  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const { products: emailProducts } = await buildMarketingEmailContent({
    userId,
    firstName,
    campaign: 'cart_pulse',
    mode: 'mixed',
    allowPersonalized: gate.allowPersonalized,
    products: products as any[],
    historyId: String(history._id),
    displayCurrency,
    serverUrl: API_URL,
    copy,
  });

  const sendResult = await sendRecommendationDealsEmail({
    to: user.email,
    name: firstName,
    subject: copy.subject,
    headline: copy.headline,
    intro: copy.intro,
    shopCtaLabel: copy.ctaLabel,
    products: emailProducts,
    unsubscribeUrl: `${CLIENT_URL}/account?tab=settings&section=notifications`,
    preferencesUrl: `${CLIENT_URL}/account?tab=settings&section=notifications`,
    openPixelUrl: `${process.env.SERVER_URL || ''}/api/recommendation-emails/track/open/${history._id}`,
  });

  if (!sendResult.success) {
    history.status = 'failed';
    history.error = sendResult.error || 'send_failed';
    await history.save();
    return 'failed';
  }

  await BuyerInsightProfile.updateOne(
    { userId: uid },
    { $set: { lastCartPulseSentAt: new Date() } },
    { upsert: true },
  );

  if (await isMarketingFlowPushEnabled('cart_pulse')) {
    void safeSendPushToUser(uid, {
      title: 'Your cart is waiting',
      body: `${firstName}, ${products.length} more picks just for you. Tap to view.`,
      category: 'cart_pulse',
      data: { campaign: 'cart_pulse', historyId: String(history._id) },
      url: `/cart`,
    });
  }

  return 'sent';
}

async function tick(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  if (!isEmailConfigured()) return stats;
  const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('recommendation_emails'))) return stats;
  if (!(await isMarketingFlowEnabled('cart_pulse'))) return stats;

  const windowMinutes = getIntEnv('CART_PULSE_WINDOW_MINUTES', 90);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const rows = await RecommendationActivity.aggregate([
    { $match: { eventType: 'cart_add', createdAt: { $gte: since } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', lastCartAddAt: { $first: '$createdAt' } } },
    { $limit: getIntEnv('CART_PULSE_BATCH', 120) },
  ]);

  for (const r of rows as any[]) {
    const uid = String(r?._id || '');
    if (!mongoose.Types.ObjectId.isValid(uid)) continue;
    try {
      const outcome = await sendCartPulse(uid, new Date(r.lastCartAddAt || Date.now()));
      if (outcome === 'sent') stats.sent += 1;
      else if (outcome === 'failed') stats.failed += 1;
      else stats.skipped += 1;
    } catch (e) {
      stats.failed += 1;
      console.error('[cart-pulse] failed', uid, e);
    }
  }
  return stats;
}

export async function runCartPulseOnce(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = await tick();
  await recordFlowRun('cart_pulse', stats);
  return stats;
}

let started = false;
export function startCartPulseEmailWorker() {
  if (started) return;
  started = true;
  void runCartPulseOnce();
  setInterval(() => void runCartPulseOnce(), 20 * 60 * 1000);
  console.log(`[cart-pulse] worker started (${APP_NAME})`);
}

