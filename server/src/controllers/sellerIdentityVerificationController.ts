import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { SellerSettings, IIdentityKyc } from '../models/SellerSettings';
import { User } from '../models/User';
import {
  verifyDocumentImages,
  fetchImageBuffer,
  isMicroblinkConfigured,
  isAcceptableDocumentOutcome,
  isAcceptableFaceOutcome,
  buildMicroblinkKycMeta,
  MicroblinkApiError,
  getMicroblinkDiagnostics,
  microblinkUpstreamHint,
} from '../services/microblink.service';
import { uploadAnyBufferToCloudinary } from '../utils/uploadToCloudinary';
import { recalculateSellerTrust } from '../services/productVerification.service';
import { emitSellerKycUpdated } from '../services/sellerKycRealtime.service';
import { publishEligibleProductsAfterKyc } from '../services/sellerKyc.service';

const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function defaultIdentityKyc(): IIdentityKyc {
  return {
    step: 'not_started',
    trustBonuses: {
      documentVerified: false,
      faceVerified: false,
      phoneVerified: false,
      businessVerified: false,
    },
  };
}

async function ensureSettings(sellerId: mongoose.Types.ObjectId) {
  let settings = await SellerSettings.findOne({ sellerId });
  if (!settings) {
    settings = await SellerSettings.create({ sellerId });
  }
  if (!settings.identityKyc) {
    settings.identityKyc = defaultIdentityKyc();
  }
  return settings;
}

function computeTrustBonuses(settings: {
  identityKyc?: IIdentityKyc;
  verificationDocuments?: { businessLicense?: string | null };
  businessName?: string;
}, user: { phone?: string } | null) {
  const kyc = settings.identityKyc || defaultIdentityKyc();
  return {
    documentVerified: Boolean(kyc.document?.verified),
    faceVerified: Boolean(kyc.face?.verified),
    phoneVerified: Boolean(user?.phone && String(user.phone).trim().length >= 8),
    businessVerified: Boolean(
      settings.verificationDocuments?.businessLicense ||
        (settings.businessName && settings.businessName.trim().length > 2),
    ),
  };
}

const IDENTITY_KYC_FOLDER = 'spacilly/sellers/identity-kyc';

async function persistIdentityImage(file?: Express.Multer.File): Promise<string | undefined> {
  if (!file?.buffer?.length) return undefined;
  try {
    return await uploadAnyBufferToCloudinary(file.buffer, IDENTITY_KYC_FOLDER);
  } catch (err) {
    console.warn('[identity-kyc] Cloudinary upload failed:', err);
    return undefined;
  }
}

function identityErrorPayload(error: unknown): { status: number; message: string; hint?: string; upstreamStatus?: number } {
  if (error instanceof MicroblinkApiError) {
    const hint = microblinkUpstreamHint(error.httpStatus);
    const status =
      error.httpStatus === 401 || error.httpStatus === 403
        ? 502
        : error.httpStatus >= 400 && error.httpStatus < 500
          ? error.httpStatus
          : 502;
    return {
      status,
      message: error.message,
      hint,
      upstreamStatus: error.httpStatus,
    };
  }
  const message = error instanceof Error ? error.message : 'Request failed';
  return { status: 500, message };
}

function trustBonusPoints(bonuses: IIdentityKyc['trustBonuses']): number {
  if (!bonuses) return 0;
  let pts = 0;
  if (bonuses.documentVerified) pts += 25;
  if (bonuses.faceVerified) pts += 25;
  if (bonuses.phoneVerified) pts += 15;
  if (bonuses.businessVerified) pts += 35;
  return pts;
}

export async function getIdentityVerificationStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    const [settings, user] = await Promise.all([
      SellerSettings.findOne({ sellerId }).select('identityKyc verificationDocuments businessName'),
      User.findById(sellerId).select('phone fullName dateOfBirth location'),
    ]);

    const identityKyc = settings?.identityKyc || defaultIdentityKyc();
    const trustBonuses = computeTrustBonuses(settings || {}, user);

    const microblink = getMicroblinkDiagnostics();

    return res.json({
      configured: microblink.configured,
      microblink,
      identityKyc: {
        ...identityKyc,
        trustBonuses,
      },
      trustBonusPoints: trustBonusPoints(trustBonuses),
      profilePreview: {
        fullName: identityKyc.document?.fullName || user?.fullName,
        country: identityKyc.document?.country,
        dateOfBirth: identityKyc.document?.dateOfBirth,
        idNumber: identityKyc.document?.idNumber ? '••••' + String(identityKyc.document.idNumber).slice(-4) : undefined,
      },
    });
  } catch (error: unknown) {
    console.error('getIdentityVerificationStatus error:', error);
    return res.status(500).json({ message: 'Failed to load identity verification status' });
  }
}

