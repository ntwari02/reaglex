/**
 * Per-buyer recommendation email scheduling from profile + activity (not one shared batch time).
 */
import mongoose from 'mongoose';
import { RecommendationActivity } from '../models/RecommendationActivity';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import { RecommendationEmailPreference } from '../models/RecommendationEmailPreference';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { getDailyMarketingEmailCap } from '../models/MarketingAutomationSettings';
import type { BuyerSegment } from '../models/BuyerInsightProfile';

export const RECOMMENDATION_LANE_CAMPAIGNS = [
  'recommendation',
  'cart_pulse',
  'browse_abandon',
  'winback',
] as const;

export type RecommendationLaneCampaign = (typeof RECOMMENDATION_LANE_CAMPAIGNS)[number];

export type BuyerMarketingActivityTier = 'cold' | 'warm' | 'hot' | 'on_fire';

export type BuyerMarketingProfile = {
  userId: string;
  tier: BuyerMarketingActivityTier;
  segment: BuyerSegment | 'unknown';
  activeHoursUtc: number[];
  events7d: number;
};

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

const since24h = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

export function activityTierFromEventCount(events: number): BuyerMarketingActivityTier {
  if (events >= 40) return 'on_fire';
  if (events >= 16) return 'hot';
  if (events >= 3) return 'warm';
  return 'cold';
}

export async function getBuyerMarketingActivityTier(userId: string): Promise<BuyerMarketingActivityTier> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const events = await RecommendationActivity.countDocuments({
    userId,
    createdAt: { $gte: since },
  });
  return activityTierFromEventCount(events);
}

export async function loadBuyerMarketingProfile(userId: string): Promise<BuyerMarketingProfile> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [events7d, insight] = await Promise.all([
    RecommendationActivity.countDocuments({ userId, createdAt: { $gte: since } }),
    BuyerInsightProfile.findOne({ userId }).select('segment activeHoursUtc').lean(),
  ]);

  const hist = (insight as any)?.activeHoursUtc;
  const activeHoursUtc =
    Array.isArray(hist) && hist.length === 24
      ? hist.map((n: unknown) => Math.max(0, Number(n) || 0))
      : Array.from({ length: 24 }, () => 0);

  return {
    userId,
    tier: activityTierFromEventCount(events7d),
    segment: ((insight as any)?.segment as BuyerSegment) || 'unknown',
    activeHoursUtc,
    events7d,
  };
}

export async function countMarketingEmailsToday(userId: string): Promise<number> {
  return RecommendationEmailHistory.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    sentAt: { $gte: since24h() },
  });
}

export async function countRecommendationLaneEmailsToday(userId: string): Promise<number> {
  return RecommendationEmailHistory.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    sentAt: { $gte: since24h() },
    campaign: { $in: [...RECOMMENDATION_LANE_CAMPAIGNS] },
  });
}

/**
 * How many recommendation-lane emails this buyer should get per 24h from activity + segment.
 * Warm+ always at least 2; very active buyers can get 3–4 (capped, not unlimited).
 */
export async function getDailyRecommendationEmailQuota(
  userId: string,
  profile?: BuyerMarketingProfile,
): Promise<number> {
  const globalCap = await getDailyMarketingEmailCap();
  const maxLane = getIntEnv('RECOMMENDATION_DAILY_MAX', 4);
  const minLane = getIntEnv('RECOMMENDATION_DAILY_MIN', 2);

  const p = profile || (await loadBuyerMarketingProfile(userId));
  const { tier, segment } = p;

  let target = 1;
  if (tier === 'on_fire') target = 4;
  else if (tier === 'hot') target = 3;
  else if (tier === 'warm') target = minLane;
  else target = 1;

  if (segment === 'vip' && target < maxLane) target += 1;
  if (segment === 'dormant') target = Math.min(target, 1);

  target = Math.min(target, maxLane);
  if (globalCap > 0) target = Math.min(target, globalCap);
  return Math.max(0, target);
}

/** Pick send hours from buyer activeHoursUtc histogram; unique per user + day. */
export function computeProfileSendSlotHours(
  profile: BuyerMarketingProfile,
  quota: number,
  dayKey = utcDayKey(),
): number[] {
  const n = Math.max(1, Math.min(quota, 6));
  const minSpacing = Math.max(3, Math.floor(20 / n));
  const hist = profile.activeHoursUtc;
  const ranked = hist
    .map((w, h) => ({ h, w }))
    .sort((a, b) => b.w - a.w);

  const picked: number[] = [];
  const hasActivity = ranked.some((r) => r.w > 0);

  if (hasActivity) {
    for (const { h } of ranked) {
      if (picked.length >= n) break;
      const tooClose = picked.some(
        (p) => Math.min(Math.abs(p - h), 24 - Math.abs(p - h)) < minSpacing,
      );
      if (!tooClose) picked.push(h);
    }
  }

  const base = hashSeed(`${profile.userId}:${dayKey}:base`) % 24;
  while (picked.length < n) {
    const h = (base + picked.length * minSpacing + 9) % 24;
    if (!picked.includes(h)) picked.push(h);
    else picked.push((h + 5) % 24);
  }

  const rotate = hashSeed(`${profile.userId}:${dayKey}:rot`) % 24;
  return picked.map((h) => (h + rotate) % 24).sort((a, b) => a - b);
}

