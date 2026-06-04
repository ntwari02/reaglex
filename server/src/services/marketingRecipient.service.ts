import mongoose from 'mongoose';
import { User } from '../models/User';
import { RecommendationEmailPreference } from '../models/RecommendationEmailPreference';
import { getDailyMarketingEmailCap } from '../models/MarketingAutomationSettings';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';

export type MarketingEligibilityReason =
  | 'ok'
  | 'no_user'
  | 'not_buyer'
  | 'banned'
  | 'inactive'
  | 'no_email'
  | 'promotions_off'
  | 'unsubscribed'
  | 'suppressed'
  | 'daily_cap';

export interface MarketingEligibility {
  ok: boolean;
  reason: MarketingEligibilityReason;
  user?: {
    _id: mongoose.Types.ObjectId;
    email: string;
    fullName?: string;
    role: string;
    preferences?: Record<string, unknown>;
    notifications?: Record<string, unknown>;
  };
}

const ACTIVE_STATUSES = new Set(['active', 'warned', undefined, null, '']);

/**
 * Buyer-only gate for recommendation emails, cart recovery, cart pulse, browse abandon, winback.
 * Sellers and admins must never receive buyer marketing lanes.
 */
export async function assertBuyerMarketingEligible(
  userId: string,
  opts?: { checkDailyCap?: boolean; requirePreferenceEnabled?: boolean },
): Promise<MarketingEligibility> {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { ok: false, reason: 'no_user' };
  }

  const user = await User.findById(userId)
    .select('email fullName role accountStatus notifications preferences')
    .lean();

  if (!user) return { ok: false, reason: 'no_user' };
  if (String(user.role || '').toLowerCase() !== 'buyer') {
    return { ok: false, reason: 'not_buyer' };
  }
  if ((user as { accountStatus?: string }).accountStatus === 'banned') {
    return { ok: false, reason: 'banned' };
  }
  const status = (user as { accountStatus?: string }).accountStatus;
  if (status && !ACTIVE_STATUSES.has(status)) {
    return { ok: false, reason: 'inactive' };
  }
  if (!user.email) return { ok: false, reason: 'no_email' };

  const promo = Boolean((user as { notifications?: { email?: { promotions?: boolean } } }).notifications?.email?.promotions ?? true);
  if (!promo) return { ok: false, reason: 'promotions_off' };

  if (opts?.requirePreferenceEnabled) {
    const pref = await RecommendationEmailPreference.findOne({ userId }).select('enabled unsubscribed suppressed').lean();
    if (pref?.unsubscribed || pref?.suppressed) return { ok: false, reason: 'unsubscribed' };
    if (pref && pref.enabled === false) return { ok: false, reason: 'unsubscribed' };
  }

  if (opts?.checkDailyCap) {
    const cap = await getDailyMarketingEmailCap();
    if (cap > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await RecommendationEmailHistory.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'sent',
        sentAt: { $gte: since },
      });
      if (count >= cap) return { ok: false, reason: 'daily_cap' };
    }
  }

  return {
    ok: true,
    reason: 'ok',
    user: user as MarketingEligibility['user'],
  };
}

export async function filterBuyerUserIds(userIds: string[]): Promise<string[]> {
  const valid = userIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!valid.length) return [];
  const rows = await User.find({
    _id: { $in: valid.map((id) => new mongoose.Types.ObjectId(id)) },
    role: 'buyer',
    accountStatus: { $ne: 'banned' },
  })
    .select('_id')
    .lean();
  return rows.map((r) => String(r._id));
}
