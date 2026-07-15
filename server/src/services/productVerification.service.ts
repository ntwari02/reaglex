import { Product } from '../models/Product';
import { ProductVerification } from '../models/ProductVerification';
import { SellerTrustProfile } from '../models/SellerTrustProfile';
import { SellerSettings } from '../models/SellerSettings';
import { Order } from '../models/Order';
import { Dispute } from '../models/Dispute';
import mongoose from 'mongoose';
import {
  evaluateTrustDraft,
  type TrustDraftInput,
  type TrustEvaluationResult,
  MIN_TRUST_TO_SUBMIT,
} from './trustVerification.engine';

function norm(s: unknown) {
  return String(s || '').trim().toLowerCase();
}

export async function hasDuplicateListingImages(
  sellerId: string,
  imageUrls: string[],
  excludeProductId?: string,
): Promise<boolean> {
  const urls = (imageUrls || []).filter(Boolean);
  if (!urls.length) return false;
  try {
    const sid = new mongoose.Types.ObjectId(sellerId);
    const filter: Record<string, unknown> = { sellerId: sid, images: { $in: urls } };
    if (excludeProductId && mongoose.Types.ObjectId.isValid(excludeProductId)) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeProductId) };
    }
    const n = await Product.countDocuments(filter as any);
    return n > 0;
  } catch {
    return false;
  }
}

export async function evaluateProductTrustForSeller(
  sellerId: string,
  draft: { name: string; category?: string; description?: string; images?: string[] },
  verification: Partial<TrustDraftInput>,
  excludeProductId?: string,
): Promise<TrustEvaluationResult> {
  const dup = await hasDuplicateListingImages(sellerId, draft.images || [], excludeProductId);
  return evaluateTrustDraft({
    name: draft.name,
    category: draft.category,
    description: draft.description,
    images: draft.images || [],
    duplicateListingImage: dup,
    ...verification,
  });
}

export async function externalIdentifierCheck(input: {
  productName: string;
  category?: string;
  barcode?: string;
  ean?: string;
  upc?: string;
  imei?: string;
}) {
  const code = input.barcode || input.ean || input.upc || input.imei;
  if (!code) return { provider: 'none', confidence: 0, matchedTitle: undefined, matchedCategory: undefined, raw: null as any };

  const apiUrl = String(process.env.BARCODE_LOOKUP_API_URL || '').trim();
  if (!apiUrl) {
    return { provider: 'none', confidence: 0, matchedTitle: undefined, matchedCategory: undefined, raw: { skipped: true } };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(`${apiUrl}?code=${encodeURIComponent(code)}`, {
      headers: process.env.BARCODE_LOOKUP_API_KEY ? { Authorization: `Bearer ${process.env.BARCODE_LOOKUP_API_KEY}` } : undefined,
      signal: controller.signal,
    } as any);
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
    const raw = await response.json();
    const title = String(raw?.title || raw?.name || '');
    const cat = String(raw?.category || raw?.product_category || '');
    const matchedTitle = !title || norm(title).includes(norm(input.productName)) || norm(input.productName).includes(norm(title));
    const matchedCategory = !cat || !input.category || norm(cat).includes(norm(input.category)) || norm(input.category).includes(norm(cat));
    const confidence = (matchedTitle ? 60 : 20) + (matchedCategory ? 30 : 10);
    return { provider: 'barcode-api', confidence, matchedTitle, matchedCategory, raw };
  } catch (err: any) {
    return { provider: 'lookup-failed', confidence: 0, matchedTitle: false, matchedCategory: false, raw: { error: err?.message || String(err) } };
  }
}

function deriveVerificationStatus(evaluation: TrustEvaluationResult): {
  status: 'unverified' | 'pending' | 'verified' | 'flagged' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high';
} {
  if (evaluation.hardBlocked || !evaluation.submissionAllowed) {
    return { status: 'rejected', riskLevel: 'high' };
  }
  if (evaluation.totalScore >= 80 && evaluation.suspiciousFlags.length === 0) {
    return { status: 'verified', riskLevel: 'low' };
  }
  if (evaluation.totalScore >= 50) {
    return { status: 'pending', riskLevel: evaluation.trustBand === 'medium' ? 'medium' : 'high' };
  }
  return { status: 'flagged', riskLevel: 'high' };
}

