import mongoose from 'mongoose';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { isEmailConfigured, sendRecommendationDealsEmail } from '../services/emailService';
import { getClientUrl } from '../config/publicEnv';
import { formatUsdAsCurrency } from '../utils/money';
import { getPersonalizationGate } from '../services/personalizationGate.service';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Reaglex';

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function hoursSince(date?: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

async function isOverDailyMarketingCap(userId: string): Promise<boolean> {
  const cap = getIntEnv('DAILY_MARKETING_EMAIL_CAP', 8);
  if (cap <= 0) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await RecommendationEmailHistory.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    sentAt: { $gte: since },
  });
  return count >= cap;
}

async function hasIntentAfter(userId: mongoose.Types.ObjectId, after: Date, productIds: mongoose.Types.ObjectId[]) {
  const row = await RecommendationActivity.findOne({
    userId,
    createdAt: { $gte: after },
    $or: [
      { eventType: 'purchase' },
      { eventType: 'cart_add', productId: { $in: productIds } },
    ],
  } as any)
    .select('_id')
    .lean();
  return Boolean(row?._id);
}

async function buildBrowseAbandonProducts(
  seedProducts: any[],
  maxProducts: number,
): Promise<any[]> {
  const seedCategories = new Set<string>();
  const seedTags = new Set<string>();
  for (const p of seedProducts) {
    if (p?.category) seedCategories.add(String(p.category));
    for (const t of (p?.tags || [])) seedTags.add(String(t));
  }

  const picked: any[] = [];
  const seen = new Set<string>();

  for (const p of seedProducts) {
    const id = String(p._id);
    if (seen.has(id)) continue;
    seen.add(id);
    picked.push(p);
  }

  const or: any[] = [];
  if (seedCategories.size) or.push({ category: { $in: [...seedCategories] } });
  if (seedTags.size) or.push({ tags: { $in: [...seedTags] } });

  if (picked.length < maxProducts && or.length) {
    const similar = await Product.find({
      status: { $in: ['in_stock', 'low_stock'] },
      _id: { $nin: picked.map((p) => p._id) },
      $or: or,
    })
      .select('_id name price discount images description category tags')
      .sort({ discount: -1, views: -1, createdAt: -1 })
      .limit(maxProducts * 3)
      .lean();
    for (const p of similar as any[]) {
      if (picked.length >= maxProducts) break;
      const id = String(p._id);
      if (seen.has(id)) continue;
      seen.add(id);
      picked.push(p);
    }
  }

  if (picked.length < maxProducts) {
    const trending = await Product.find({
      status: { $in: ['in_stock', 'low_stock'] },
      _id: { $nin: picked.map((p) => p._id) },
    })
      .select('_id name price discount images description category tags')
      .sort({ discount: -1, views: -1, createdAt: -1 })
      .limit(maxProducts * 2)
      .lean();
    for (const p of trending as any[]) {
      if (picked.length >= maxProducts) break;
      const id = String(p._id);
      if (seen.has(id)) continue;
      seen.add(id);
      picked.push(p);
    }
  }

  return picked.slice(0, maxProducts);
}