export async function scanIdentityDocument(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    const microblinkDiag = getMicroblinkDiagnostics();
    if (!microblinkDiag.configured) {
      return res.status(503).json({
        message: 'Identity verification is not configured. Contact support.',
      });
    }
    if (microblinkDiag.secretMayBeCorrupted) {
      return res.status(503).json({
        message: 'Identity verification is misconfigured on the server (invalid Microblink secret).',
        hint:
          'The API secret appears corrupted (often + turned into space on Render). Set MICROBLINK_SECRET in quotes or use MICROBLINK_SECRET_B64.',
      });
    }

    const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
    const front = files?.imageFront?.[0];
    if (!front) {
      return res.status(400).json({ message: 'Front of ID document is required (imageFront).' });
    }
    const back = files?.imageBack?.[0];

    const result = await verifyDocumentImages({
      imageFront: {
        buffer: front.buffer,
        filename: front.originalname || 'front.jpg',
        mimetype: front.mimetype || 'image/jpeg',
      },
      imageBack: back
        ? {
            buffer: back.buffer,
            filename: back.originalname || 'back.jpg',
            mimetype: back.mimetype || 'image/jpeg',
          }
        : undefined,
    });

    const accepted = isAcceptableDocumentOutcome(result);
    const settings = await ensureSettings(sellerId);

    const [frontUrl, backUrl] = await Promise.all([
      persistIdentityImage(front),
      back ? persistIdentityImage(back) : Promise.resolve(undefined),
    ]);

    settings.identityKyc = {
      ...(settings.identityKyc || defaultIdentityKyc()),
      step: accepted ? 'face_pending' : 'failed',
      document: {
        type: result.documentType,
        fullName: result.fullName,
        firstName: result.firstName,
        lastName: result.lastName,
        idNumber: result.idNumber,
        dateOfBirth: parseDate(result.dateOfBirth),
        expiryDate: parseDate(result.documentExpiry),
        country: result.country || result.nationality,
        nationality: result.nationality,
        verified: accepted,
        verifiedAt: accepted ? new Date() : undefined,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        ...buildMicroblinkKycMeta(result),
        rejectionReason: accepted ? undefined : result.failureMessages.join('; ') || 'Document verification failed',
      },
      lastAttemptAt: new Date(),
    };

    if (accepted && result.fullName) {
      const user = await User.findById(sellerId);
      if (user) {
        if (!user.fullName || user.fullName.trim().length < 2) {
          user.fullName = result.fullName;
        }
        if (result.dateOfBirth) {
          const dob = parseDate(result.dateOfBirth);
          if (dob) user.dateOfBirth = dob;
        }
        if (result.country && !user.location) {
          user.location = result.country;
        }
        await user.save();
      }

      if (result.country) {
        settings.businessAddress = {
          ...settings.businessAddress,
          country: result.country,
        };
      }
      if (result.fullName && !settings.businessName) {
        settings.businessName = result.fullName;
      }
    }

    const user = await User.findById(sellerId).select('phone');
    settings.identityKyc.trustBonuses = computeTrustBonuses(settings, user);
    await settings.save();
    await recalculateSellerTrust(String(sellerId));
    void emitSellerKycUpdated(String(sellerId), 'document').catch((err) =>
      console.error('emitSellerKycUpdated document:', err),
    );

    return res.json({
      message: accepted
        ? 'Identity document verified successfully'
        : 'Document could not be verified. Please retry with a clearer photo.',
      accepted,
      identityKyc: settings.identityKyc,
      extraction: {
        fullName: result.fullName,
        idNumber: result.idNumber ? '••••' + result.idNumber.slice(-4) : undefined,
        dateOfBirth: result.dateOfBirth,
        documentExpiry: result.documentExpiry,
        country: result.country,
        documentType: result.documentType,
      },
      microblink: {
        recommendedOutcome: result.recommendedOutcome,
        verificationResult: result.verificationResult,
        checksPassed: result.checksPassed,
        checksFailed: result.checksFailed,
      },
    });
  } catch (error: unknown) {
    console.error('scanIdentityDocument error:', error);
    const { status, message, hint, upstreamStatus } = identityErrorPayload(error);
    return res.status(status).json({ message, hint, upstreamStatus });
  }
}

