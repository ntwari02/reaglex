import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { quoteSpacillyShipments } from '../services/spacillyShipping.service';
import type { SpacillyShippingMethodKey } from '../types/spacillyShipping.types';
import {
  aggregateDeliveryEstimate,
  findDeliveryDestination,
} from '../services/deliveryDestination.service';

function normalizeSelectedMethods(raw: unknown): Record<string, SpacillyShippingMethodKey> {
  const selectedMethods: Record<string, SpacillyShippingMethodKey> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, string>)) {
      const m = String(v || 'standard').toLowerCase();
      if (m === 'international') selectedMethods[k] = 'express';
      else if (m === 'standard' || m === 'express' || m === 'pickup') selectedMethods[k] = m;
      else selectedMethods[k] = 'standard';
    }
  }
  return selectedMethods;
}

function normalizeLines(raw: unknown): Array<{ productId: string; quantity: number }> {
  return (Array.isArray(raw) ? raw : [])
    .map((l: any) => ({
      productId: String(l.productId || l.product_id || '').trim(),
      quantity: Math.max(1, Math.min(999, Number(l.quantity) || 1)),
    }))
    .filter((l) => l.productId);
}

/**
 * POST /api/shipping/quote
 * Authenticated buyer — preview or finalize-precursor quote.
 * `estimate: true` allows a coarse address (city + country) for cart previews.
 */
export async function postShippingQuote(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const body = req.body as {
      lines?: unknown;
      shippingAddress?: {
        full_name?: string;
        phone?: string;
        address_line1?: string;
        address_line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
      selectedMethods?: unknown;
      estimate?: boolean;
    };

    const lines = normalizeLines(body.lines);
    if (!lines.length) {
      return res.status(400).json({ message: 'lines array required' });
    }

    const sh = body.shippingAddress || {};
    const estimate = Boolean(body.estimate);
    const country = String(sh.country || '').trim();
    const city = String(sh.city || '').trim();

    let shippingAddress: Parameters<typeof quoteSpacillyShipments>[0]['shippingAddress'];

    if (estimate) {
      if (!country || !city) {
        return res.status(400).json({ message: 'estimate requires shippingAddress.country and city' });
      }
      shippingAddress = {
        full_name: String(sh.full_name || 'Delivery estimate').trim() || 'Delivery estimate',
        phone: sh.phone || '000',
        address_line1: String(sh.address_line1 || `${city} (estimate)`).trim(),
        address_line2: sh.address_line2 || '',
        city,
        state: String(sh.state || '').trim() || '—',
        postal_code: String(sh.postal_code || '').trim() || '00000',
        country,
      };
    } else {
      if (!sh.full_name || !sh.address_line1 || !sh.city || !sh.country) {
        return res.status(400).json({ message: 'Incomplete shippingAddress' });
      }
      shippingAddress = {
        full_name: sh.full_name,
        phone: sh.phone,
        address_line1: sh.address_line1,
        address_line2: sh.address_line2,
        city: sh.city,
        state: sh.state,
        postal_code: sh.postal_code,
        country: sh.country,
      };
    }

    const selectedMethods = normalizeSelectedMethods(body.selectedMethods);

    const out = await quoteSpacillyShipments({
      lines,
      shippingAddress,
      selectedMethods,
    });

    const dest = await findDeliveryDestination(country, city);
    const deliveryEstimate = aggregateDeliveryEstimate(out.groups, dest, {
      city,
      country: dest?.countryName || country,
    });

    return res.json({
      groups: out.groups,
      totalShipping: out.totalShipping,
      addressFingerprint: out.addressFingerprint,
      warnings: out.warnings,
      isEstimate: estimate,
      deliveryEstimate,
      destination: dest
        ? {
            countryCode: dest.countryCode,
            countryName: dest.countryName,
            city: dest.city,
            displayLabel: dest.displayLabel,
          }
        : null,
    });
  } catch (e: any) {
    console.error('postShippingQuote', e);
    return res.status(500).json({ message: 'Failed to quote shipping' });
  }
}

/**
 * POST /api/shipping/estimate
 * Public cart preview — same engine as checkout, coarse destination only (no auth).
 */
export async function postShippingEstimatePublic(req: any, res: Response) {
  try {
    const body = req.body as {
      lines?: unknown;
      destination?: { country?: string; city?: string; state?: string; postal_code?: string };
      selectedMethods?: unknown;
    };

    const lines = normalizeLines(body.lines);
    if (!lines.length) {
      return res.status(400).json({ message: 'lines array required' });
    }

    const dest = body.destination || {};
    const country = String(dest.country || '').trim();
    const city = String(dest.city || '').trim();
    if (!country || !city) {
      return res.status(400).json({ message: 'destination.country and destination.city required' });
    }

    const shippingAddress = {
      full_name: 'Cart shipping estimate',
      phone: '000',
      address_line1: `${city} (estimate)`,
      address_line2: '',
      city,
      state: String(dest.state || '').trim() || '—',
      postal_code: String(dest.postal_code || '').trim() || '00000',
      country,
    };

    const selectedMethods = normalizeSelectedMethods(body.selectedMethods);

    const out = await quoteSpacillyShipments({
      lines,
      shippingAddress,
      selectedMethods,
    });

    const deliveryDest = await findDeliveryDestination(country, city);
    const deliveryEstimate = aggregateDeliveryEstimate(out.groups, deliveryDest, {
      city,
      country: deliveryDest?.countryName || country,
    });

    return res.json({
      groups: out.groups,
      totalShipping: out.totalShipping,
      addressFingerprint: out.addressFingerprint,
      warnings: out.warnings,
      isEstimate: true,
      deliveryEstimate,
      destination: deliveryDest
        ? {
            countryCode: deliveryDest.countryCode,
            countryName: deliveryDest.countryName,
            city: deliveryDest.city,
            displayLabel: deliveryDest.displayLabel,
          }
        : null,
    });
  } catch (e: any) {
    console.error('postShippingEstimatePublic', e);
    return res.status(500).json({ message: 'Failed to estimate shipping' });
  }
}
