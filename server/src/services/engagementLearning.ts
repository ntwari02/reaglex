import mongoose from 'mongoose';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';

export interface EngagementPattern {
  openRate: number;
  ignoreRate: number;
  lastEmailOpenAt?: Date;
  suggestedMaxReminders: number;
}

export async function computeEngagementPattern(userId: string): Promise<EngagementPattern> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await RecommendationEmailHistory.find({
    userId: new mongoose.Types.ObjectId(userId),
    campaign: { $in: ['abandoned_cart', 'recommendation', 'cart_pulse', 'browse_abandon', 'winback'] },
    sentAt: { $gte: since },
  })
    .select('status opens clicks sentAt')
    .lean();

  const sent = rows.filter((r) => r.status === 'sent').length;
  const opens = rows.reduce((s, r) => s + Number((r as any).opens || 0), 0);
  const openRate = sent > 0 ? Math.min(100, Math.round((opens / sent) * 100)) : 50;
  const ignoreRate = Math.max(0, 100 - openRate);

  let suggestedMaxReminders = 5;
  if (ignoreRate >= 80 && sent >= 3) suggestedMaxReminders = 2;
  else if (ignoreRate >= 60) suggestedMaxReminders = 3;

  const lastOpen = rows
    .filter((r) => Number((r as any).opens || 0) > 0)
    .sort((a, b) => new Date((b as any).sentAt).getTime() - new Date((a as any).sentAt).getTime())[0];

  return {
    openRate,
    ignoreRate,
    lastEmailOpenAt: lastOpen ? new Date((lastOpen as any).sentAt) : undefined,
    suggestedMaxReminders,
  };
}

export async function getPreferredSendHour(userId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const rows = await RecommendationEmailHistory.find({
    userId: new mongoose.Types.ObjectId(userId),
    opens: { $gt: 0 },
    sentAt: { $gte: since },
  })
    .select('sentAt')
    .limit(40)
    .lean();

  if (!rows.length) return 21;
  const hours = rows.map((r) => new Date((r as any).sentAt).getUTCHours());
  const counts = new Map<number, number>();
  for (const h of hours) counts.set(h, (counts.get(h) || 0) + 1);
  let best = 21;
  let max = 0;
  for (const [h, c] of counts) {
    if (c > max) {
      max = c;
      best = h;
    }
  }
  return best;
}