export async function runProductVerification(input: {
  productId: string;
  sellerId: string;
  actorId?: string;
  identifiers?: Partial<{
    barcode: string;
    ean: string;
    upc: string;
    qrCode: string;
    serialNumber: string;
    imei: string;
    rfid: string;
    nfc: string;
  }>;
  aiInput?: Partial<{
    imageSimilarityScore: number;
    categoryConsistencyScore: number;
    stolenImageSuspected: boolean;
    videoProofUploaded: boolean;
    labelProofUploaded: boolean;
    videoImageSimilarity?: number;
    videoProofUrl?: string;
    scanPassed?: boolean;
    notes: string[];
  }>;
}) {
  const product = await Product.findById(input.productId).lean();
  if (!product) throw new Error('Product not found');

  const hasIdentifier = Boolean(
    input.identifiers?.barcode ||
      input.identifiers?.ean ||
      input.identifiers?.upc ||
      input.identifiers?.serialNumber ||
      input.identifiers?.imei ||
      input.identifiers?.rfid ||
      input.identifiers?.nfc,
  );

  const external = await externalIdentifierCheck({
    productName: (product as any).name,
    category: (product as any).category,
    barcode: input.identifiers?.barcode,
    ean: input.identifiers?.ean,
    upc: input.identifiers?.upc,
    imei: input.identifiers?.imei,
  });

  const dup = await hasDuplicateListingImages(
    String((product as any).sellerId),
    ((product as any).images || []) as string[],
    String(product._id),
  );

  const draftInput: TrustDraftInput = {
    name: String((product as any).name || ''),
    description: String((product as any).description || ''),
    category: String((product as any).category || ''),
    images: ((product as any).images || []) as string[],
    duplicateListingImage: dup,
    barcode: input.identifiers?.barcode || input.identifiers?.ean || input.identifiers?.upc,
    qrCode: input.identifiers?.qrCode,
    serialNumber: input.identifiers?.serialNumber,
    imei: input.identifiers?.imei,
    videoProofUploaded: !!input.aiInput?.videoProofUploaded,
    videoProofUrl: input.aiInput?.videoProofUrl,
    videoImageSimilarity: input.aiInput?.videoImageSimilarity,
    labelProofUploaded: !!input.aiInput?.labelProofUploaded,
    imageSimilarityScore: input.aiInput?.imageSimilarityScore,
    stolenImageSuspected: !!input.aiInput?.stolenImageSuspected,
    scanPassed: !!input.aiInput?.scanPassed,
  };

  let evaluation = evaluateTrustDraft(draftInput);

  let consistencyScore = evaluation.consistencyScore;
  const extraFlags: string[] = [];
  if (hasIdentifier && external.matchedTitle === false) {
    consistencyScore = Math.max(0, consistencyScore - 10);
    extraFlags.push('identifier_title_mismatch');
  }
  if (hasIdentifier && external.matchedCategory === false) {
    consistencyScore = Math.max(0, consistencyScore - 10);
    extraFlags.push('identifier_category_mismatch');
  }

  const suspiciousMerged = [...new Set([...evaluation.suspiciousFlags, ...extraFlags])];
  const totalScore = Math.max(
    0,
    Math.min(100, evaluation.barcodeScore + evaluation.imageScore + evaluation.videoScore + consistencyScore),
  );
  const trustBand: TrustEvaluationResult['trustBand'] =
    totalScore >= 80 ? 'high' : totalScore >= 50 ? 'medium' : 'low';
  const hardBlocked = evaluation.hardBlocked;
  const submissionAllowed = !hardBlocked && totalScore >= MIN_TRUST_TO_SUBMIT;

  evaluation = {
    ...evaluation,
    consistencyScore,
    totalScore,
    trustBand,
    suspiciousFlags: suspiciousMerged,
    submissionAllowed,
  };

  const { status, riskLevel } = deriveVerificationStatus(evaluation);

  const auditAction = input.actorId ? 'verification_updated_by_user' : 'verification_auto_run';
  const verification = await ProductVerification.findOneAndUpdate(
    { productId: product._id },
    {
      $setOnInsert: {
        productId: product._id,
        sellerId: (product as any).sellerId,
        spacillyProductId: (product as any).spacillyProductId,
      },
      $set: {
        identifiers: {
          barcode: input.identifiers?.barcode || undefined,
          ean: input.identifiers?.ean || undefined,
          upc: input.identifiers?.upc || undefined,
          qrCode: input.identifiers?.qrCode || undefined,
          serialNumber: input.identifiers?.serialNumber || undefined,
          imei: input.identifiers?.imei || undefined,
          rfid: input.identifiers?.rfid || undefined,
          nfc: input.identifiers?.nfc || undefined,
        },
        aiChecks: {
          imageSimilarityScore: input.aiInput?.imageSimilarityScore ?? 0,
          categoryConsistencyScore: input.aiInput?.categoryConsistencyScore ?? 0,
          stolenImageSuspected: !!input.aiInput?.stolenImageSuspected,
          videoProofUploaded: !!input.aiInput?.videoProofUploaded,
          labelProofUploaded: !!input.aiInput?.labelProofUploaded,
          videoImageSimilarity: input.aiInput?.videoImageSimilarity,
          videoProofUrl: input.aiInput?.videoProofUrl,
          scanPassed: !!input.aiInput?.scanPassed,
          notes: input.aiInput?.notes || [],
          checkedAt: new Date(),
        },
        componentScores: {
          barcode: evaluation.barcodeScore,
          image: evaluation.imageScore,
          video: evaluation.videoScore,
          consistency: evaluation.consistencyScore,
        },
        trustBreakdown: evaluation.breakdown,
        submissionAllowed: evaluation.submissionAllowed,
        verificationScore: evaluation.totalScore,
        riskLevel,
        status,
        suspiciousFlags: suspiciousMerged,
        manualReview: {
          required: status === 'flagged' || status === 'rejected' || riskLevel === 'high',
          status: status === 'flagged' || status === 'rejected' ? 'queued' : 'not_required',
        },
        printableQrUrl: `${String(process.env.CLIENT_URL || '').replace(/\/$/, '')}/products/${product._id}?rxid=${encodeURIComponent(String((product as any).spacillyProductId || ''))}`,
      },
      $push: {
        externalChecks: {
          provider: external.provider,
          matchedTitle: external.matchedTitle,
          matchedCategory: external.matchedCategory,
          confidence: external.confidence,
          raw: external.raw,
          checkedAt: new Date(),
        },
        auditTrail: {
          actorId:
            input.actorId && mongoose.Types.ObjectId.isValid(input.actorId)
              ? new mongoose.Types.ObjectId(input.actorId)
              : undefined,
          action: auditAction,
          note: `score=${evaluation.totalScore} status=${status} submissionAllowed=${evaluation.submissionAllowed}`,
          at: new Date(),
        },
      },
    },
    { upsert: true, new: true },
  );

  await Product.updateOne(
    { _id: product._id },
    {
      $set: {
        verificationSummary: {
          status,
          score: evaluation.totalScore,
          riskLevel,
          trustBand: evaluation.trustBand,
          submissionAllowed: evaluation.submissionAllowed,
          hasIdentifier,
          lastCheckedAt: new Date(),
        },
      },
    },
  );

  await recalculateSellerTrust(String((product as any).sellerId));
  return verification;
}

