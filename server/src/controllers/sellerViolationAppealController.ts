import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { SellerViolationAppeal } from '../models/SellerViolationAppeal';

const appealSchema = z.object({
  ticketNumber: z.string().min(4, 'Ticket number is required').max(64),
  explanation: z.string().min(20, 'Please provide a detailed explanation (at least 20 characters)').max(8000),
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
});

const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

/** POST /api/seller/violations/appeals */
export async function submitViolationAppeal(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const body = appealSchema.parse(req.body);
    const ticket = body.ticketNumber.trim().toUpperCase();

    const existing = await SellerViolationAppeal.findOne({
      sellerId,
      ticketNumber: ticket,
      status: { $in: ['pending', 'reviewing'] },
    }).lean();

    if (existing) {
      return res.status(409).json({
        message: 'An appeal for this ticket is already under review.',
        appealId: existing._id,
      });
    }

    const appeal = await SellerViolationAppeal.create({
      sellerId,
      ticketNumber: ticket,
      explanation: body.explanation.trim(),
      evidenceUrls: body.evidenceUrls || [],
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Appeal submitted. Our Trust & Safety team will respond within 3–5 business days.',
      appeal: {
        id: appeal._id,
        ticketNumber: appeal.ticketNumber,
        status: appeal.status,
        createdAt: appeal.createdAt,
      },
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0]?.message || 'Invalid appeal data' });
    }
    console.error('[sellerViolationAppeal] submit', err);
    return res.status(500).json({ message: 'Failed to submit appeal' });
  }
}

/** GET /api/seller/violations/appeals — recent appeals for signed-in seller */
export async function listViolationAppeals(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const appeals = await SellerViolationAppeal.find({ sellerId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('ticketNumber status createdAt updatedAt')
      .lean();

    return res.json({ appeals });
  } catch (err) {
    console.error('[sellerViolationAppeal] list', err);
    return res.status(500).json({ message: 'Failed to load appeals' });
  }
}
