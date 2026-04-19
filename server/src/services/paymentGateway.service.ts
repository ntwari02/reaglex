import { PaymentGatewayConfig } from '../models/PaymentGatewayConfig';
import {
  ensureAllPaymentGateways,
  GATEWAY_REGISTRY,
  isGatewayFullyConfigured,
} from './paymentGatewayCredentials.service';

export class PaymentGatewayDisabledError extends Error {
  readonly code = 'PAYMENT_GATEWAY_DISABLED' as const;

  constructor(public gatewayKey: string) {
    super(`Payment gateway is disabled or not configured: ${gatewayKey}`);
    this.name = 'PaymentGatewayDisabledError';
  }
}

/** Keys that participate in online checkout (excludes offline/manual). */
export const PAYMENT_GATEWAY_KEYS = {
  flutterwave: 'flutterwave',
  mtn_momo: 'mtn_momo',
  stripe: 'stripe',
  paypal: 'paypal',
  airtel_money: 'airtel_money',
} as const;

export type PaymentGatewayKey = (typeof PAYMENT_GATEWAY_KEYS)[keyof typeof PAYMENT_GATEWAY_KEYS];

/**
 * Ensures core gateways exist (upsert) and removes non-canonical duplicate rows.
 * Safe for concurrent calls.
 */
export async function ensureCorePaymentGateways(): Promise<void> {
  await ensureAllPaymentGateways();
}

export async function assertPaymentGatewayEnabled(key: PaymentGatewayKey): Promise<void> {
  await ensureCorePaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key }).lean();
  if (!row || !row.isEnabled) {
    throw new PaymentGatewayDisabledError(key);
  }
  const configured = await isGatewayFullyConfigured(key);
  if (!configured) {
    throw new PaymentGatewayDisabledError(key);
  }
}

async function flagFor(key: PaymentGatewayKey): Promise<boolean> {
  const row = await PaymentGatewayConfig.findOne({ key }).select('isEnabled').lean();
  return row?.isEnabled === true && (await isGatewayFullyConfigured(key));
}

/** Backward-compatible flags + all checkout providers. */
export async function getPublicGatewayFlags(): Promise<{
  flutterwave: boolean;
  mtn_momo: boolean;
  stripe: boolean;
  paypal: boolean;
  airtel_money: boolean;
}> {
  await ensureCorePaymentGateways();
  const [flutterwave, mtn_momo, stripe, paypal, airtel_money] = await Promise.all([
    flagFor('flutterwave'),
    flagFor('mtn_momo'),
    flagFor('stripe'),
    flagFor('paypal'),
    flagFor('airtel_money'),
  ]);
  return { flutterwave, mtn_momo, stripe, paypal, airtel_money };
}

/** Structured list for `/public/payment-gateways` (enabled ∧ configured only). */
export async function getPublicCheckoutGatewayList(): Promise<Array<{ key: string; name: string; isEnabled: boolean }>> {
  await ensureCorePaymentGateways();
  const rows: Array<{ key: string; name: string; isEnabled: boolean }> = [];
  for (const g of GATEWAY_REGISTRY) {
    if (g.key === 'offline') continue;
    rows.push({
      key: g.key,
      name: g.name,
      isEnabled: await flagFor(g.key as PaymentGatewayKey),
    });
  }
  return rows;
}
