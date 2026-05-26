import mongoose from 'mongoose';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { User } from '../models/User';
import { generateRecommendationsForUser } from '../services/recommendationEmail.service';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { generateMarketingEmailCopy } from '../email/emailCopyAi.service';
import { buildMarketingEmailContent } from '../email/marketingEmailBuilder';
import { sendRecommendationDealsEmail, isEmailConfigured } from '../services/emailService';
import { getClientUrl } from '../config/publicEnv';
import {
  getDailyMarketingEmailCap,
  isMarketingFlowEnabled,
  isMarketingFlowPushEnabled,
  recordFlowRun,
} from '../models/MarketingAutomationSettings';
import { safeSendPushToUser } from '../services/pushNotificationService';
import { assertBuyerMarketingEligible } from '../services/marketingRecipient.service';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Reaglex';

function daysSince(date?: Date | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
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

async function sendWinback(profile: any): Promise<'sent' | 'skipped' | 'failed'> {
  const userId = String(profile.userId || '');
  if (!mongoose.Types.ObjectId.isValid(userId)) return 'skipped';
  if (await isOverDailyMarketingCap(userId)) return 'skipped';

  if (daysSince(profile.lastActivityAt) < 30) return 'skipped';
  if (daysSince(profile.lastWinbackSentAt) < 14) return 'skipped';

  const gate = await assertBuyerMarketingEligible(userId, { checkDailyCap: true });
  if (!gate.ok) return 'skipped';
  const user = await User.findById(userId).select('fullName email notifications accountStatus preferences').lean();
  if (!user?.email) return 'skipped';

  const { products } = await generateRecommendationsForUser(userId);
  if (!products?.length) return 'skipped';

  const firstName = String((user as any).fullName || 'shopper').split(' ')[0];
  const copy = await generateMarketingEmailCopy({
    userId,
    firstName,
    campaign: 'winback',
    mode: 'mixed',
    allowPersonalized: true,
    products: products.map((p: any) => ({
      id: String(p._id),
      name: String(p.name || ''),
      reason: String(p.reason || ''),
      discount: Number(p.discount || 0),
    })),
  });
  const history = await RecommendationEmailHistory.create({
    userId,
    email: user.email,
    campaign: 'winback',
    subject: copy.subject,
    frequency: 'weekly',
    mode: 'mixed',
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: Number(p.score || 0), reason: String(p.reason || 'Win-back pick') })),
    status: 'sent',
  });

  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const { products: emailProducts } = await buildMarketingEmailContent({
    userId,
    firstName,
    campaign: 'winback',
    mode: 'mixed',
    allowPersonalized: true,
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
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: { lastWinbackSentAt: new Date() } },
  );

  if (await isMarketingFlowPushEnabled('winback')) {
    void safeSendPushToUser(userId, {
      title: 'We miss you',
      body: `Fresh picks just for you${(user as any).fullName ? ', ' + String((user as any).fullName).split(' ')[0] : ''}.`,
      category: 'winback',
      data: { campaign: 'winback', historyId: String(history._id) },
      url: `/recommendations`,
    });
  }

  return 'sent';
}

async function tick(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  if (!isEmailConfigured()) return stats;
  if (!(await isMarketingFlowEnabled('winback'))) return stats;
  const batch = getIntEnv('LIFECYCLE_EMAIL_BATCH', 120);

  const dormant = await BuyerInsightProfile.find({
    segment: 'dormant',
  })
    .sort({ lastActivityAt: 1 })
    .limit(batch)
    .lean();

  for (const p of dormant as any[]) {
    try {
      const outcome = await sendWinback(p);
      if (outcome === 'sent') stats.sent += 1;
      else if (outcome === 'failed') stats.failed += 1;
      else stats.skipped += 1;
    } catch (e) {
      stats.failed += 1;
      console.error('[lifecycle-email] winback failed', String(p?.userId || ''), e);
    }
  }
  return stats;
}

export async function runWinbackOnce(): Promise<{ sent: number; skipped: number; failed: number }> {
  const stats = await tick();
  await recordFlowRun('winback', stats);
  return stats;
}

let started = false;
export function startLifecycleEmailWorker() {
  if (started) return;
  started = true;
  void runWinbackOnce();
  setInterval(() => void runWinbackOnce(), 6 * 60 * 60 * 1000);
  console.log(`[lifecycle-email] worker started (${APP_NAME})`);
}

