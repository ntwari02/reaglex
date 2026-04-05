import { Request, Response } from 'express';
import { ReferralSettings } from '../models/ReferralSettings';

/** Unauthenticated: whether new referral signups / rewards are active (admin-controlled). */
export async function getPublicReferralProgramStatus(_req: Request, res: Response) {
  try {
    const s = await ReferralSettings.findOne().select('programEnabled').lean();
    const enabled = !s || (s as { programEnabled?: boolean }).programEnabled !== false;
    res.json({ referralProgramEnabled: enabled });
  } catch {
    res.json({ referralProgramEnabled: true });
  }
}
