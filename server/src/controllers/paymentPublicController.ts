import { Request, Response } from 'express';
import { getPublicCheckoutGatewayList, getPublicGatewayFlags, ensureCorePaymentGateways } from '../services/paymentGateway.service';
import { PAYMENT_GATEWAY_REGISTRY } from '../financial/paymentGatewayRegistry';

/** Unauthenticated: which payment providers are enabled and fully configured (for checkout UI). */
export async function getPublicPaymentGateways(_req: Request, res: Response) {
  try {
    await ensureCorePaymentGateways();
    const [gateways, flags] = await Promise.all([getPublicCheckoutGatewayList(), getPublicGatewayFlags()]);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.json({
      gateways,
      flags,
      registry: PAYMENT_GATEWAY_REGISTRY.map((g) => ({
        key: g.key,
        name: g.name,
        checkoutMethod: g.checkoutMethod,
        supportsOnlineCheckout: g.supportsOnlineCheckout,
      })),
    });
  } catch (err: any) {
    res.set('Cache-Control', 'no-store, private');
    res.status(500).json({ message: err?.message || 'Failed to load payment gateways' });
  }
}