export async function recalculateSellerTrust(sellerId: string) {
  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);
  const [verifiedListings, suspiciousListings, successfulOrders, disputesOpened, highRiskFraudFlags, avgAi, sellerSettings] =
    await Promise.all([
    ProductVerification.countDocuments({ sellerId: sellerObjectId, status: 'verified' } as any),
    ProductVerification.countDocuments({ sellerId: sellerObjectId, status: { $in: ['flagged', 'rejected'] } } as any),
    Order.countDocuments({ sellerId: sellerObjectId, status: { $in: ['delivered'] } } as any),
    Dispute.countDocuments({ sellerId: sellerObjectId } as any),
    ProductVerification.countDocuments({
      sellerId: sellerObjectId,
      suspiciousFlags: { $in: ['possible_stolen_images', 'identifier_title_mismatch'] },
    } as any),
    ProductVerification.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
      { $group: { _id: null, avgScore: { $avg: '$aiChecks.imageSimilarityScore' } } },
    ]),
    SellerSettings.findOne({ sellerId: sellerObjectId }).select('identityKyc').lean(),
  ]);

  let trustScore = 50;
  trustScore += Math.min(25, verifiedListings * 2);
  trustScore += Math.min(20, successfulOrders * 0.15);
  trustScore -= Math.min(20, suspiciousListings * 3);
  trustScore -= Math.min(15, disputesOpened * 1.2);
  trustScore -= Math.min(25, highRiskFraudFlags * 5);

  const bonuses = sellerSettings?.identityKyc?.trustBonuses;
  if (bonuses?.documentVerified) trustScore += 25;
  if (bonuses?.faceVerified) trustScore += 25;
  if (bonuses?.phoneVerified) trustScore += 15;
  if (bonuses?.businessVerified) trustScore += 35;

  trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));
  const badge = trustScore >= 85 ? 'elite' : trustScore >= 70 ? 'trusted' : trustScore >= 50 ? 'improving' : 'new';
  const avgImageVideoConfidence = Math.round(Number(avgAi?.[0]?.avgScore || 0));

  return SellerTrustProfile.findOneAndUpdate(
    { sellerId: sellerObjectId } as any,
    {
      $set: {
        trustScore,
        badge,
        stats: {
          verifiedListings,
          suspiciousListings,
          successfulOrders,
          disputesOpened,
          confirmedFraudCases: highRiskFraudFlags,
          returnsCount: 0,
          avgImageVideoConfidence,
        },
      },
    },
    { upsert: true, new: true },
  );
}