/** Per-user minute offset so buyers at the same UTC hour do not send at :00 together. */
export function profileSlotMinuteOffset(userId: string, slotIndex: number, dayKey = utcDayKey()): number {
  return hashSeed(`${userId}:${dayKey}:slot${slotIndex}`) % 50;
}

export function isProfileInSendWindow(
  profile: BuyerMarketingProfile,
  slotIndex: number,
  quota: number,
  now = new Date(),
  toleranceMinutes = 35,
): boolean {
  const hours = computeProfileSendSlotHours(profile, quota);
  const slotHour = hours[Math.min(slotIndex, hours.length - 1)] ?? hours[0] ?? 12;
  const slotMinute = profileSlotMinuteOffset(profile.userId, slotIndex);
  const slotTotal = slotHour * 60 + slotMinute;
  const nowTotal = now.getUTCHours() * 60 + now.getUTCMinutes();
  const diff = Math.min(Math.abs(nowTotal - slotTotal), 24 * 60 - Math.abs(nowTotal - slotTotal));
  return diff <= toleranceMinutes;
}

function hoursSince(date?: Date | null): number {
  if (!date) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

export async function getRecentMarketingCopyContext(userId: string, limit = 6) {
  const rows = await RecommendationEmailHistory.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    campaign: { $in: [...RECOMMENDATION_LANE_CAMPAIGNS] },
  })
    .sort({ sentAt: -1 })
    .limit(limit)
    .select('subject campaign sentAt')
    .lean();

  const subjects: string[] = [];
  const campaigns: string[] = [];
  for (const r of rows as any[]) {
    const sub = String(r?.subject || '').trim();
    if (sub) subjects.push(sub);
    if (r?.campaign) campaigns.push(String(r.campaign));
  }
  return { subjects, campaigns };
}

export type RecommendationLaneGateResult =
  | { ok: true; slotIndex: number; quota: number; tier: BuyerMarketingActivityTier; profile: BuyerMarketingProfile }
  | { ok: false; reason: string };

/**
 * Buyers whose personal send window is open right now (worker only processes these).
 */
export async function listBuyersInRecommendationSendWindow(
  limit = 120,
  now = new Date(),
): Promise<string[]> {
  const overfetch = Math.min(limit * 8, 2000);
  const prefs = await RecommendationEmailPreference.find({
    enabled: { $ne: false },
    unsubscribed: { $ne: true },
    suppressed: { $ne: true },
  })
    .select('userId')
    .limit(overfetch)
    .lean();

  if (!prefs.length) return [];

  const userIds = prefs
    .map((p) => String((p as any).userId || ''))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [activityAgg, insights, laneSentAgg] = await Promise.all([
    RecommendationActivity.aggregate([
      { $match: { userId: { $in: objectIds }, createdAt: { $gte: since7d } } },
      { $group: { _id: '$userId', c: { $sum: 1 } } },
    ]),
    BuyerInsightProfile.find({ userId: { $in: objectIds } })
      .select('userId segment activeHoursUtc')
      .lean(),
    RecommendationEmailHistory.aggregate([
      {
        $match: {
          userId: { $in: objectIds },
          status: 'sent',
          sentAt: { $gte: since24h() },
          campaign: { $in: [...RECOMMENDATION_LANE_CAMPAIGNS] },
        },
      },
      { $group: { _id: '$userId', c: { $sum: 1 } } },
    ]),
  ]);

  const eventsByUser = new Map(activityAgg.map((r: any) => [String(r._id), Number(r.c) || 0]));
  const insightByUser = new Map(insights.map((r: any) => [String(r.userId), r]));
  const laneSentByUser = new Map(laneSentAgg.map((r: any) => [String(r._id), Number(r.c) || 0]));

  const globalCap = await getDailyMarketingEmailCap();
  const due: string[] = [];

  for (const uid of userIds) {
    if (due.length >= limit) break;

    const insight = insightByUser.get(uid);
    const events7d = eventsByUser.get(uid) || 0;
    const hist = (insight as any)?.activeHoursUtc;
    const profile: BuyerMarketingProfile = {
      userId: uid,
      tier: activityTierFromEventCount(events7d),
      segment: ((insight as any)?.segment as BuyerSegment) || 'unknown',
      activeHoursUtc:
        Array.isArray(hist) && hist.length === 24
          ? hist.map((n: unknown) => Math.max(0, Number(n) || 0))
          : Array.from({ length: 24 }, () => 0),
      events7d,
    };

    let quota = recommendationQuotaFromProfile(profile);
    if (globalCap > 0) quota = Math.min(quota, globalCap);
    if (quota < 1) continue;

    const laneToday = laneSentByUser.get(uid) || 0;
    if (laneToday >= quota) continue;

    if (!isProfileInSendWindow(profile, laneToday, quota, now)) continue;

    due.push(uid);
  }

  return due;
}

