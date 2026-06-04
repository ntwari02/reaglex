import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { SellerSettings } from '../models/SellerSettings';

function getSellerId(req: AuthenticatedRequest): string | null {
  return req.user?.id || null;
}

/** GET /api/seller/onboarding/status — seller verification timeline */
export async function getSellerOnboardingStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(sellerId)
      .select('createdAt sellerVerificationStatus isSellerVerified emailVerified')
      .lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const settings = await SellerSettings.findOne({ sellerId }).select('identityKyc kycOnboarding').lean();
    const identityKyc = settings?.identityKyc;
    const docVerified = Boolean(identityKyc?.document?.verified);
    const faceVerified = Boolean(identityKyc?.face?.verified);
    const kycComplete = docVerified && faceVerified;

    const status = user.sellerVerificationStatus || 'pending';
    const isApproved = user.isSellerVerified === true || status === 'approved';
    const isRejected = status === 'rejected';

    type StepStatus = 'done' | 'current' | 'pending';
    const steps: Array<{ id: string; label: string; sub: string; status: StepStatus }> = [];

    const submittedAt = user.createdAt ? new Date(user.createdAt) : new Date();
    steps.push({
      id: 'submitted',
      label: 'Application Submitted',
      sub: `${submittedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · Received & logged`,
      status: 'done',
    });

    if (isApproved) {
      steps.push({
        id: 'review',
        label: 'Under Review',
        sub: 'Compliance review completed',
        status: 'done',
      });
      steps.push({
        id: 'kyc',
        label: 'Identity Verification',
        sub: kycComplete ? 'Documents verified' : 'Verification complete',
        status: 'done',
      });
      steps.push({
        id: 'active',
        label: 'Account Activated',
        sub: 'Full dashboard access — start selling!',
        status: 'done',
      });
    } else if (isRejected) {
      steps.push({
        id: 'review',
        label: 'Under Review',
        sub: 'Application was not approved',
        status: 'done',
      });
      steps.push({
        id: 'kyc',
        label: 'Identity Verification',
        sub: 'Please contact support for next steps',
        status: 'current',
      });
      steps.push({
        id: 'active',
        label: 'Account Activated',
        sub: 'Pending approval',
        status: 'pending',
      });
    } else {
      const kycStarted = Boolean(settings?.kycOnboarding?.startedAt || identityKyc?.step);
      const inKyc = kycStarted || docVerified || faceVerified;

      steps.push({
        id: 'review',
        label: 'Under Review',
        sub: inKyc ? 'Initial review in progress' : 'Our compliance team is verifying details',
        status: inKyc ? 'done' : 'current',
      });
      steps.push({
        id: 'kyc',
        label: 'Identity Verification',
        sub: kycComplete
          ? 'Documents verified'
          : docVerified || faceVerified
            ? 'Verification in progress'
            : 'Document review & fraud screening',
        status: kycComplete ? 'done' : inKyc ? 'current' : 'pending',
      });
      steps.push({
        id: 'active',
        label: 'Account Activated',
        sub: 'Full dashboard access — start selling!',
        status: 'pending',
      });
    }

    return res.json({
      sellerVerificationStatus: status,
      isSellerVerified: Boolean(user.isSellerVerified),
      kycStatus: identityKyc?.step || null,
      steps,
    });
  } catch (err: unknown) {
    console.error('[sellerOnboarding] status', err);
    return res.status(500).json({ message: 'Failed to load onboarding status' });
  }
}
