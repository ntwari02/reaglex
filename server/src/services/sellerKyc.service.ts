import mongoose from 'mongoose';
import { User } from '../models/User';
import { SellerSettings, IIdentityKyc, IIdentityKycTrustBonuses } from '../models/SellerSettings';
import { Product } from '../models/Product';

export type KycStepId = 'phone' | 'email' | 'document' | 'face' | 'business';

/** Seller-facing verification lifecycle (UI + realtime). */
export type SellerVerificationDisplayStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';

export function resolveVerificationDisplayStatus(input: {
  sellerVerificationStatus?: string | null;
  identityKyc?: IIdentityKyc | null;
  platformApproved: boolean;
}): SellerVerificationDisplayStatus {
  if (input.sellerVerificationStatus === 'rejected') return 'REJECTED';
  if (input.platformApproved) return 'VERIFIED';
  if (isIdentityKycComplete(input.identityKyc)) return 'UNDER_REVIEW';
  return 'PENDING';
}

export interface SellerKycStepStatus {
  id: KycStepId;
  label: string;
  completed: boolean;
  required: boolean;
}

export interface SellerKycStatusPayload {
  kycVerified: boolean;
  verificationStatus: SellerVerificationDisplayStatus;
  platformApproved: boolean;
  identityStep: IIdentityKyc['step'];
  steps: SellerKycStepStatus[];
  completedRequired: number;
  totalRequired: number;
  progressPercent: number;
  estimatedMinutes: number;
  trustBonuses: IIdentityKycTrustBonuses;
  onboarding: {
    showMandatoryModal: boolean;
    completeLaterAllowed: boolean;
    completeLaterAt?: string;
  };
  productsPendingPublication: number;
}

function defaultTrustBonuses(): IIdentityKycTrustBonuses {
  return {
    documentVerified: false,
    faceVerified: false,
    phoneVerified: false,
    businessVerified: false,
  };
}

export function isIdentityKycComplete(identityKyc?: IIdentityKyc | null): boolean {
  if (!identityKyc) return false;
  if (identityKyc.step === 'completed') return true;
  return Boolean(identityKyc.document?.verified && identityKyc.face?.verified);
}

/** Buyer-visible listing gate: Microblink ID + selfie complete. */
export async function isSellerKycVerified(sellerId: string | mongoose.Types.ObjectId): Promise<boolean> {
  const id = typeof sellerId === 'string' ? new mongoose.Types.ObjectId(sellerId) : sellerId;
  const [user, settings] = await Promise.all([
    User.findById(id).select('isSellerVerified sellerVerificationStatus').lean(),
    SellerSettings.findOne({ sellerId: id }).select('identityKyc').lean(),
  ]);
  if (user?.isSellerVerified && user.sellerVerificationStatus === 'approved') {
    return true;
  }
  return isIdentityKycComplete(settings?.identityKyc);
}

export async function getSellerKycStatus(sellerId: string | mongoose.Types.ObjectId): Promise<SellerKycStatusPayload> {
  const id = typeof sellerId === 'string' ? new mongoose.Types.ObjectId(sellerId) : sellerId;
  const [user, settings] = await Promise.all([
    User.findById(id).select('phone emailVerified isSellerVerified sellerVerificationStatus').lean(),
    SellerSettings.findOne({ sellerId: id })
      .select('identityKyc verificationDocuments businessName kycOnboarding')
      .lean(),
  ]);

  const identityKyc = settings?.identityKyc;
  const trustBonuses = identityKyc?.trustBonuses || defaultTrustBonuses();
  const phoneOk = Boolean(user?.phone && String(user.phone).trim().length >= 8);
  const emailOk = Boolean(user?.emailVerified);
  const documentOk = Boolean(identityKyc?.document?.verified);
  const faceOk = Boolean(identityKyc?.face?.verified);
  const businessOk = Boolean(
    trustBonuses.businessVerified ||
      settings?.verificationDocuments?.businessLicense ||
      (settings?.businessName && settings.businessName.trim().length > 2),
  );

  const steps: SellerKycStepStatus[] = [
    { id: 'phone', label: 'Phone verification', completed: phoneOk, required: true },
    { id: 'email', label: 'Email verification', completed: emailOk, required: true },
    { id: 'document', label: 'Government ID verification', completed: documentOk, required: true },
    { id: 'face', label: 'Selfie face verification', completed: faceOk, required: true },
    { id: 'business', label: 'Business verification', completed: businessOk, required: false },
  ];

  const requiredSteps = steps.filter((s) => s.required);
  const completedRequired = requiredSteps.filter((s) => s.completed).length;
  const totalRequired = requiredSteps.length;
  const progressPercent = Math.round((completedRequired / totalRequired) * 100);

  const kycVerified = await isSellerKycVerified(id);
  const platformApproved = Boolean(user?.isSellerVerified && user?.sellerVerificationStatus === 'approved');
  const verificationStatus = resolveVerificationDisplayStatus({
    sellerVerificationStatus: user?.sellerVerificationStatus,
    identityKyc,
    platformApproved,
  });

  const completeLaterAt = settings?.kycOnboarding?.completeLaterAt;
  const showMandatoryModal = !kycVerified && !settings?.kycOnboarding?.modalAcknowledgedAt;

  const productsPendingPublication = await Product.countDocuments({
    sellerId: id,
    publicationStatus: 'pending_verification',
  });

  return {
    kycVerified,
    verificationStatus,
    platformApproved,
    identityStep: identityKyc?.step || 'not_started',
    steps,
    completedRequired,
    totalRequired,
    progressPercent,
    estimatedMinutes: 8,
    trustBonuses,
    onboarding: {
      showMandatoryModal,
      completeLaterAllowed: true,
      completeLaterAt: completeLaterAt ? new Date(completeLaterAt).toISOString() : undefined,
    },
    productsPendingPublication,
  };
}

export function resolvePublicationStatusForSeller(kycVerified: boolean, requested?: string): 'published' | 'pending_verification' | 'draft' {
  if (!kycVerified) {
    return 'pending_verification';
  }
  if (requested === 'draft') return 'draft';
  return 'published';
}

/** Publish products held for KYC after verification succeeds. */
export async function publishEligibleProductsAfterKyc(sellerId: string | mongoose.Types.ObjectId): Promise<number> {
  const id = typeof sellerId === 'string' ? new mongoose.Types.ObjectId(sellerId) : sellerId;
  const result = await Product.updateMany(
    {
      sellerId: id,
      publicationStatus: 'pending_verification',
    },
    { $set: { publicationStatus: 'published' } },
  );
  return result.modifiedCount ?? 0;
}