/** Sync quota from profile (no extra DB). */
export function recommendationQuotaFromProfile(profile: BuyerMarketingProfile): number {
  const maxLane = getIntEnv('RECOMMENDATION_DAILY_MAX', 4);
  const minLane = getIntEnv('RECOMMENDATION_DAILY_MIN', 2);
  let target = 1;
  if (profile.tier === 'on_fire') target = 4;
  else if (profile.tier === 'hot') target = 3;
  else if (profile.tier === 'warm') target = minLane;
  if (profile.segment === 'vip' && target < maxLane) target += 1;
  if (profile.segment === 'dormant') target = Math.min(target, 1);
  return Math.min(target, maxLane);
}

/**
 * Behavioral lanes may send slightly outside the slot if the trigger is fresh and near a peak hour.
 */
export async function isNearBuyerPeakActivity(
  profile: BuyerMarketingProfile,
  now = new Date(),
): Promise<boolean> {
  const ranked = profile.activeHoursUtc
    .map((w, h) => ({ h, w }))
    .sort((a, b) => b.w - a.w);
  if (!ranked[0]?.w) return false;
  const peak = ranked[0].h;
  const diff = Math.min(Math.abs(now.getUTCHours() - peak), 24 - Math.abs(now.getUTCHours() - peak));
  return diff <= 1;
}

export async function assertRecommendationLaneSend(
  userId: string,
  campaign: RecommendationLaneCampaign,
  opts?: { skipSendWindow?: boolean; triggerAt?: Date },
): Promise<RecommendationLaneGateResult> {
  const globalCap = await getDailyMarketingEmailCap();
  const totalToday = await countMarketingEmailsToday(userId);
  if (globalCap > 0 && totalToday >= globalCap) {
    return { ok: false, reason: 'daily_cap' };
  }

  const profile = await loadBuyerMarketingProfile(userId);
  const quota = await getDailyRecommendationEmailQuota(userId, profile);
  const laneToday = await countRecommendationLaneEmailsToday(userId);

  if (laneToday >= quota) {
    return { ok: false, reason: 'lane_quota_met' };
  }

  const minGapHours = getIntEnv('RECOMMENDATION_EMAIL_MIN_GAP_HOURS', 3);
  const lastLane = await RecommendationEmailHistory.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    campaign: { $in: [...RECOMMENDATION_LANE_CAMPAIGNS] },
  })
    .sort({ sentAt: -1 })
    .select('sentAt campaign')
    .lean();
  if (lastLane?.sentAt && hoursSince(lastLane.sentAt) < minGapHours) {
    return { ok: false, reason: 'min_gap' };
  }

  const lastSame = await RecommendationEmailHistory.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'sent',
    campaign,
  })
    .sort({ sentAt: -1 })
    .select('sentAt')
    .lean();

  const campaignCooldownHours: Record<RecommendationLaneCampaign, number> = {
    recommendation: profile.tier === 'cold' ? 24 * 7 : 20,
    cart_pulse: getIntEnv('CART_PULSE_COOLDOWN_HOURS', 3),
    browse_abandon: getIntEnv('BROWSE_ABANDON_COOLDOWN_HOURS', 6),
    winback: 24 * 7,
  };
  if (lastSame?.sentAt && hoursSince(lastSame.sentAt) < campaignCooldownHours[campaign]) {
    return { ok: false, reason: 'campaign_cooldown' };
  }

  const slotIndex = laneToday;
  if (!opts?.skipSendWindow && quota > 0) {
    const inSlot = isProfileInSendWindow(profile, slotIndex, quota);
    const triggerFresh = opts?.triggerAt && hoursSince(opts.triggerAt) < 3;
    const nearPeak = triggerFresh ? await isNearBuyerPeakActivity(profile) : false;
    if (!inSlot && !nearPeak) {
      return { ok: false, reason: 'outside_send_window' };
    }
  }

  return { ok: true, slotIndex, quota, tier: profile.tier, profile };
}

/** @deprecated Use isProfileInSendWindow — kept for compatibility */
export function isInSendWindow(
  userId: string,
  slotIndex: number,
  quota: number,
  toleranceHours = 1,
  now = new Date(),
): boolean {
  const profile: BuyerMarketingProfile = {
    userId,
    tier: 'warm',
    segment: 'unknown',
    activeHoursUtc: Array.from({ length: 24 }, () => 0),
    events7d: 0,
  };
  return isProfileInSendWindow(profile, slotIndex, quota, now, toleranceHours * 60);
}

export function getSendSlotHoursUtc(userId: string, quota: number, dayKey = utcDayKey()): number[] {
  const profile: BuyerMarketingProfile = {
    userId,
    tier: 'warm',
    segment: 'unknown',
    activeHoursUtc: Array.from({ length: 24 }, () => 0),
    events7d: 0,
  };
  return computeProfileSendSlotHours(profile, quota, dayKey);
}
