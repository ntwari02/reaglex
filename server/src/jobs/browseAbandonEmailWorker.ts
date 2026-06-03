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
const APP_NAME = process.env.APP_NAME || 'Reaglex';

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function hoursSince(date?: Date | null) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
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

async function sendBrowseAbandon(userId: string, seedIds: mongoose.Types.ObjectId[], lastViewedAt: Date): Promise<'sent' | 'skipped' | 'failed'> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 'skipped';
  const uid = new mongoose.Types.ObjectId(userId);
  if (!isEmailConfigured()) return 'skipped';

  const laneGate = await assertRecommendationLaneSend(userId, 'browse_abandon', {
    triggerAt: lastViewedAt,
  });
  if (!laneGate.ok) return 'skipped';

  if (await hasIntentAfter(uid, lastViewedAt, seedIds)) return 'skipped';

  const eligibility = await assertBuyerMarketingEligible(userId, { checkDailyCap: true });
  if (!eligibility.ok) return 'skipped';
  const user = await User.findById(uid).select('fullName email notifications accountStatus preferences').lean();
  if (!user?.email) return 'skipped';

  const gate = await getPersonalizationGate(userId);
  const maxProducts = getIntEnv('BROWSE_ABANDON_MAX_PRODUCTS', 14);

  const seedProducts = await Product.find({ _id: { $in: seedIds }, status: { $in: ['in_stock', 'low_stock'] } })
    .select('_id name price discount images description category tags')
    .lean();
  if (!seedProducts.length) return 'skipped';

  const products = await buildBrowseAbandonProducts(seedProducts, maxProducts);
  if (!products.length) return 'skipped';

  const firstName = String((user as any).fullName || 'shopper').split(' ')[0];
  const copyContext = await getRecentMarketingCopyContext(userId);
  const copy = await generateMarketingEmailCopy({
    userId,
    firstName,
    campaign: 'browse_abandon',
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
    campaign: 'browse_abandon',
    subject: copy.subject,
    frequency: 'daily',
    mode: 'mixed',
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: 0, reason: 'Browse abandon' })),
    status: 'sent',
    error: gate.allowPersonalized ? undefined : `low_confidence:${gate.confidenceScore}:${gate.confidenceReason}`,
  });

  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const { products: emailProducts } = await buildMarketingEmailContent({
    userId,
    firstName,
    campaign: 'browse_abandon',
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
    { $set: { lastBrowseAbandonSentAt: new Date() } },
    { upsert: true },
  );

  if (await isMarketingFlowPushEnabled('browse_abandon')) {
    const firstSeed = (seedProducts as any[])[0];
    void safeSendPushToUser(uid, {
      title: 'Still thinking about it?',
      body: firstSeed?.name
        ? `${String(firstSeed.name).slice(0, 80)} — your size & deal are still available.`
        : `Take another look at items you viewed recently.`,
      category: 'browse_abandon',
      data: { campaign: 'browse_abandon', historyId: String(history._id) },
      url: firstSeed?._id ? `/products/${String(firstSeed._id)}` : `/`,
    });
  }

  return 'sent';
}

async function tick(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  if (!isEmailConfigured()) return stats;
  const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('recommendation_emails'))) return stats;
  if (!(await isMarketingFlowEnabled('browse_abandon'))) return stats;

  const windowHours = getIntEnv('BROWSE_ABANDON_WINDOW_HOURS', 24);
  const minViews = getIntEnv('BROWSE_ABANDON_MIN_VIEWS', 3);
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

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
    if (!seedIds.length) {
      stats.skipped += 1;
      continue;
    }
    const lastViewedAt = seeds[0]?.lastViewedAt ? new Date(seeds[0].lastViewedAt) : new Date();
    try {
      const outcome = await sendBrowseAbandon(uid, seedIds, lastViewedAt);
      if (outcome === 'sent') stats.sent += 1;
      else if (outcome === 'failed') stats.failed += 1;
      else stats.skipped += 1;
    } catch (e) {
      stats.failed += 1;
      console.error('[browse-abandon] failed', uid, e);
    }
  }
  return stats;
}

export async function runBrowseAbandonOnce(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = await tick();
  await recordFlowRun('browse_abandon', stats);
  return stats;
}

let started = false;
export function startBrowseAbandonEmailWorker() {
  if (started) return;
  started = true;
  void runBrowseAbandonOnce();
  setInterval(() => void runBrowseAbandonOnce(), 30 * 60 * 1000);
  console.log(`[browse-abandon] worker started (${APP_NAME})`);
}

