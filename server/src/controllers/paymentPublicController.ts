import { Request, Response } from 'express';
import { getPublicCheckoutGatewayList } from '../services/paymentGateway.service';

/** Unauthenticated: which payment providers are enabled and fully configured (for checkout UI). */
export async function getPublicPaymentGateways(_req: Request, res: Response) {
  try {
    const gateways = await getPublicCheckoutGatewayList();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.json({ gateways });
  } catch (err: any) {
    res.set('Cache-Control', 'no-store, private');
    res.status(500).json({ message: err?.message || 'Failed to load payment gateways' });
  }
}
