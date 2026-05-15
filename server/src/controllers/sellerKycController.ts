import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { SellerSettings } from '../models/SellerSettings';
import { getSellerKycStatus } from '../services/sellerKyc.service';

function getSellerId(req: AuthenticatedRequest): mongoose.Types.ObjectId | null {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
}

/** GET /api/seller/kyc/status */
export async function getKycStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    const status = await getSellerKycStatus(sellerId);
    return res.json(status);
  } catch (error: unknown) {
    console.error('getKycStatus error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load KYC status';
    return res.status(500).json({ message });
  }
}

/** POST /api/seller/kyc/onboarding/start */
export async function startKycOnboarding(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    const now = new Date();
    await SellerSettings.findOneAndUpdate(
      { sellerId },
      {
        $set: {
          'kycOnboarding.startedAt': now,
          'kycOnboarding.modalAcknowledgedAt': now,
        },
      },
      { upsert: true, new: true },
    );

    const status = await getSellerKycStatus(sellerId);
    return res.json({ message: 'Verification started', ...status });
  } catch (error: unknown) {
    console.error('startKycOnboarding error:', error);
    return res.status(500).json({ message: 'Failed to start onboarding' });
  }
}

/** POST /api/seller/kyc/onboarding/complete-later */
export async function completeKycLater(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    const now = new Date();
    await SellerSettings.findOneAndUpdate(
      { sellerId },
      {
        $set: {
          'kycOnboarding.completeLaterAt': now,
          'kycOnboarding.modalAcknowledgedAt': now,
        },
      },
      { upsert: true, new: true },
    );

    const status = await getSellerKycStatus(sellerId);
    return res.json({
      message: 'You can complete verification later from Settings. Products stay hidden until KYC is done.',
      ...status,
    });
  } catch (error: unknown) {
    console.error('completeKycLater error:', error);
    return res.status(500).json({ message: 'Failed to save preference' });
  }
}
