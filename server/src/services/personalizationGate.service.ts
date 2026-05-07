import mongoose from 'mongoose';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';

function getIntEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

/**
 * Decide whether we should send high-personalization emails.
 * If confidence is low, we can still send "trending in your favorite categories" instead of true personalization.
 */
export async function getPersonalizationGate(userId: string): Promise<{
  allowPersonalized: boolean;
  confidenceScore: number;
  confidenceReason: string;
}> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { allowPersonalized: false, confidenceScore: 0, confidenceReason: 'invalid_user' };
  }
  const threshold = Math.max(0, Math.min(100, getIntEnv('PERSONALIZATION_CONFIDENCE_THRESHOLD', 75)));
  const prof = await BuyerInsightProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) })
    .select('confidenceScore confidenceReason')
    .lean();
  const confidenceScore = Number((prof as any)?.confidenceScore || 0);
  const confidenceReason = String((prof as any)?.confidenceReason || 'no_profile');
  return {
    allowPersonalized: confidenceScore >= threshold,
    confidenceScore,
    confidenceReason,
  };
}

