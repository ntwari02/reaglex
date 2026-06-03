/**
 * Weighted trust model — score is sum of components only (no default 100).
 * Max: barcode 20 + image 20 + video 30 + consistency 30 = 100.
 */

export const TRUST_WEIGHTS = {
  barcode: 20,
  image: 20,
  video: 30,
  consistency: 30,
} as const;

export const MIN_TRUST_TO_LIST = 50;
export const MIN_TRUST_TO_SUBMIT = 60;

export type TrustCheckState = 'ok' | 'warn' | 'fail';

export interface TrustBreakdownRow {
  key: string;
  label: string;
  state: TrustCheckState;
  detail: string;
}

export interface TrustEvaluationResult {
  barcodeScore: number;
  imageScore: number;
  videoScore: number;
  consistencyScore: number;
  totalScore: number;
  trustBand: 'high' | 'medium' | 'low';
  breakdown: TrustBreakdownRow[];
  blockers: string[];
  hardBlocked: boolean;
  suspiciousFlags: string[];
  /** False when hard rules fail or total trust is below minimum */
  submissionAllowed: boolean;
}

function norm(s: unknown) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

/** Strip to digits only for barcode field */
export function normalizeBarcodeInput(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

/** GS1 check digit for GTIN (weights 3,1 from right, excluding check digit) */
function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    const digit = parseInt(body[i]!, 10);
    const positionFromRight = body.length - i;
    sum += digit * (positionFromRight % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/** EAN-13 / GTIN-13 check digit */
export function isValidEAN13(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  const body = digits.slice(0, 12);
  const check = gs1CheckDigit(body);
  return check === parseInt(digits[12]!, 10);
}

/** EAN-8 */
export function isValidEAN8(digits: string): boolean {
  if (!/^\d{8}$/.test(digits)) return false;
  const body = digits.slice(0, 7);
  const check = gs1CheckDigit(body);
  return check === parseInt(digits[7]!, 10);
}

/** UPC-A (12 digits) — same weighting as GTIN-12 */
export function isValidUPCA(digits: string): boolean {
  if (!/^\d{12}$/.test(digits)) return false;
  const body = digits.slice(0, 11);
  const check = gs1CheckDigit(body);
  return check === parseInt(digits[11]!, 10);
}

/**
 * Strict barcode: 8–13 numeric only, plus checksum when length is 8, 12, or 13.
 * Length 10/11: format-only (no checksum in GS1 family) — treated as invalid for trust.
 */
export function isValidBarcodeStrict(raw: string): { ok: boolean; normalized: string; reason?: string } {
  const digits = normalizeBarcodeInput(raw);
  if (!digits) return { ok: false, normalized: '', reason: 'empty' };
  if (!/^[0-9]{8,13}$/.test(digits)) return { ok: false, normalized: digits, reason: 'invalid_format' };
  if (digits.length === 13) return { ok: isValidEAN13(digits), normalized: digits, reason: isValidEAN13(digits) ? undefined : 'checksum' };
  if (digits.length === 12) return { ok: isValidUPCA(digits), normalized: digits, reason: isValidUPCA(digits) ? undefined : 'checksum' };
  if (digits.length === 8) return { ok: isValidEAN8(digits), normalized: digits, reason: isValidEAN8(digits) ? undefined : 'checksum' };
  return { ok: false, normalized: digits, reason: 'unsupported_length' };
}

/** Barcode is optional for all seller listings (no UI capture). */
export function categoryRequiresBarcode(_category: string): boolean {
  return false;
}

/** Proof video is required so buyers can verify the item on the product page. */
export function categoryRequiresVideo(_category: string): boolean {
  return true;
}

export function isValidImei(raw: string): boolean {
  const d = String(raw || '').replace(/\D/g, '');
  return /^\d{15}$/.test(d);
}

function wordOverlap(a: string, b: string): number {
  const wa = norm(a)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  const wb = new Set(
    norm(b)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
  if (!wa.length || !wb.size) return 0;
  let hit = 0;
  wa.forEach((w) => {
    if (wb.has(w)) hit += 1;
  });
  return hit / Math.max(wa.length, 1);
}

export interface TrustDraftInput {
  name: string;
  description?: string;
  category?: string;
  images: string[];
  /** Same image URL reused on another listing by this seller */
  duplicateListingImage?: boolean;
  /** Raw barcode / UPC / EAN field */
  barcode?: string;
  qrCode?: string;
  serialNumber?: string;
  imei?: string;
  videoProofUploaded?: boolean;
  videoProofUrl?: string;
  /** 0–1 similarity between video and product images (from client scan pipeline until CV is wired) */
  videoImageSimilarity?: number;
  labelProofUploaded?: boolean;
  /** Client-reported image similarity 0–100 (capped server-side) */
  imageSimilarityScore?: number;
  stolenImageSuspected?: boolean;
  /** Client attests similarity scan completed successfully */
  scanPassed?: boolean;
}

export function evaluateTrustDraft(input: TrustDraftInput): TrustEvaluationResult {
  const blockers: string[] = [];
  const suspiciousFlags: string[] = [];
  const breakdown: TrustBreakdownRow[] = [];

  const catReqBarcode = categoryRequiresBarcode(input.category || '');
  const catReqVideo = categoryRequiresVideo(input.category || '');

  const hasBarcodeInput = Boolean((input.barcode || '').trim());
  const barcodeCheck = hasBarcodeInput ? isValidBarcodeStrict(input.barcode || '') : { ok: false, normalized: '', reason: 'empty' as const };

  let barcodeScore = 0;
  if (catReqBarcode) {
    if (!hasBarcodeInput) {
      blockers.push('This category requires a valid barcode (EAN/UPC).');
      breakdown.push({
        key: 'barcode',
        label: 'Barcode',
        state: 'fail',
        detail: 'Required for this category — missing.',
      });
    } else if (!barcodeCheck.ok) {
      blockers.push('Barcode is invalid (format or checksum).');
      breakdown.push({
        key: 'barcode',
        label: 'Barcode',
        state: 'fail',
        detail: `Invalid (${barcodeCheck.reason || 'checksum'}).`,
      });
    } else {
      barcodeScore = TRUST_WEIGHTS.barcode;
      breakdown.push({
        key: 'barcode',
        label: 'Barcode',
        state: 'ok',
        detail: 'Valid GTIN format and checksum.',
      });
    }
  } else {
    if (!hasBarcodeInput) {
      barcodeScore = 0;
      breakdown.push({
        key: 'barcode',
        label: 'Barcode',
        state: 'warn',
        detail: 'Optional — not provided.',
      });
    } else if (!barcodeCheck.ok) {
      blockers.push('Barcode is invalid. Remove it or enter a valid EAN/UPC.');
      breakdown.push({
        key: 'barcode',
        label: 'Barcode',
        state: 'fail',
        detail: 'Invalid format or checksum.',
      });
    } else {
      barcodeScore = TRUST_WEIGHTS.barcode;
      breakdown.push({
        key: 'barcode',
        label: 'Barcode',
        state: 'ok',
        detail: 'Valid GTIN.',
      });
    }
  }

  if (input.duplicateListingImage) {
    blockers.push('One or more images are reused from another of your listings.');
    suspiciousFlags.push('duplicate_images_across_listings');
  }

  const imageCount = (input.images || []).filter(Boolean).length;
  let imageScore = 0;
  if (input.duplicateListingImage) {
    breakdown.push({
      key: 'image',
      label: 'Image originality',
      state: 'fail',
      detail: 'Duplicate image detected across your catalog.',
    });
  } else if (imageCount === 0) {
    breakdown.push({
      key: 'image',
      label: 'Image evidence',
      state: 'fail',
      detail: 'At least one product image is required.',
    });
    blockers.push('Add at least one product image.');
  } else if (!input.duplicateListingImage) {
    const stolen = Boolean(input.stolenImageSuspected);
    const clientSim = Math.max(0, Math.min(100, Number(input.imageSimilarityScore ?? 0)));
    if (stolen) {
      suspiciousFlags.push('possible_stolen_images');
      imageScore = Math.min(4, Math.round(TRUST_WEIGHTS.image * 0.2));
      breakdown.push({
        key: 'image',
        label: 'Image quality / originality',
        state: 'fail',
        detail: 'Possible stock or reused imagery — score capped.',
      });
      blockers.push('Image evidence flagged as reused or stock.');
    } else {
      const base = 6;
      const fromClient = Math.round((clientSim / 100) * (TRUST_WEIGHTS.image - base));
      const fromCount = imageCount >= 3 ? 4 : imageCount >= 2 ? 2 : 0;
      imageScore = Math.min(TRUST_WEIGHTS.image, base + fromClient + fromCount);
      const imgState: TrustCheckState =
        imageScore >= TRUST_WEIGHTS.image * 0.85 ? 'ok' : imageScore >= TRUST_WEIGHTS.image * 0.45 ? 'warn' : 'fail';
      breakdown.push({
        key: 'image',
        label: 'Image quality / originality',
        state: imgState,
        detail:
          imgState === 'ok'
            ? `${imageCount} image(s); similarity signal strong.`
            : `${imageCount} image(s); add angles / run scan to strengthen proof.`,
      });
      if (clientSim < 35 && imageCount < 2) {
        suspiciousFlags.push('weak_image_proof');
      }
    }
  }

  const simRaw = input.videoImageSimilarity;
  const similarity =
    typeof simRaw === 'number' && !Number.isNaN(simRaw) ? Math.max(0, Math.min(1, simRaw)) : undefined;
  const videoClaimed = Boolean(input.videoProofUploaded || (input.videoProofUrl || '').trim());
  let videoScore = 0;

  if (catReqVideo) {
    if (!videoClaimed) {
      blockers.push('This category requires video proof of the product.');
      breakdown.push({
        key: 'video',
        label: 'Video match',
        state: 'fail',
        detail: 'Video proof required for this category.',
      });
    } else if (!input.scanPassed && (similarity == null || similarity < 0.6)) {
      blockers.push('Video does not match product images (similarity below 0.6).');
      breakdown.push({
        key: 'video',
        label: 'Video match',
        state: 'fail',
        detail: `Low similarity (${similarity == null ? 'n/a' : similarity.toFixed(2)}); need ≥ 0.60.`,
      });
    } else {
      videoScore = TRUST_WEIGHTS.video;
      breakdown.push({
        key: 'video',
        label: 'Video match',
        state: 'ok',
        detail: `Video aligns with images (similarity ${similarity.toFixed(2)}).`,
      });
    }
  } else {
    if (!videoClaimed) {
      breakdown.push({
        key: 'video',
        label: 'Video match',
        state: 'warn',
        detail: 'No video — optional for this category.',
      });
    } else if (!input.scanPassed || similarity == null || similarity < 0.6) {
      videoScore = Math.round(TRUST_WEIGHTS.video * (similarity ?? 0) * 0.5);
      breakdown.push({
        key: 'video',
        label: 'Video match',
        state: 'warn',
        detail: 'Video provided but match is weak or scan incomplete.',
      });
    } else {
      videoScore = TRUST_WEIGHTS.video;
      breakdown.push({
        key: 'video',
        label: 'Video match',
        state: 'ok',
        detail: `Strong match (${(similarity ?? 0).toFixed(2)}).`,
      });
    }
  }

  let consistencyScore = 0;
  const name = (input.name || '').trim();
  const desc = (input.description || '').trim();
  const category = (input.category || '').trim();
  const titleWords = norm(name).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const overlapCat = category ? wordOverlap(name, category) : 0;
  const overlapDesc = desc ? wordOverlap(name, desc) : 0;

  if (name.length >= 3) consistencyScore += 6;
  if (desc.length >= 40) consistencyScore += 8;
  else if (desc.length >= 15) consistencyScore += 4;
  if (category && overlapCat >= 0.15) consistencyScore += 8;
  if (desc && overlapDesc >= 0.1) consistencyScore += 8;

  if (hasBarcodeInput && barcodeCheck.ok && titleWords.length) {
    const digitGroups = barcodeCheck.normalized.match(/.{1,4}/g) || [];
    const titleNorm = norm(name);
    const hitsDigits = digitGroups.some((g) => g.length >= 4 && titleNorm.includes(g));
    if (hitsDigits) consistencyScore += 4;
  }

  consistencyScore = Math.min(TRUST_WEIGHTS.consistency, consistencyScore);

  const consState: TrustCheckState =
    consistencyScore >= TRUST_WEIGHTS.consistency * 0.75
      ? 'ok'
      : consistencyScore >= TRUST_WEIGHTS.consistency * 0.45
        ? 'warn'
        : 'fail';
  breakdown.push({
    key: 'consistency',
    label: 'Metadata consistency',
    state: consState,
    detail:
      consState === 'ok'
        ? 'Title, description, and category look aligned.'
        : 'Tighten description and ensure the title fits the category.',
  });

  if (consistencyScore < 12 && (name.length > 0 || desc.length > 0)) {
    suspiciousFlags.push('metadata_inconsistency');
  }

  const totalScore = Math.max(0, Math.min(100, barcodeScore + imageScore + videoScore + consistencyScore));
  const trustBand: TrustEvaluationResult['trustBand'] =
    totalScore >= 80 ? 'high' : totalScore >= 50 ? 'medium' : 'low';

  const hardBlocked = blockers.length > 0;
  const submissionAllowed = !hardBlocked && totalScore >= MIN_TRUST_TO_SUBMIT;

  return {
    barcodeScore,
    imageScore,
    videoScore,
    consistencyScore,
    totalScore,
    trustBand,
    breakdown,
    blockers,
    hardBlocked,
    suspiciousFlags,
    submissionAllowed,
  };
}
