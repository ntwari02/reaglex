import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { quoteReaglexShipments } from '../services/reaglexShipping.service';
import type { ReaglexShippingMethodKey } from '../types/reaglexShipping.types';

/**
 * POST /api/shipping/quote
 * Authenticated buyer — preview Reaglex shipping for cart lines + address.
 */
export async function postShippingQuote(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const body = req.body as {
      lines?: Array<{ productId?: string; product_id?: string; quantity?: number }>;
      shippingAddress?: {
        full_name: string;
        phone?: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state?: string;
        postal_code?: string;
        country: string;
      };
      selectedMethods?: Record<string, string>;
    };

    const lines = (body.lines || [])
      .map((l) => ({
        productId: String(l.productId || l.product_id || '').trim(),
        quantity: Math.max(1, Math.min(999, Number(l.quantity) || 1)),
      }))
      .filter((l) => l.productId);

    if (!lines.length) {
      return res.status(400).json({ message: 'lines array required' });
    }

    const sh = body.shippingAddress;
    if (!sh?.full_name || !sh?.address_line1 || !sh?.city || !sh?.country) {
      return res.status(400).json({ message: 'Incomplete shippingAddress' });
    }

    const selectedMethods: Record<string, ReaglexShippingMethodKey> = {};
    if (body.selectedMethods && typeof body.selectedMethods === 'object') {
      for (const [k, v] of Object.entries(body.selectedMethods)) {
        const m = String(v || 'standard').toLowerCase();
        if (m === 'international') selectedMethods[k] = 'express';
        else if (m === 'standard' || m === 'express' || m === 'pickup') selectedMethods[k] = m;
        else selectedMethods[k] = 'standard';
      }
    }

    const out = await quoteReaglexShipments({
      lines,
      shippingAddress: {
        full_name: sh.full_name,
        phone: sh.phone,
        address_line1: sh.address_line1,
        address_line2: sh.address_line2,
        city: sh.city,
        state: sh.state,
        postal_code: sh.postal_code,
        country: sh.country,
      },
      selectedMethods,
    });

    return res.json({
      groups: out.groups,
      totalShipping: out.totalShipping,
      addressFingerprint: out.addressFingerprint,
      warnings: out.warnings,
    });
  } catch (e: any) {
    console.error('postShippingQuote', e);
    return res.status(500).json({ message: 'Failed to quote shipping' });
  }
}
