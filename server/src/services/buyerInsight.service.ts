import mongoose from 'mongoose';
import { BuyerInsightProfile, type BuyerSegment } from '../models/BuyerInsightProfile';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { AbandonedCart } from '../models/AbandonedCart';
import { Product } from '../models/Product';

function daysSince(date?: Date | null): number {
  if (!date) return Number.MAX_SAFE_INTEGER;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

function detectDeviceType(userAgent: string): 'mobile' | 'desktop' | 'unknown' {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (ua.includes('android') || ua.includes('iphone') || ua.includes('mobile')) return 'mobile';
  if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) return 'desktop';
  return 'unknown';
}

function bumpHour(hist: number[], d: Date, add = 1) {
  const h = new Date(d).getUTCHours();
  if (!Number.isFinite(h) || h < 0 || h > 23) return;
  hist[h] = (hist[h] || 0) + add;
}

function mergeAffinity(
  curr: Record<string, number>,
  key: string,
  delta: number,
  maxKeys = 50,
) {
  const k = String(key || '').trim();
  if (!k) return;
  curr[k] = (curr[k] || 0) + delta;
  // Keep map bounded: prune lowest weights
  const entries = Object.entries(curr);
  if (entries.length <= maxKeys) return;
  entries.sort((a, b) => a[1] - b[1]);
  const remove = entries.slice(0, Math.max(0, entries.length - maxKeys));
  for (const [rk] of remove) delete curr[rk];
}

function median(nums: number[]) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function segmentFrom(profile: {
  signupAt?: Date;
  lastActivityAt?: Date;
  orderCount: number;
  totalSpendUsd: number;
  avgOrderValueUsd: number;
}): { segment: BuyerSegment; score: number } {
  const sinceSignup = daysSince(profile.signupAt || null);
  const sinceActive = daysSince(profile.lastActivityAt || null);

  // Simple score: recent activity + spend + order frequency proxy
  let score = 0;
  if (sinceActive <= 3) score += 30;
  else if (sinceActive <= 7) score += 22;
  else if (sinceActive <= 14) score += 14;
  else if (sinceActive <= 30) score += 8;

  score += Math.min(40, Math.log10(1 + Math.max(0, profile.totalSpendUsd)) * 18);
  score += Math.min(20, profile.orderCount * 2);
  score += Math.min(10, Math.log10(1 + Math.max(0, profile.avgOrderValueUsd)) * 6);

  // Segment rules
  const isVip = profile.totalSpendUsd >= 250 || profile.orderCount >= 6 || profile.avgOrderValueUsd >= 120;
  if (isVip) return { segment: 'vip', score: Math.round(score + 20) };

  if (sinceSignup <= 7 && profile.orderCount === 0) return { segment: 'new', score: Math.round(score + 5) };
  if (sinceActive <= 14) return { segment: 'active', score: Math.round(score) };
  if (sinceActive <= 30) return { segment: 'at_risk', score: Math.round(score) };
  return { segment: 'dormant', score: Math.round(score) };
}

function computeConfidence(input: {
  lastActivityAt?: Date;
  lastViewedCount: number;
  lastCartCount: number;
  wishlistCount: number;
  categoryAffinity: Record<string, number>;
  tagAffinity: Record<string, number>;
  emailOpens90d: number;
  emailClicks90d: number;
  orderCount: number;
}): { confidenceScore: number; confidenceReason: string } {
  const sinceActive = daysSince(input.lastActivityAt || null);
  let score = 0;
  const reasons: string[] = [];

  // Recency (strongest)
  if (sinceActive <= 1) { score += 35; reasons.push('active_today'); }
  else if (sinceActive <= 3) { score += 28; reasons.push('active_recent'); }
  else if (sinceActive <= 7) { score += 18; reasons.push('active_week'); }
  else if (sinceActive <= 14) { score += 10; reasons.push('active_2w'); }

  // Intent signals
  if (input.lastCartCount >= 1) { score += 22; reasons.push('cart_intent'); }
  if (input.wishlistCount >= 1) { score += 10; reasons.push('wishlist_signal'); }
  if (input.lastViewedCount >= 5) { score += 12; reasons.push('browse_volume'); }
  else if (input.lastViewedCount >= 1) { score += 6; reasons.push('browse_some'); }

  // Preference strength (do we know their categories/tags?)
  const catKeys = Object.keys(input.categoryAffinity || {});
  const tagKeys = Object.keys(input.tagAffinity || {});
  if (catKeys.length >= 3) { score += 10; reasons.push('category_profile'); }
  else if (catKeys.length >= 1) { score += 6; reasons.push('some_categories'); }
  if (tagKeys.length >= 5) { score += 6; reasons.push('tag_profile'); }

  // Engagement
  if (input.emailClicks90d >= 2) { score += 10; reasons.push('email_clicker'); }
  else if (input.emailOpens90d >= 2) { score += 6; reasons.push('email_opener'); }

  // Purchases make signals more reliable
  if (input.orderCount >= 1) { score += 6; reasons.push('buyer'); }

  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  const reason = reasons.slice(0, 6).join(',');
  return { confidenceScore: bounded, confidenceReason: reason || 'low_signal' };
}

