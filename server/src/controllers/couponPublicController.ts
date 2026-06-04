import { Request, Response } from 'express';
import { MarketingCoupon } from '../models/MarketingCoupon';

/** Public coupon validation for buyer cart (no auth). */
export async function validateCoupon(req: Request, res: Response) {
  try {
    const code = String(req.query.code || '')
      .trim()
      .toUpperCase();
    const subtotal = Number(req.query.subtotal || 0);

    if (!code) {
      return res.status(400).json({ message: 'Coupon code required' });
    }

    const coupon = await MarketingCoupon.findOne({ code }).lean();
    if (!coupon || coupon.status !== 'active') {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    if (
      coupon.usageLimit != null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    if (coupon.minOrder != null && subtotal < coupon.minOrder) {
      return res.status(400).json({
        message: `Minimum order of ${coupon.minOrder} required for this coupon`,
      });
    }

    const discount_type =
      coupon.type === 'percentage' ? 'percentage' : 'fixed';
    const discount_value = coupon.type === 'free_shipping' ? 0 : coupon.value;

    res.set('Cache-Control', 'no-store, private');
    res.json({
      code: coupon.code,
      discount_type,
      discount_value,
      max_discount_amount: undefined,
      type: coupon.type,
    });
  } catch (err) {
    console.error('[couponPublic] validate failed:', err);
    res.status(500).json({ message: 'Could not validate coupon' });
  }
}
