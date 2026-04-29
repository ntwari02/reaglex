import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProductVerification } from '../models/ProductVerification';
import { SellerTrustProfile } from '../models/SellerTrustProfile';
import { Product } from '../models/Product';
import { recalculateSellerTrust, runProductVerification } from '../services/productVerification.service';

const createRecordSchema = z.object({
  productId: z.string().min(1),
  identifiers: z.object({
    barcode: z.string().optional(),
    ean: z.string().optional(),
    upc: z.string().optional(),
    qrCode: z.string().optional(),
    serialNumber: z.string().optional(),
    imei: z.string().optional(),
    rfid: z.string().optional(),
    nfc: z.string().optional(),
  }).optional(),
  aiInput: z.object({
    imageSimilarityScore: z.number().min(0).max(100).optional(),
    categoryConsistencyScore: z.number().min(0).max(100).optional(),
    stolenImageSuspected: z.boolean().optional(),
    videoProofUploaded: z.boolean().optional(),
    labelProofUploaded: z.boolean().optional(),
    notes: z.array(z.string()).optional(),
  }).optional(),
});

const trustAdjustSchema = z.object({
  sellerId: z.string().min(1),
  delta: z.number().min(-40).max(40),
  reason: z.string().min(2),
});

export async function createOrUpdateVerificationRecord(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Authentication required' });
    const body = createRecordSchema.parse(req.body || {});
    const product = await Product.findById(body.productId).select('sellerId').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && String((product as any).sellerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden: product ownership mismatch' });
    }
    const verification = await runProductVerification({
      productId: body.productId,
      sellerId: String((product as any).sellerId),
      actorId: req.user.id,
      identifiers: body.identifiers,
      aiInput: body.aiInput,
    });
    return res.status(201).json({ verification });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid payload', errors: err.flatten() });
    return res.status(500).json({ message: err?.message || 'Failed to create verification record' });
  }
}

export async function getVerificationStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: 'Invalid productId' });
    const verification = await ProductVerification.findOne({ productId }).lean();
    if (!verification) return res.status(404).json({ message: 'Verification record not found' });
    return res.json({ verification });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to fetch verification status' });
  }
}

export async function runAiVerification(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Authentication required' });
    const body = createRecordSchema.parse(req.body || {});
    const product = await Product.findById(body.productId).select('sellerId').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && String((product as any).sellerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden: product ownership mismatch' });
    }
    const verification = await runProductVerification({
      productId: body.productId,
      sellerId: String((product as any).sellerId),
      actorId: req.user.id,
      identifiers: body.identifiers,
      aiInput: body.aiInput,
    });
    return res.json({ verification, message: 'AI verification complete' });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid payload', errors: err.flatten() });
    return res.status(500).json({ message: err?.message || 'Failed to run AI verification' });
  }
}

export async function listSuspiciousProductsForAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = '1', limit = '30', status } = req.query as { page?: string; limit?: string; status?: string };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const filter: any = { $or: [{ status: 'flagged' }, { riskLevel: 'high' }, { suspiciousFlags: { $exists: true, $ne: [] } }] };
    if (status) filter.status = status;
    const [rows, total] = await Promise.all([
      ProductVerification.find(filter).sort({ updatedAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      ProductVerification.countDocuments(filter),
    ]);
    return res.json({ items: rows, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to list suspicious products' });
  }
}

export async function getSellerTrustProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = req.params.sellerId || req.user?.id;
    if (!sellerId) return res.status(400).json({ message: 'sellerId required' });
    const profile = await SellerTrustProfile.findOne({ sellerId }).lean();
    return res.json({ profile: profile || null });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || 'Failed to fetch trust profile' });
  }
}

export async function updateSellerTrustScore(req: AuthenticatedRequest, res: Response) {
  try {
    const { sellerId, delta, reason } = trustAdjustSchema.parse(req.body || {});
    const profile = await recalculateSellerTrust(sellerId);
    if (!profile) return res.status(404).json({ message: 'Seller trust profile not found' });
    profile.trustScore = Math.max(0, Math.min(100, (profile.trustScore || 0) + delta));
    profile.updatedAt = new Date();
    await profile.save();
    return res.json({ message: `Trust score adjusted: ${reason}`, profile });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Invalid payload', errors: err.flatten() });
    return res.status(500).json({ message: err?.message || 'Failed to update trust score' });
  }
}

