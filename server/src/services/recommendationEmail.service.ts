import crypto from 'crypto';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { RecommendationActivity, RecommendationActivityType } from '../models/RecommendationActivity';
import { RecommendationEmailPreference } from '../models/RecommendationEmailPreference';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { generateMarketingEmailCopy } from '../email/emailCopyAi.service';
import { buildMarketingEmailContent } from '../email/marketingEmailBuilder';
import { sendRecommendationDealsEmail } from './emailService';
import { getClientUrl } from '../config/publicEnv';
import { buyerVisibleProductFilter } from '../utils/publicProductQuery';
import { getPersonalizationGate } from './personalizationGate.service';
import {
  getDailyMarketingEmailCap,
  isMarketingFlowEnabled,
  isMarketingFlowPushEnabled,
  recordFlowRun,
} from '../models/MarketingAutomationSettings';
import { safeSendPushToUser } from './pushNotificationService';
import { assertBuyerMarketingEligible } from './marketingRecipient.service';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Reaglex';
function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const MAX_RECOMMENDATIONS = getIntEnv('RECOMMENDATION_EMAIL_MAX_PRODUCTS', 12);
const ACTIVITY_LOOKBACK_DAYS = 45;
const RECENT_PURCHASE_EXCLUDE_DAYS = 30;
const RECENCY_HALF_LIFE_DAYS = 10; // smaller = more weight on recent behavior
const MAX_PER_CATEGORY_IN_EMAIL = 2;

type DealCandidate = {
  productId: mongoose.Types.ObjectId;
  score: number;
  reason: string;
};

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function daysSince(date?: Date | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function recencyMultiplier(eventAt?: Date | null): number {
  const d = daysSince(eventAt);
  if (!Number.isFinite(d) || d < 0) return 1;
  // Exponential decay: 1.0 now → ~0.5 at half-life
  return Math.pow(0.5, d / RECENCY_HALF_LIFE_DAYS);
}

function shouldSendByFrequency(pref: { frequency: 'daily' | 'weekly'; lastSentAt?: Date | null }) {
  const minDays = pref.frequency === 'daily' ? 1 : 7;
  return daysSince(pref.lastSentAt) >= minDays;
}

async function isOverDailyMarketingCap(userId: string): Promise<boolean> {
  const cap = await getDailyMarketingEmailCap();
  if (cap <= 0) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await RecommendationEmailHistory.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    sentAt: { $gte: since },
  });
  return count >= cap;
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

export async function getOrCreateRecommendationPreference(userId: string) {
  const user = await User.findById(userId).select('email fullName notifications').lean();
  if (!user?.email) return null;
  const pref = await RecommendationEmailPreference.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        unsubscribeToken: generateToken(),
        enabled: Boolean((user as any)?.notifications?.email?.promotions ?? true),
        frequency: 'weekly',
        mode: 'mixed',
      },
      $set: { email: String(user.email).toLowerCase() },
    },
    { upsert: true, new: true },
  );
  return pref;
}

export async function recordRecommendationActivity(input: {
  userId: string;
  eventType: RecommendationActivityType;
  productId?: string;
  category?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}) {
  if (!input.userId) return;
  const eligible = await assertBuyerMarketingEligible(input.userId);
  if (!eligible.ok) return;
  const payload: Record<string, unknown> = {
    userId: input.userId,
    eventType: input.eventType,
    category: input.category || undefined,
    tags: Array.isArray(input.tags) ? input.tags.slice(0, 12) : [],
    meta: input.meta || {},
  };
  if (input.productId && mongoose.Types.ObjectId.isValid(input.productId)) {
    payload.productId = new mongoose.Types.ObjectId(input.productId);
  }
  await RecommendationActivity.create(payload);
}