async function sendBrowseAbandon(userId: string, seedIds: mongoose.Types.ObjectId[], lastViewedAt: Date) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return;
  const uid = new mongoose.Types.ObjectId(userId);
  if (!isEmailConfigured()) return;
  if (await isOverDailyMarketingCap(userId)) return;

  const cooldownHours = getIntEnv('BROWSE_ABANDON_COOLDOWN_HOURS', 6);
  const profile = await BuyerInsightProfile.findOne({ userId: uid }).select('lastBrowseAbandonSentAt').lean();
  if (profile?.lastBrowseAbandonSentAt && hoursSince(profile.lastBrowseAbandonSentAt) < cooldownHours) return;

  // If they purchased or added these items to cart after last view, skip.
  if (await hasIntentAfter(uid, lastViewedAt, seedIds)) return;

  const user = await User.findById(uid).select('fullName email notifications accountStatus preferences').lean();
  if (!user?.email) return;
  if ((user as any).accountStatus === 'banned') return;
  const promoAllowed = Boolean((user as any)?.notifications?.email?.promotions ?? true);
  if (!promoAllowed) return;

  const gate = await getPersonalizationGate(userId);
  const maxProducts = getIntEnv('BROWSE_ABANDON_MAX_PRODUCTS', 14);

  const seedProducts = await Product.find({ _id: { $in: seedIds }, status: { $in: ['in_stock', 'low_stock'] } })
    .select('_id name price discount images description category tags')
    .lean();
  if (!seedProducts.length) return;

  const products = await buildBrowseAbandonProducts(seedProducts, maxProducts);
  if (!products.length) return;

  const firstName = String((user as any).fullName || 'shopper').split(' ')[0];
  const subject = `Take another look, ${firstName}`;
  const history = await RecommendationEmailHistory.create({
    userId: uid,
    email: user.email,
    campaign: 'browse_abandon',
    subject,
    frequency: 'daily',
    mode: 'mixed',
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: 0, reason: 'Browse abandon' })),
    status: 'sent',
    error: gate.allowPersonalized ? undefined : `low_confidence:${gate.confidenceScore}:${gate.confidenceReason}`,
  });

  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();

  const emailProducts = [];
  for (const p of products as any[]) {
    const img = Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : '';
    const imageUrl = img && !img.startsWith('http')
      ? `${(process.env.SERVER_URL || '').replace(/\/$/, '')}${img.startsWith('/') ? img : `/${img}`}`
      : img;
    const conv = await formatUsdAsCurrency(Number(p.price || 0), displayCurrency);
    emailProducts.push({
      id: String(p._id),
      name: String(p.name || ''),
      imageUrl,
      price: Number(p.price || 0),
      priceText: conv.formatted,
      discount: Number(p.discount || 0),
      description: String(p.description || '').slice(0, 90),
      viewUrl: `${API_URL}/api/recommendation-emails/track/click/${history._id}/${p._id}`,
    });
  }

  const sendResult = await sendRecommendationDealsEmail({
    to: user.email,
    name: firstName,
    subject,
    intro: gate.allowPersonalized
      ? 'You viewed these items recently — here are similar picks and today’s best deals.'
      : 'Popular picks and deals you may like.',
    products: emailProducts,
    unsubscribeUrl: `${CLIENT_URL}/account?tab=settings&section=notifications`,
    preferencesUrl: `${CLIENT_URL}/account?tab=settings&section=notifications`,
    openPixelUrl: `${process.env.SERVER_URL || ''}/api/recommendation-emails/track/open/${history._id}`,
  });

  if (!sendResult.success) {
    history.status = 'failed';
    history.error = sendResult.error || 'send_failed';
    await history.save();
    return;
  }

  await BuyerInsightProfile.updateOne(
    { userId: uid },
    { $set: { lastBrowseAbandonSentAt: new Date() } },
    { upsert: true },
  );
}

async function tick() {
  if (!isEmailConfigured()) return;

  const windowHours = getIntEnv('BROWSE_ABANDON_WINDOW_HOURS', 24);
  const minViews = getIntEnv('BROWSE_ABANDON_MIN_VIEWS', 3);
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  // Find users who viewed the same product multiple times recently (high intent).
  const rows = await RecommendationActivity.aggregate([
    { $match: { eventType: 'product_view', createdAt: { $gte: since } } },
    { $group: { _id: { userId: '$userId', productId: '$productId' }, views: { $sum: 1 }, lastViewedAt: { $max: '$createdAt' } } },
    { $match: { views: { $gte: minViews } } },
    { $sort: { lastViewedAt: -1 } },
    { $group: { _id: '$_id.userId', seeds: { $push: { productId: '$_id.productId', lastViewedAt: '$lastViewedAt', views: '$views' } } } },
    { $limit: getIntEnv('BROWSE_ABANDON_BATCH', 120) },
  ]);

  for (const r of rows as any[]) {
    const uid = String(r?._id || '');
    if (!mongoose.Types.ObjectId.isValid(uid)) continue;
    const seeds = Array.isArray(r?.seeds) ? r.seeds : [];
    const seedIds = seeds
      .map((s: any) => String(s?.productId || ''))
      .filter(mongoose.Types.ObjectId.isValid)
      .slice(0, 3)
      .map((id: string) => new mongoose.Types.ObjectId(id));
    if (!seedIds.length) continue;
    const lastViewedAt = seeds[0]?.lastViewedAt ? new Date(seeds[0].lastViewedAt) : new Date();
    try {
      await sendBrowseAbandon(uid, seedIds, lastViewedAt);
    } catch (e) {
      console.error('[browse-abandon] failed', uid, e);
    }
  }
}

let started = false;
export function startBrowseAbandonEmailWorker() {
  if (started) return;
  started = true;
  void tick();
  setInterval(() => void tick(), 30 * 60 * 1000); // every 30 min
  console.log(`[browse-abandon] worker started (${APP_NAME})`);
}

