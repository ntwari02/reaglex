import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { SellerSettings } from '../models/SellerSettings';
import { getMicroblinkRegionConfig } from './microblink.service';
import { websocketService } from './websocketService';
import {
  getSellerKycStatus,
  publishEligibleProductsAfterKyc,
  type SellerKycStatusPayload,
  type SellerVerificationDisplayStatus,
} from './sellerKyc.service';

export type SellerKycRealtimePhase = 'document' | 'face' | 'platform';

export interface SellerKycRealtimePayload {
  sellerId: string;
  phase: SellerKycRealtimePhase;
  verificationStatus: SellerVerificationDisplayStatus;
  kyc: SellerKycStatusPayload;
  productsPublished?: number;
  identityKyc: unknown;
  microblink: ReturnType<typeof getMicroblinkRegionConfig>;
  updatedAt: string;
}

export async function emitSellerKycUpdated(
  sellerId: string,
  phase: SellerKycRealtimePhase,
  opts?: { productsPublished?: number },
): Promise<SellerKycRealtimePayload> {
  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
  const [settings, kyc] = await Promise.all([
    SellerSettings.findOne({ sellerId: sellerObjectId }).select('identityKyc').lean(),
    getSellerKycStatus(sellerId),
  ]);

  let productsPublished = opts?.productsPublished;
  if (
    productsPublished === undefined &&
    kyc.kycVerified &&
    (phase === 'face' || phase === 'platform')
  ) {
    productsPublished = await publishEligibleProductsAfterKyc(sellerId);
    if (productsPublished > 0) {
      kyc.productsPendingPublication = await Product.countDocuments({
        sellerId: sellerObjectId,
        publicationStatus: 'pending_verification',
      });
    }
  }

  const payload: SellerKycRealtimePayload = {
    sellerId,
    phase,
    verificationStatus: kyc.verificationStatus,
    kyc,
    productsPublished,
    identityKyc: settings?.identityKyc ?? null,
    microblink: getMicroblinkRegionConfig(),
    updatedAt: new Date().toISOString(),
  };

  websocketService.emitSellerKycUpdated(payload);
  return payload;
}
