import crypto from 'crypto';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { RecommendationActivity, RecommendationActivityType } from '../models/RecommendationActivity';
import { RecommendationEmailPreference } from '../models/RecommendationEmailPreference';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { sendRecommendationDealsEmail } from './emailService';
import { getClientUrl } from '../config/publicEnv';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Reaglex';
const MAX_RECOMMENDATIONS = 8;
const ACTIVITY_LOOKBACK_DAYS = 45;
const RECENT_PURCHASE_EXCLUDE_DAYS = 30;

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

function shouldSendByFrequency(pref: { frequency: 'daily' | 'weekly'; lastSentAt?: Date | null }) {
  const minDays = pref.frequency === 'daily' ? 1 : 7;
  return daysSince(pref.lastSentAt) >= minDays;
}

export async function getOrCreateRecommendationPreference(userId: string) {
  const user = await User.findById(userId).select('email fullName notifications').lean();
  if (!user?.email) return null;
  const pref = await RecommendationEmailPreference.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        email: String(user.email).toLowerCase(),
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

  for (const e of events as any[]) {
    const eventType = String(e.eventType || '');
    const pid = e.productId ? String(e.productId) : '';
    const category = (e.category || '').trim();
    const tags = Array.isArray(e.tags) ? e.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [];
    let weight = 0;
    if (eventType === 'wishlist_add') weight = 10;
    else if (eventType === 'cart_add') weight = 8;
    else if (eventType === 'purchase') weight = 6;
    else if (eventType === 'product_view') weight = 4;
    else if (eventType === 'category_interaction') weight = 3;
    else if (eventType === 'tag_interaction') weight = 3;
    else if (eventType === 'wishlist_remove' || eventType === 'cart_remove') weight = -2;

    if (pid) productScores.set(pid, (productScores.get(pid) || 0) + weight);
    if (category) categoryScores.set(category, (categoryScores.get(category) || 0) + weight);
    for (const tag of tags) tagScores.set(tag, (tagScores.get(tag) || 0) + weight);
  }

  return { productScores, categoryScores, tagScores, hasActivity: events.length > 0 };
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

  // 2) Similar by category/tags
  const similarFilter: Record<string, unknown> = {
    status: { $in: ['in_stock', 'low_stock'] },
    _id: { $nin: [...purchasedRecently].filter(mongoose.Types.ObjectId.isValid).map((id) => new mongoose.Types.ObjectId(id)) },
  };
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
  const trending = await Product.find({
    status: { $in: ['in_stock', 'low_stock'] },
    _id: { $nin: [...purchasedRecently].filter(mongoose.Types.ObjectId.isValid).map((id) => new mongoose.Types.ObjectId(id)) },
    ...(mode === 'deals_only' ? { discount: { $gt: 0 } } : {}),
  })
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
        .select('_id name price discount images description')
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

  if (!products.length && !hasActivity) {
    const fallback = await Product.find({ status: { $in: ['in_stock', 'low_stock'] } })
      .select('_id name price discount images description')
      .sort({ discount: -1, views: -1, createdAt: -1 })
      .limit(MAX_RECOMMENDATIONS)
      .lean();
    return { pref, products: fallback, ranked: [] as DealCandidate[] };
  }
  return { pref, products, ranked };
}

export async function sendRecommendationEmailToUser(userId: string) {
  const user = await User.findById(userId).select('fullName email').lean();
  if (!user?.email) return { success: false, reason: 'no_email' };
  const { pref, products } = await generateRecommendationsForUser(userId);
  if (!pref) return { success: false, reason: 'no_preference' };
  if (!pref.enabled || pref.unsubscribed || pref.suppressed) return { success: false, reason: 'disabled' };
  if (!shouldSendByFrequency(pref)) return { success: false, reason: 'frequency_not_due' };
  if (!products.length) return { success: false, reason: 'no_products' };

  const subject = `Special deals just for you, ${String((user as any).fullName || 'shopper').split(' ')[0]}`;
  const history = await RecommendationEmailHistory.create({
    userId,
    email: user.email,
    subject,
    frequency: pref.frequency,
    mode: pref.mode,
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: Number(p.score || 0), reason: String(p.reason || 'Recommended deal') })),
    status: 'sent',
  });

  const unsubscribeUrl = `${CLIENT_URL}/recommendations/unsubscribe/${pref.unsubscribeToken}`;
  const preferencesUrl = `${CLIENT_URL}/account?tab=settings&section=notifications`;
  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const emailProducts = products.map((p: any) => ({
    id: String(p._id),
    name: p.name,
    imageUrl: Array.isArray(p.images) && p.images[0]
      ? String(p.images[0]).startsWith('http')
        ? String(p.images[0])
        : `${process.env.SERVER_URL || ''}${String(p.images[0]).startsWith('/') ? p.images[0] : `/${p.images[0]}`}`
      : '',
    price: Number(p.price || 0),
    discount: Number(p.discount || 0),
    description: String(p.description || '').slice(0, 120),
    viewUrl: `${API_URL}/api/recommendation-emails/track/click/${history._id}/${p._id}`,
  }));

  const sendResult = await sendRecommendationDealsEmail({
    to: user.email,
    name: String((user as any).fullName || 'there').split(' ')[0],
    subject,
    intro: pref.mode === 'deals_only'
      ? 'Hand-picked deal drops you can grab today.'
      : 'We picked these based on your wishlist, views, and shopping activity.',
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
  return { success: true, historyId: String(history._id) };
}

export async function runRecommendationEmailJob() {
  const users = await User.find({ role: 'buyer', accountStatus: { $ne: 'banned' } })
    .select('_id')
    .limit(1500)
    .lean();
  for (const u of users as any[]) {
    try {
      await sendRecommendationEmailToUser(String(u._id));
    } catch (err) {
      // keep batch running
      console.error('[recommendation-email] user failed', String(u._id), err);
    }
  }
}

let recommendationWorkerStarted = false;
export function startRecommendationEmailWorker() {
  if (recommendationWorkerStarted) return;
  recommendationWorkerStarted = true;
  const hourly = 60 * 60 * 1000;
  void runRecommendationEmailJob();
  setInterval(() => {
    void runRecommendationEmailJob();
  }, hourly);
  console.log(`[recommendation-email] worker started (${APP_NAME})`);
}

