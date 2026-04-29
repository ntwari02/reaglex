import { Product } from '../models/Product';
import { ProductVerification } from '../models/ProductVerification';
import { SellerTrustProfile } from '../models/SellerTrustProfile';
import { Order } from '../models/Order';
import { Dispute } from '../models/Dispute';
import mongoose from 'mongoose';

function norm(s: unknown) {
  return String(s || '').trim().toLowerCase();
}

function overlap(a: string[], b: string[]) {
  const sa = new Set(a.map(norm).filter(Boolean));
  const sb = new Set(b.map(norm).filter(Boolean));
  let hit = 0;
  sa.forEach((x) => { if (sb.has(x)) hit += 1; });
  return hit;
}

export function computeVerificationScore(input: {
  hasIdentifier: boolean;
  externalMatchConfidence: number;
  imageSimilarityScore: number;
  categoryConsistencyScore: number;
  videoProofUploaded: boolean;
  stolenImageSuspected: boolean;
  suspiciousFlagsCount: number;
}) {
  let score = 20;
  if (input.hasIdentifier) score += 22;
  score += Math.round(input.externalMatchConfidence * 0.22);
  score += Math.round(input.imageSimilarityScore * 0.18);
  score += Math.round(input.categoryConsistencyScore * 0.18);
  if (input.videoProofUploaded) score += 8;
  if (input.stolenImageSuspected) score -= 28;
  score -= input.suspiciousFlagsCount * 6;
  score = Math.max(0, Math.min(100, score));
  const riskLevel = score >= 75 ? 'low' : score >= 45 ? 'medium' : 'high';
  const status =
    score >= 80 && input.suspiciousFlagsCount === 0 ? 'verified' :
    input.suspiciousFlagsCount > 0 || score < 45 ? 'flagged' :
    'pending';
  return { score, riskLevel, status };
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
    return { provider: 'internal-fallback', confidence: 55, matchedTitle: true, matchedCategory: true, raw: { fallback: true } };
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
    return { provider: 'lookup-failed', confidence: 35, matchedTitle: false, matchedCategory: false, raw: { error: err?.message || String(err) } };
  }
}

export async function runProductVerification(input: {
  productId: string;
  sellerId: string;
  actorId?: string;
  identifiers?: Partial<{
    barcode: string; ean: string; upc: string; qrCode: string; serialNumber: string; imei: string; rfid: string; nfc: string;
  }>;
  aiInput?: Partial<{
    imageSimilarityScore: number;
    categoryConsistencyScore: number;
    stolenImageSuspected: boolean;
    videoProofUploaded: boolean;
    labelProofUploaded: boolean;
    notes: string[];
  }>;
}) {
  const product = await Product.findById(input.productId).lean();
  if (!product) throw new Error('Product not found');
  const hasIdentifier = Boolean(
    input.identifiers?.barcode || input.identifiers?.ean || input.identifiers?.upc ||
    input.identifiers?.serialNumber || input.identifiers?.imei || input.identifiers?.rfid || input.identifiers?.nfc
  );

  const external = await externalIdentifierCheck({
    productName: (product as any).name,
    category: (product as any).category,
    barcode: input.identifiers?.barcode,
    ean: input.identifiers?.ean,
    upc: input.identifiers?.upc,
    imei: input.identifiers?.imei,
  });

  const suspiciousFlags: string[] = [];
  if (hasIdentifier && external.matchedTitle === false) suspiciousFlags.push('identifier_title_mismatch');
  if (hasIdentifier && external.matchedCategory === false) suspiciousFlags.push('identifier_category_mismatch');
  if (input.aiInput?.stolenImageSuspected) suspiciousFlags.push('possible_stolen_images');
  if ((input.aiInput?.categoryConsistencyScore ?? 65) < 40) suspiciousFlags.push('image_category_inconsistency');
  if (norm((product as any).category).includes('electronics') && !input.aiInput?.videoProofUploaded) {
    suspiciousFlags.push('high_risk_no_video_proof');
  }

  const scoreResult = computeVerificationScore({
    hasIdentifier,
    externalMatchConfidence: external.confidence,
    imageSimilarityScore: input.aiInput?.imageSimilarityScore ?? 68,
    categoryConsistencyScore: input.aiInput?.categoryConsistencyScore ?? 70,
    videoProofUploaded: !!input.aiInput?.videoProofUploaded,
    stolenImageSuspected: !!input.aiInput?.stolenImageSuspected,
    suspiciousFlagsCount: suspiciousFlags.length,
  });

  const auditAction = input.actorId ? 'verification_updated_by_user' : 'verification_auto_run';
  const verification = await ProductVerification.findOneAndUpdate(
    { productId: product._id },
    {
      $setOnInsert: {
        productId: product._id,
        sellerId: (product as any).sellerId,
        reaglexProductId: (product as any).reaglexProductId,
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
          imageSimilarityScore: input.aiInput?.imageSimilarityScore ?? 68,
          categoryConsistencyScore: input.aiInput?.categoryConsistencyScore ?? 70,
          stolenImageSuspected: !!input.aiInput?.stolenImageSuspected,
          videoProofUploaded: !!input.aiInput?.videoProofUploaded,
          labelProofUploaded: !!input.aiInput?.labelProofUploaded,
          notes: input.aiInput?.notes || [],
          checkedAt: new Date(),
        },
        verificationScore: scoreResult.score,
        riskLevel: scoreResult.riskLevel,
        status: scoreResult.status,
        suspiciousFlags,
        manualReview: {
          required: scoreResult.status === 'flagged' || scoreResult.riskLevel === 'high',
          status: scoreResult.status === 'flagged' ? 'queued' : 'not_required',
        },
        printableQrUrl: `${String(process.env.CLIENT_URL || '').replace(/\/$/, '')}/products/${product._id}?rxid=${encodeURIComponent(String((product as any).reaglexProductId || ''))}`,
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
          actorId: input.actorId && mongoose.Types.ObjectId.isValid(input.actorId) ? new mongoose.Types.ObjectId(input.actorId) : undefined,
          action: auditAction,
          note: `score=${scoreResult.score} status=${scoreResult.status}`,
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
          status: scoreResult.status,
          score: scoreResult.score,
          riskLevel: scoreResult.riskLevel,
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
  const [verifiedListings, suspiciousListings, successfulOrders, disputesOpened, highRiskFraudFlags, avgAi] = await Promise.all([
    ProductVerification.countDocuments({ sellerId: sellerObjectId, status: 'verified' } as any),
    ProductVerification.countDocuments({ sellerId: sellerObjectId, status: { $in: ['flagged', 'rejected'] } } as any),
    Order.countDocuments({ sellerId: sellerObjectId, status: { $in: ['delivered'] } } as any),
    Dispute.countDocuments({ sellerId: sellerObjectId } as any),
    ProductVerification.countDocuments({ sellerId: sellerObjectId, suspiciousFlags: { $in: ['possible_stolen_images', 'identifier_title_mismatch'] } } as any),
    ProductVerification.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
      { $group: { _id: null, avgScore: { $avg: '$aiChecks.imageSimilarityScore' } } },
    ]),
  ]);

  let trustScore = 50;
  trustScore += Math.min(25, verifiedListings * 2);
  trustScore += Math.min(20, successfulOrders * 0.15);
  trustScore -= Math.min(20, suspiciousListings * 3);
  trustScore -= Math.min(15, disputesOpened * 1.2);
  trustScore -= Math.min(25, highRiskFraudFlags * 5);
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

