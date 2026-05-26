import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { SellerAdvertisingLead } from '../models/SellerAdvertisingLead';

const leadSchema = z.object({
  companyName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  budget: z.string().max(64).optional(),
  adType: z.string().min(1).max(120),
  message: z.string().max(4000).optional(),
});

/** POST /api/seller/advertising/inquiries — seller or guest advertising interest */
export async function createAdvertisingInquiry(req: AuthenticatedRequest, res: Response) {
  try {
    const body = leadSchema.parse(req.body);
    const sellerId = req.user?.id;

    const lead = await SellerAdvertisingLead.create({
      sellerId: sellerId || undefined,
      companyName: body.companyName,
      email: body.email,
      budget: body.budget,
      adType: body.adType,
      message: body.message,
      status: 'new',
    });

    return res.status(201).json({
      message: 'Thanks — our team will contact you shortly.',
      leadId: lead._id,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid inquiry data', errors: err.flatten() });
    }
    console.error('[sellerAdvertising] create', err);
    return res.status(500).json({ message: 'Failed to submit inquiry' });
  }
}