export async function upsertBuyerInsightProfile(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const uid = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(uid).select('email createdAt security loginHistory preferences').lean() as any;
  if (!user?.email) return null;

  // Login patterns from user.security.loginHistory (already maintained by authController)
  const loginHistory = Array.isArray(user?.security?.loginHistory) ? user.security.loginHistory : [];
  const lastLoginAt = loginHistory[0]?.date ? new Date(loginHistory[0].date) : undefined;
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const loginCount30d = loginHistory.filter((x: any) => x?.date && new Date(x.date) >= since30d).length;
  const lastKnownIp = loginHistory[0]?.ip ? String(loginHistory[0].ip) : undefined;
  const lastKnownUserAgent = loginHistory[0]?.userAgent ? String(loginHistory[0].userAgent) : undefined;
  const deviceType = detectDeviceType(lastKnownUserAgent || '');

  // Orders (purchase history) — use currencySnapshot.totalUsd if present
  const orders = await Order.find({
    buyerId: uid as any,
    status: { $in: ['pending', 'processing', 'packed', 'shipped', 'delivered'] },
  } as any)
    .select('total currencySnapshot.totalUsd createdAt shippingAddress.country shippingAddress.city')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  let totalSpendUsd = 0;
  for (const o of orders as any[]) totalSpendUsd += Number(o?.currencySnapshot?.totalUsd ?? o?.total ?? 0) || 0;
  const orderCount = orders.length;
  const avgOrderValueUsd = orderCount ? totalSpendUsd / orderCount : 0;
  const lastOrderAt = orders[0]?.createdAt ? new Date(orders[0].createdAt) : undefined;
  const lastKnownCountry = orders[0]?.shippingAddress?.country ? String(orders[0].shippingAddress.country) : undefined;
  const lastKnownCity = orders[0]?.shippingAddress?.city ? String(orders[0].shippingAddress.city) : undefined;

  // Email engagement (opens/clicks) from RecommendationEmailHistory
  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const engagementAgg = await RecommendationEmailHistory.aggregate([
    { $match: { userId: uid, sentAt: { $gte: since90d } } },
    {
      $group: {
        _id: '$userId',
        opens: { $sum: '$opens' },
        clicks: { $sum: '$clicks' },
        lastOpenAt: { $max: '$openedAt' },
        lastClickAt: { $max: '$clickedAt' },
      },
    },
  ]);
  const engagement = engagementAgg?.[0] || {};

  // Behavioral signals from RecommendationActivity
  const since45d = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
  const events = await RecommendationActivity.find({ userId: uid, createdAt: { $gte: since45d } })
    .select('eventType productId category tags createdAt meta')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  const categoryAffinity: Record<string, number> = {};
  const tagAffinity: Record<string, number> = {};
  let discountAffinity = 0;
  const lastViewedProductIds: string[] = [];
  const lastCartProductIds: string[] = [];
  const wishlistProductIds: string[] = [];
  let lastActivityAt: Date | undefined;
  const activeHoursUtc = Array.from({ length: 24 }).map(() => 0);

  const cartState = new Map<string, { lastType: string; at: Date }>();

  for (const e of events as any[]) {
    const type = String(e?.eventType || '');
    const at = e?.createdAt ? new Date(e.createdAt) : new Date();
    if (!lastActivityAt) lastActivityAt = at;
    bumpHour(activeHoursUtc, at, 1);

    const pid = e?.productId ? String(e.productId) : '';
    const cat = String(e?.category || '').trim();
    const tags = Array.isArray(e?.tags) ? e.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];

    let w = 0;
    if (type === 'purchase') w = 10;
    else if (type === 'cart_add') w = 5;
    else if (type === 'wishlist_add') w = 4;
    else if (type === 'product_view') w = 2;
    else if (type === 'category_interaction' || type === 'tag_interaction') w = 1;
    else if (type === 'cart_remove' || type === 'wishlist_remove') w = -1;

    if (cat) mergeAffinity(categoryAffinity, cat, w);
    for (const t of tags) mergeAffinity(tagAffinity, t, w);

    if (type === 'product_view' && pid && lastViewedProductIds.length < 30) lastViewedProductIds.push(pid);
    if (type === 'wishlist_add' && pid && wishlistProductIds.length < 30) wishlistProductIds.push(pid);

    if ((type === 'cart_add' || type === 'cart_remove') && pid) {
      cartState.set(pid, { lastType: type, at });
    }
  }

  // Current cart snapshot from latest cart_add/remove
  const cartSorted = [...cartState.entries()].sort((a, b) => b[1].at.getTime() - a[1].at.getTime());
  for (const [pid, v] of cartSorted) {
    if (lastCartProductIds.length >= 24) break;
    if (v.lastType === 'cart_add') lastCartProductIds.push(pid);
  }

  // Discount affinity + price preference from last touched products
  const priceSampleIds = [...new Set([...lastViewedProductIds.slice(0, 20), ...lastCartProductIds.slice(0, 20), ...wishlistProductIds.slice(0, 20)])]
    .filter(mongoose.Types.ObjectId.isValid)
    .slice(0, 50)
    .map((id) => new mongoose.Types.ObjectId(id));

  const pricePoints: number[] = [];
  if (priceSampleIds.length) {
    const prods = await Product.find({ _id: { $in: priceSampleIds } })
      .select('price discount')
      .lean();
    for (const p of prods as any[]) {
      const pr = Number(p?.price ?? 0);
      if (Number.isFinite(pr) && pr > 0) pricePoints.push(pr);
      const d = Number(p?.discount ?? 0);
      if (d > 0) discountAffinity += Math.min(3, d / 20);
    }
  }

  // Abandoned cart count (30d)
  const abandonedCartCount30d = await AbandonedCart.countDocuments({
    userId: uid,
    recovered: false,
    abandonedAt: { $gte: since30d },
  });

  const { segment, score } = segmentFrom({
    signupAt: user.createdAt ? new Date(user.createdAt) : undefined,
    lastActivityAt,
    orderCount,
    totalSpendUsd,
    avgOrderValueUsd,
  });

  const pricePreferenceUsd =
    pricePoints.length >= 5
      ? {
          min: Math.min(...pricePoints),
          max: Math.max(...pricePoints),
          median: median(pricePoints),
        }
      : undefined;

  const conf = computeConfidence({
    lastActivityAt,
    lastViewedCount: lastViewedProductIds.length,
    lastCartCount: lastCartProductIds.length,
    wishlistCount: wishlistProductIds.length,
    categoryAffinity,
    tagAffinity,
    emailOpens90d: Number(engagement.opens || 0),
    emailClicks90d: Number(engagement.clicks || 0),
    orderCount,
  });

  const doc = await BuyerInsightProfile.findOneAndUpdate(
    { userId: uid },
    {
      $setOnInsert: {
        userId: uid,
      },
      $set: {
        email: String(user.email).toLowerCase(),
        signupAt: user.createdAt ? new Date(user.createdAt) : undefined,
        lastLoginAt,
        loginCount30d,
        orderCount,
        totalSpendUsd,
        avgOrderValueUsd,
        lastOrderAt,
        lastActivityAt,
        lastViewedProductIds,
        lastCartProductIds,
        wishlistProductIds,
        abandonedCartCount30d,
        emailOpens90d: Number(engagement.opens || 0),
        emailClicks90d: Number(engagement.clicks || 0),
        lastEmailOpenAt: engagement.lastOpenAt ? new Date(engagement.lastOpenAt) : undefined,
        lastEmailClickAt: engagement.lastClickAt ? new Date(engagement.lastClickAt) : undefined,
        lastKnownCountry,
        lastKnownCity,
        lastKnownIp,
        lastKnownUserAgent,
        deviceType,
        activeHoursUtc,
        categoryAffinity,
        tagAffinity,
        discountAffinity,
        pricePreferenceUsd,
        segment,
        score,
        confidenceScore: conf.confidenceScore,
        confidenceReason: conf.confidenceReason,
      },
    },
    { upsert: true, new: true },
  );

  return doc;
}

export async function upsertBuyerInsightProfilesBatch(limit = 200) {
  const users = await User.find({ role: 'buyer', accountStatus: { $ne: 'banned' } })
    .select('_id')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  for (const u of users as any[]) {
    try {
      await upsertBuyerInsightProfile(String(u._id));
    } catch (e) {
      console.error('[buyer-insight] profile update failed', String(u._id), e);
    }
  }
}

