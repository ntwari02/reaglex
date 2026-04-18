import { Request, Response } from 'express';
import { getPublicGatewayFlags } from '../services/paymentGateway.service';

/** Unauthenticated: which payment providers are enabled (for checkout UI). */
export async function getPublicPaymentGateways(_req: Request, res: Response) {
  try {
    const flags = await getPublicGatewayFlags();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.json({
      gateways: [
        { key: 'flutterwave', name: 'Flutterwave', isEnabled: flags.flutterwave },
        { key: 'mtn_momo', name: 'MTN MoMo Rwanda', isEnabled: flags.mtn_momo },
      ],
    });
  } catch (err: any) {
    res.set('Cache-Control', 'no-store, private');
    res.status(500).json({ message: err?.message || 'Failed to load payment gateways' });
  }
}