export async function matchIdentityFace(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    if (!isMicroblinkConfigured()) {
      return res.status(503).json({ message: 'Identity verification is not configured.' });
    }

    const selfie =
      req.file ??
      (req.files as { imageSelfie?: Express.Multer.File[] } | undefined)?.imageSelfie?.[0];
    if (!selfie) {
      return res.status(400).json({ message: 'Selfie image is required (imageSelfie).' });
    }

    const settings = await ensureSettings(sellerId);
    const doc = settings.identityKyc?.document;
    if (!doc?.verified || !doc.frontImageUrl) {
      return res.status(400).json({
        message: 'Verify your ID document before taking a selfie.',
      });
    }

    const frontImage = await fetchImageBuffer(doc.frontImageUrl);
    let backImage: Awaited<ReturnType<typeof fetchImageBuffer>> | undefined;
    if (doc.backImageUrl) {
      try {
        backImage = await fetchImageBuffer(doc.backImageUrl);
      } catch {
        backImage = undefined;
      }
    }

    const result = await verifyDocumentImages({
      imageFront: frontImage,
      imageBack: backImage,
      imageSelfie: {
        buffer: selfie.buffer,
        filename: selfie.originalname || 'selfie.jpg',
        mimetype: selfie.mimetype || 'image/jpeg',
      },
    });

    const accepted = isAcceptableFaceOutcome(result);
    const selfieImageUrl = await persistIdentityImage(selfie);
    settings.identityKyc = {
      ...(settings.identityKyc || defaultIdentityKyc()),
      step: accepted ? 'completed' : 'failed',
      face: {
        verified: accepted,
        verifiedAt: accepted ? new Date() : undefined,
        matchScore: result.faceMatchScore,
        livenessScore: result.livenessScore,
        selfieImageUrl,
        ...buildMicroblinkKycMeta(result),
        rejectionReason: accepted
          ? undefined
          : result.failureMessages.join('; ') || 'Face match failed',
      },
      lastAttemptAt: new Date(),
    };

    const user = await User.findById(sellerId).select('phone');
    settings.identityKyc.trustBonuses = computeTrustBonuses(settings, user);
    await settings.save();

    if (accepted) {
      await User.findByIdAndUpdate(sellerId, {
        $set: {
          sellerVerificationStatus: 'pending',
          isSellerVerified: false,
        },
      });
    }

    await recalculateSellerTrust(String(sellerId));

    let productsPublished = 0;
    if (accepted) {
      productsPublished = await publishEligibleProductsAfterKyc(sellerId);
    }

    void emitSellerKycUpdated(String(sellerId), 'face', { productsPublished }).catch((err) =>
      console.error('emitSellerKycUpdated face:', err),
    );

    return res.json({
      message: accepted
        ? 'Face verified. Your application is pending final admin review.'
        : 'Face verification failed. Ensure good lighting and that you match your ID photo.',
      accepted,
      productsPublished,
      identityKyc: settings.identityKyc,
      microblink: {
        recommendedOutcome: result.recommendedOutcome,
        faceMatchScore: result.faceMatchScore,
        livenessScore: result.livenessScore,
      },
    });
  } catch (error: unknown) {
    console.error('matchIdentityFace error:', error);
    const { status, message, hint, upstreamStatus } = identityErrorPayload(error);
    return res.status(status).json({ message, hint, upstreamStatus });
  }
}

export async function applyIdentityProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) return res.status(401).json({ message: 'Authentication required' });

    const settings = await SellerSettings.findOne({ sellerId });
    const doc = settings?.identityKyc?.document;
    if (!doc?.verified) {
      return res.status(400).json({ message: 'Complete document verification first.' });
    }

    const user = await User.findById(sellerId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (doc.fullName) user.fullName = doc.fullName;
    if (doc.dateOfBirth) user.dateOfBirth = doc.dateOfBirth;
    if (doc.country) user.location = doc.country;
    await user.save();

    if (settings) {
      if (doc.country) {
        settings.businessAddress = { ...settings.businessAddress, country: doc.country };
      }
      if (doc.fullName) settings.businessName = doc.fullName;
      await settings.save();
    }

    return res.json({
      message: 'Profile updated from verified identity',
      profile: {
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        country: doc.country,
      },
    });
  } catch (error: unknown) {
    console.error('applyIdentityProfile error:', error);
    return res.status(500).json({ message: 'Failed to apply profile data' });
  }
}
