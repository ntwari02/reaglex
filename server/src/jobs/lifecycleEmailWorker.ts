import mongoose from 'mongoose';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { User } from '../models/User';
import { generateRecommendationsForUser } from '../services/recommendationEmail.service';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { sendRecommendationDealsEmail, isEmailConfigured } from '../services/emailService';
import { getClientUrl } from '../config/publicEnv';
import { formatUsdAsCurrency } from '../utils/money';

const CLIENT_URL = getClientUrl();
const APP_NAME = process.env.APP_NAME || 'Reaglex';

function daysSince(date?: Date | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

async function isOverDailyMarketingCap(userId: string): Promise<boolean> {
  const cap = getIntEnv('DAILY_MARKETING_EMAIL_CAP', 1);
  if (cap <= 0) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await RecommendationEmailHistory.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    sentAt: { $gte: since },
  });
  return count >= cap;
}

async function sendWinback(profile: any) {
  const userId = String(profile.userId || '');
  if (!mongoose.Types.ObjectId.isValid(userId)) return;
  if (await isOverDailyMarketingCap(userId)) return;

  // Only send win-back if no activity for 30+ days and we didn't send recently.
  if (daysSince(profile.lastActivityAt) < 30) return;
  if (daysSince(profile.lastWinbackSentAt) < 14) return;

  const user = await User.findById(userId).select('fullName email notifications accountStatus preferences').lean();
  if (!user?.email) return;
  if ((user as any).accountStatus === 'banned') return;
  const promoAllowed = Boolean((user as any)?.notifications?.email?.promotions ?? true);
  if (!promoAllowed) return;

  const { products } = await generateRecommendationsForUser(userId);
  if (!products?.length) return;

  const subject = `We miss you — picks you’ll like, ${String((user as any).fullName || 'shopper').split(' ')[0]}`;
  const history = await RecommendationEmailHistory.create({
    userId,
    email: user.email,
    campaign: 'winback',
    subject,
    frequency: 'weekly',
    mode: 'mixed',
    productIds: products.map((p: any) => p._id),
    products: products.map((p: any) => ({ productId: p._id, score: Number(p.score || 0), reason: String(p.reason || 'Win-back pick') })),
    status: 'sent',
  });

  const API_URL = ((process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || CLIENT_URL) || '').replace(/\/$/, '');
  const displayCurrency = String((user as any)?.preferences?.currency || 'USD').toUpperCase();
  const emailProducts = products.map((p: any) => ({
    id: String(p._id),
    name: p.name,
    imageUrl: Array.isArray(p.images) && p.images[0]
      ? String(p.images[0]).startsWith('http')
        ? String(p.images[0])
        : `${process.env.SERVER_URL || ''}${String(p.images[0]).startsWith('/') ? p.images[0] : `/${p.images[0]}`}`
      : '',
    price: Number(p.price || 0),
    priceText: '',
    discount: Number(p.discount || 0),
    description: String(p.description || '').slice(0, 120),
    viewUrl: `${API_URL}/api/recommendation-emails/track/click/${history._id}/${p._id}`,
  }));
  for (const ep of emailProducts as any[]) {
    const conv = await formatUsdAsCurrency(Number(ep.price || 0), displayCurrency);
    ep.priceText = conv.formatted;
  }

  const sendResult = await sendRecommendationDealsEmail({
    to: user.email,
    name: String((user as any).fullName || 'there').split(' ')[0],
    subject,
    intro: 'It’s been a while — here are fresh deals and recommendations based on your interests.',
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
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: { lastWinbackSentAt: new Date() } },
  );
}

async function tick() {
  if (!isEmailConfigured()) return;
  const batch = getIntEnv('LIFECYCLE_EMAIL_BATCH', 120);

  // Dormant first (highest ROI)
  const dormant = await BuyerInsightProfile.find({
    segment: 'dormant',
  })
    .sort({ lastActivityAt: 1 })
    .limit(batch)
    .lean();

  for (const p of dormant as any[]) {
    try {
      await sendWinback(p);
    } catch (e) {
      console.error('[lifecycle-email] winback failed', String(p?.userId || ''), e);
    }
  }
}

let started = false;
export function startLifecycleEmailWorker() {
  if (started) return;
  started = true;
  void tick();
  setInterval(() => void tick(), 6 * 60 * 60 * 1000); // every 6h
  console.log(`[lifecycle-email] worker started (${APP_NAME})`);
}