async function getRecentPurchasedProductIds(userId: string) {
  const buyerObjectId = new mongoose.Types.ObjectId(userId);
  const since = new Date(Date.now() - RECENT_PURCHASE_EXCLUDE_DAYS * 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    buyerId: buyerObjectId as any,
    createdAt: { $gte: since },
    status: { $in: ['pending', 'processing', 'packed', 'shipped', 'delivered'] },
  } as any)
    .select('items.productId')
    .lean();
  const ids = new Set<string>();
  for (const o of orders as any[]) {
    for (const item of o.items || []) {
      const pid = item?.productId ? String(item.productId) : '';
      if (pid) ids.add(pid);
    }
  }
  return ids;
}

async function buildUserSignals(userId: string) {
  const since = new Date(Date.now() - ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const events = await RecommendationActivity.find({
    userId,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(600)
    .lean();

  const productScores = new Map<string, number>();
  const categoryScores = new Map<string, number>();
  const tagScores = new Map<string, number>();
  const lastCartAdds: Array<{ productId: string; at: Date; quantity: number }> = [];
  const lastViews: Array<{ productId: string; at: Date }> = [];

  for (const e of events as any[]) {
    const eventType = String(e.eventType || '');
    const pid = e.productId ? String(e.productId) : '';
    const category = (e.category || '').trim();
    const tags = Array.isArray(e.tags) ? e.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [];
    const at = e?.createdAt ? new Date(e.createdAt) : new Date();
    let weight = 0;
    if (eventType === 'wishlist_add') weight = 10;
    else if (eventType === 'cart_add') weight = 8;
    else if (eventType === 'purchase') weight = 6;
    else if (eventType === 'product_view') weight = 4;
    else if (eventType === 'category_interaction') weight = 3;
    else if (eventType === 'tag_interaction') weight = 3;
    else if (eventType === 'wishlist_remove' || eventType === 'cart_remove') weight = -2;

    const w = weight * recencyMultiplier(at);

    if (pid) productScores.set(pid, (productScores.get(pid) || 0) + w);
    if (category) categoryScores.set(category, (categoryScores.get(category) || 0) + w);
    for (const tag of tags) tagScores.set(tag, (tagScores.get(tag) || 0) + w);

    if (eventType === 'cart_add' && pid) {
      const qty = Math.max(1, Number(e?.meta?.quantity ?? 1) || 1);
      lastCartAdds.push({ productId: pid, at, quantity: qty });
    }
    if (eventType === 'product_view' && pid) {
      lastViews.push({ productId: pid, at });
    }
  }

  // Keep most recent first (events were already sorted desc, but we defensively sort)
  lastCartAdds.sort((a, b) => b.at.getTime() - a.at.getTime());
  lastViews.sort((a, b) => b.at.getTime() - a.at.getTime());

  return { productScores, categoryScores, tagScores, lastCartAdds: lastCartAdds.slice(0, 12), lastViews: lastViews.slice(0, 24), hasActivity: events.length > 0 };
}

function upsertCandidate(map: Map<string, DealCandidate>, key: string, next: DealCandidate) {
  const curr = map.get(key);
  if (!curr || next.score > curr.score) map.set(key, next);
}

async function scoreRecommendationsForUser(userId: string, mode: 'deals_only' | 'mixed') {
  const purchasedRecently = await getRecentPurchasedProductIds(userId);
  const signals = await buildUserSignals(userId);
  const candidates = new Map<string, DealCandidate>();

  const userTopProductIds = [...signals.productScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => new mongoose.Types.ObjectId(id));

  const seedProducts = userTopProductIds.length
    ? await Product.find({ _id: { $in: userTopProductIds } })
        .select('_id category tags')
        .lean()
    : [];
  const seedCategories = new Set<string>();
  const seedTags = new Set<string>();
  for (const p of seedProducts as any[]) {
    if (p.category) seedCategories.add(String(p.category));
    for (const t of p.tags || []) seedTags.add(String(t));
  }
  for (const [c, s] of signals.categoryScores.entries()) if (s > 0) seedCategories.add(c);
  for (const [t, s] of signals.tagScores.entries()) if (s > 0) seedTags.add(t);

  // 1) Favorites / cart / viewed products
  for (const [pid, s] of signals.productScores.entries()) {
    if (s <= 0 || purchasedRecently.has(pid)) continue;
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const reason = s >= 9 ? 'From wishlist/cart interest' : s >= 5 ? 'From your recent activity' : 'Because you viewed similar items';
    upsertCandidate(candidates, pid, { productId: new mongoose.Types.ObjectId(pid), score: s, reason });
  }

  // 1b) Strong boost: the last cart adds (these are the most “AliExpress-like” signals)
  for (const c of (signals as any).lastCartAdds || []) {
    const pid = String(c?.productId || '');
    if (!pid || purchasedRecently.has(pid)) continue;
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const boost = 8 * recencyMultiplier(c.at);
    upsertCandidate(candidates, pid, {
      productId: new mongoose.Types.ObjectId(pid),
      score: (candidates.get(pid)?.score || 0) + boost,
      reason: 'In your cart recently',
    });
  }

  // 1c) Recency boost: very recent product views
  for (const v of (signals as any).lastViews || []) {
    const pid = String(v?.productId || '');
    if (!pid || purchasedRecently.has(pid)) continue;
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const boost = 4 * recencyMultiplier(v.at);
    upsertCandidate(candidates, pid, {
      productId: new mongoose.Types.ObjectId(pid),
      score: (candidates.get(pid)?.score || 0) + boost,
      reason: 'You viewed this recently',
    });
  }

  // 2) Similar by category/tags
  const similarFilter = buyerVisibleProductFilter({
    _id: { $nin: [...purchasedRecently].filter(mongoose.Types.ObjectId.isValid).map((id) => new mongoose.Types.ObjectId(id)) },
  });
  const similarOr: Record<string, unknown>[] = [];
  if (seedCategories.size) similarOr.push({ category: { $in: [...seedCategories] } });
  if (seedTags.size) similarOr.push({ tags: { $in: [...seedTags] } });
  if (similarOr.length) {
    const similar = await Product.find({ ...similarFilter, $or: similarOr })
      .select('_id category tags discount views createdAt')
      .sort({ views: -1, createdAt: -1 })
      .limit(70)
      .lean();
    for (const p of similar as any[]) {
      const pid = String(p._id);
      let score = 5;
      if (seedCategories.has(String(p.category || ''))) score += 2;
      if (Array.isArray(p.tags) && p.tags.some((t: string) => seedTags.has(String(t)))) score += 2;
      if (Number(p.discount || 0) > 0) score += 2;
      upsertCandidate(candidates, pid, { productId: p._id, score, reason: 'Similar to your interests' });
    }
  }

  // 3) Trending + discounts boosts
  const trending = await Product.find(
    buyerVisibleProductFilter({
      _id: { $nin: [...purchasedRecently].filter(mongoose.Types.ObjectId.isValid).map((id) => new mongoose.Types.ObjectId(id)) },
      ...(mode === 'deals_only' ? { discount: { $gt: 0 } } : {}),
    }),
  )
    .select('_id discount views createdAt')
    .sort({ discount: -1, views: -1, createdAt: -1 })
    .limit(80)
    .lean();

  for (const p of trending as any[]) {
    const pid = String(p._id);
    const isNew = daysSince(p.createdAt) <= 14;
    const discount = Number(p.discount || 0);
    let score = 2;
    if (discount > 0) score += 3;
    if ((p.views || 0) > 25) score += 2;
    if (isNew) score += 1;
    upsertCandidate(candidates, pid, {
      productId: p._id,
      score,
      reason: discount > 0 ? 'Top discounted deal' : 'Trending now',
    });
  }

  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
  return { ranked, hasActivity: signals.hasActivity };
}

function diversifyProductsForEmail(products: any[]) {
  const byCategoryCount = new Map<string, number>();
  const picked: any[] = [];
  for (const p of products) {
    const cat = String(p?.category || '').trim() || 'uncategorized';
    const curr = byCategoryCount.get(cat) || 0;
    if (curr >= MAX_PER_CATEGORY_IN_EMAIL) continue;
    byCategoryCount.set(cat, curr + 1);
    picked.push(p);
  }
  return picked;
}

export async function generateRecommendationsForUser(userId: string) {
  const pref = await getOrCreateRecommendationPreference(userId);
  if (!pref || !pref.enabled || pref.unsubscribed || pref.suppressed) return { pref, products: [] as any[], ranked: [] as DealCandidate[] };
  const { ranked, hasActivity } = await scoreRecommendationsForUser(userId, pref.mode);
  const prevIds = new Set(pref.lastRecommendationProductIds || []);
  const noRepeatFirst = ranked.filter((r) => !prevIds.has(String(r.productId)));
  const take = [...noRepeatFirst, ...ranked].slice(0, MAX_RECOMMENDATIONS);
  const ids = take.map((r) => r.productId);
  const productsRaw = ids.length
    ? await Product.find({ _id: { $in: ids } })
        .select('_id name price discount images description category tags')
        .lean()
    : [];
  const byId = new Map(productsRaw.map((p: any) => [String(p._id), p]));
  const products = take
    .map((r) => {
      const p: any = byId.get(String(r.productId));
      if (!p) return null;
      return {
        ...p,
        score: r.score,
        reason: r.reason,
      };
    })
    .filter(Boolean);

  const diversified = diversifyProductsForEmail(products).slice(0, MAX_RECOMMENDATIONS);

  if (!diversified.length && !hasActivity) {
    const fallback = await Product.find(buyerVisibleProductFilter())
      .select('_id name price discount images description category tags')
      .sort({ discount: -1, views: -1, createdAt: -1 })
      .limit(MAX_RECOMMENDATIONS)
      .lean();
    return { pref, products: fallback, ranked: [] as DealCandidate[] };
  }
  return { pref, products: diversified, ranked };
}

export async function sendRecommendationEmailToUser(userId: string) {
  const gate = await assertBuyerMarketingEligible(userId, {
    checkDailyCap: true,
    requirePreferenceEnabled: true,
  });
  if (!gate.ok) return { success: false, reason: gate.reason };
  const user = await User.findById(userId).select('fullName email preferences').lean();
  if (!user?.email) return { success: false, reason: 'no_email' };
  const { pref, products } = await generateRecommendationsForUser(userId);
  if (!pref) return { success: false, reason: 'no_preference' };
  if (!pref.enabled || pref.unsubscribed || pref.suppressed) return { success: false, reason: 'disabled' };
  if (!shouldSendByFrequency(pref)) return { success: false, reason: 'frequency_not_due' };
  if (!products.length) return { success: false, reason: 'no_products' };

  // Global safety: cap marketing emails per user per 24h (prevents spam across flows).
  if (await isOverDailyMarketingCap(userId)) {
    return { success: false, reason: 'daily_cap' };
  }

  const personalizationGate = await getPersonalizationGate(userId);

  // Dedupe: avoid sending the exact same batch repeatedly (common after restarts / limited catalog).
  const currentIds = products.map((p: any) => String(p._id));
  const lastIds = Array.isArray(pref.lastRecommendationProductIds) ? pref.lastRecommendationProductIds : [];
  if (lastIds.length && sameSet(lastIds, currentIds) && daysSince(pref.lastSentAt) < 7) {
    await RecommendationEmailHistory.create({
      userId,
      email: user.email,
      subject: 'Skipped duplicate recommendation batch',
      frequency: pref.frequency,
      mode: pref.mode,
      productIds: products.map((p: any) => p._id),
      products: products.map((p: any) => ({
        productId: p._id,
        score: Number(p.score || 0),
        reason: String(p.reason || 'Recommended deal'),
      })),
      status: 'skipped',
      error: 'duplicate_batch',
    });
    return { success: false, reason: 'duplicate_batch' };
  }

  const firstName = String((user as any).fullName || 'shopper').split(' ')[0];
  const copy = await generateMarketingEmailCopy({
    userId,
    firstName,
    campaign: 'recommendation',
    mode: pref.mode === 'deals_only' ? 'deals_only' : 'mixed',
    allowPersonalized: personalizationGate.allowPersonalized,
    products: products.map((p: any) => ({
      id: String(p._id),
      name: String(p.name || ''),
      category: p.category ? String(p.category) : undefined,
      reason: String(p.reason || ''),
      discount: Number(p.discount || 0),
    })),
  });
  const history = await RecommendationEmailHistory.create({
    userId,
    email: user.email,
    campaign: 'recommendation',
    subject: copy.subject,
    frequency: pref.frequency,
    mode: pref.mode,
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: Number(p.score || 0), reason: String(p.reason || 'Recommended deal') })),
    status: 'sent',
    error: personalizationGate.allowPersonalized ? undefined : `low_confidence:${personalizationGate.confidenceScore}:${personalizationGate.confidenceReason}`,
  });

  const unsubscribeUrl = `${CLIENT_URL}/recommendations/unsubscribe/${pref.unsubscribeToken}`;
  const preferencesUrl = `${CLIENT_URL}/account?tab=settings&section=notifications`;
  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const { products: emailProducts } = await buildMarketingEmailContent({
    userId,
    firstName,
    campaign: 'recommendation',
    mode: pref.mode === 'deals_only' ? 'deals_only' : 'mixed',
    allowPersonalized: personalizationGate.allowPersonalized,
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
    unsubscribeUrl,
    preferencesUrl,
    openPixelUrl: `${process.env.SERVER_URL || ''}/api/recommendation-emails/track/open/${history._id}`,
  });

  if (!sendResult.success) {
    history.status = 'failed';
    history.error = sendResult.error || 'send_failed';
    await history.save();
    return { success: false, reason: sendResult.error || 'send_failed' };
  }

  pref.lastSentAt = new Date();
  pref.lastRecommendationProductIds = products.map((p: any) => String(p._id));
  await pref.save();

  if (await isMarketingFlowPushEnabled('recommendation')) {
    const firstName = String((user as any).fullName || 'shopper').split(' ')[0];
    void safeSendPushToUser(userId, {
      title: 'Deals picked for you',
      body: `${firstName}, ${emailProducts.length} fresh recommendations are ready.`,
      category: 'recommendation',
      data: { campaign: 'recommendation', historyId: String(history._id) },
      url: `/recommendations`,
    });
  }

  return { success: true, historyId: String(history._id) };
}

export async function runRecommendationEmailJob(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  if (!(await isMarketingFlowEnabled('recommendation'))) return stats;
  const maxPerRun = getIntEnv('RECOMMENDATION_EMAIL_RUN_MAX_USERS', 400);
  const users = await User.find({ role: 'buyer', accountStatus: { $ne: 'banned' } })
    .select('_id')
    .limit(maxPerRun)
    .lean();
  for (const u of users as any[]) {
    try {
      const result = await sendRecommendationEmailToUser(String(u._id));
      if (result?.success) stats.sent += 1;
      else stats.skipped += 1;
    } catch (err) {
      stats.failed += 1;
      console.error('[recommendation-email] user failed', String(u._id), err);
    }
  }
  return stats;
}

export async function runRecommendationOnce(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = await runRecommendationEmailJob();
  await recordFlowRun('recommendation', stats);
  return stats;
}

let recommendationWorkerStarted = false;
export function startRecommendationEmailWorker() {
  if (recommendationWorkerStarted) return;
  recommendationWorkerStarted = true;
  const hourly = 60 * 60 * 1000;
  void runRecommendationOnce();
  setInterval(() => {
    void runRecommendationOnce();
  }, hourly);
  console.log(`[recommendation-email] worker started (${APP_NAME})`);
}

