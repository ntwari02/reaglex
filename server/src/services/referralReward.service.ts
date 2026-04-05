import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { ReferralSettings } from '../models/ReferralSettings';
import { MarketingReferralReward } from '../models/MarketingReferralReward';
import { createSystemInboxAndFanout } from './systemInboxFanout';

const CODE_PREFIX = 'RX';
const CODE_RANDOM_LEN = 8;

export async function isReferralProgramEnabled(): Promise<boolean> {
  try {
    const s = await ReferralSettings.findOne().select('programEnabled').lean();
    if (!s) return true;
    return (s as { programEnabled?: boolean }).programEnabled !== false;
  } catch {
    return true;
  }
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const part = crypto.randomBytes(CODE_RANDOM_LEN).toString('hex').slice(0, CODE_RANDOM_LEN).toUpperCase();
    const code = `${CODE_PREFIX}-${part}`;
    const taken = await User.findOne({ referralCode: code }).select('_id').lean();
    if (!taken) return code;
  }
  throw new Error('Could not allocate referral code');
}

/** Assign a shareable code to a user (idempotent if already set). */
export async function ensureReferralCodeForUser(userId: mongoose.Types.ObjectId | string): Promise<string> {
  const u = await User.findById(userId).select('referralCode').lean();
  if (!u) throw new Error('User not found');
  if (u.referralCode) return u.referralCode;
  const code = await generateUniqueReferralCode();
  await User.findByIdAndUpdate(userId, { $set: { referralCode: code } });
  return code;
}

/**
 * Link a new account to a referrer by code (signup). Reward is created later on first paid order.
 */
export async function applyReferralCodeOnRegister(
  newUserId: mongoose.Types.ObjectId | string,
  rawCode: string | undefined,
): Promise<void> {
  if (!(await isReferralProgramEnabled())) return;
  const trimmed = (rawCode || '').trim().toUpperCase();
  if (!trimmed) return;

  const newId = new mongoose.Types.ObjectId(String(newUserId));
  const referrer = await User.findOne({ referralCode: trimmed }).select('_id').lean();
  if (!referrer?._id) return;
  if (String(referrer._id) === String(newId)) return;

  const existing = await User.findById(newId).select('referredBy').lean();
  if (existing?.referredBy) return;

  let maxPerUser = 10;
  try {
    const settings = await ReferralSettings.findOne().lean();
    if (settings?.maxReferralsPerUser != null) maxPerUser = Number(settings.maxReferralsPerUser) || 10;
  } catch {
    /* ignore */
  }

  const count = await User.countDocuments({ referredBy: referrer._id });
  if (count >= maxPerUser) return;

  await User.findByIdAndUpdate(newId, { $set: { referredBy: referrer._id } });
}

/**
 * When an order is successfully paid, if the buyer was referred, create a single referral reward (first paid order only).
 */
export async function processReferralRewardOnOrderPaid(order: {
  _id: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  total: number;
}): Promise<void> {
  try {
    if (!(await isReferralProgramEnabled())) return;
    const buyer = await User.findById(order.buyerId).select('referredBy').lean();
    if (!buyer?.referredBy) return;

    const existing = await MarketingReferralReward.findOne({ refereeUserId: order.buyerId }).select('_id').lean();
    if (existing) return;

    let rewardAmount = 10;
    let rewardType = 'cash';
    try {
      const settings = await ReferralSettings.findOne().lean();
      if (settings) {
        rewardAmount = Number(settings.rewardAmount) || 10;
        rewardType = settings.rewardType || 'cash';
      }
    } catch {
      /* defaults */
    }

    const referrer = await User.findById(buyer.referredBy).select('referralCode').lean();
    const codeUsed = referrer?.referralCode || 'UNKNOWN';

    try {
      await MarketingReferralReward.create({
        referrerUserId: buyer.referredBy,
        refereeUserId: order.buyerId,
        referralCodeUsed: codeUsed,
        qualifyingOrderId: order._id,
        orderTotal: order.total,
        rewardAmount,
        rewardType,
        // Counts toward admin "Rewards paid" total; switch to 'pending' if you add a finance approval step.
        status: 'paid',
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) return;
      throw err;
    }

    const systemUser = await User.findOne({ role: 'admin' }).select('_id').lean();
    const createdBy = systemUser?._id || buyer.referredBy;
    await createSystemInboxAndFanout({
      title: 'Referral reward earned',
      message: `Someone you invited completed a paid order. Referral reward recorded: ${rewardAmount} (${rewardType}). Check Marketing → Referral for totals.`,
      type: 'system_announcement',
      priority: 'medium',
      targetAudience: 'specific_user',
      targetUserId: String(buyer.referredBy),
      createdBy,
    });
  } catch (e) {
    console.warn('[referralReward] processReferralRewardOnOrderPaid', e);
  }
}
