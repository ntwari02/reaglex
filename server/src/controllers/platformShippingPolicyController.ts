import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getPlatformShippingContext,
  getPlatformShippingPolicy,
  updatePlatformShippingPolicy,
} from '../services/platformShippingPolicy.service';

/** GET /api/shipping/platform-context — buyers, sellers, checkout */
export async function getPublicPlatformContext(_req: unknown, res: Response) {
  try {
    const ctx = await getPlatformShippingContext();
    return res.json(ctx);
  } catch (e: any) {
    console.error('getPublicPlatformContext', e);
    return res.status(500).json({ message: 'Failed to load platform shipping context' });
  }
}

/** GET /api/admin/logistics/platform-policy */
export async function adminGetPlatformPolicy(_req: AuthenticatedRequest, res: Response) {
  try {
    const [policy, context] = await Promise.all([
      getPlatformShippingPolicy(),
      getPlatformShippingContext(),
    ]);
    return res.json({ policy, context });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to load policy' });
  }
}

/** PUT /api/admin/logistics/platform-policy */
export async function adminUpdatePlatformPolicy(req: AuthenticatedRequest, res: Response) {
  try {
    const body = req.body || {};
    const policy = await updatePlatformShippingPolicy({
      marketCode: body.marketCode,
      marketName: body.marketName,
      currency: body.currency,
      sellerCanDefineZones: body.sellerCanDefineZones,
      feeLimits: body.feeLimits,
      etaLimits: body.etaLimits,
      enabledMethods: body.enabledMethods,
      platformFreeShippingThreshold: body.platformFreeShippingThreshold,
      defaultWarehouseCountry: body.defaultWarehouseCountry,
      defaultWarehouseCity: body.defaultWarehouseCity,
      buyerLocationPickerEnabled: body.buyerLocationPickerEnabled,
    });
    const context = await getPlatformShippingContext();
    return res.json({ policy, context });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || 'Failed to update policy' });
  }
}
