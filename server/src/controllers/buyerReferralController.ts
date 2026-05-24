import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getBuyerReferralDashboard } from '../services/referralReward.service';

/** GET /api/buyer/referral — share link, code, stats (when program enabled). */
export async function getBuyerReferral(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const dashboard = await getBuyerReferralDashboard(req.user.id);
    res.set('Cache-Control', 'no-store, private');
    return res.json(dashboard);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load referral';
    return res.status(500).json({ message });
  }
}
