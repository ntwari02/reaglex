import { PaymentGatewayConfig } from '../models/PaymentGatewayConfig';

export class PaymentGatewayDisabledError extends Error {
  readonly code = 'PAYMENT_GATEWAY_DISABLED' as const;

  constructor(public gatewayKey: string) {
    super(`Payment gateway is disabled: ${gatewayKey}`);
    this.name = 'PaymentGatewayDisabledError';
  }
}

/** Canonical keys used for admin toggles and payment routing */
export const PAYMENT_GATEWAY_KEYS = {
  flutterwave: 'flutterwave',
  mtn_momo: 'mtn_momo',
} as const;

type CoreKey = (typeof PAYMENT_GATEWAY_KEYS)[keyof typeof PAYMENT_GATEWAY_KEYS];

const CORE_GATEWAY_DEFAULTS: Array<{
  key: CoreKey;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'issues';
  isEnabled: boolean;
  apiKeyMasked: string;
}> = [
  {
    key: 'flutterwave',
    name: 'Flutterwave',
    type: 'Payment Gateway',
    status: 'online',
    isEnabled: true,
    apiKeyMasked: 'FLW_***',
  },
  {
    key: 'mtn_momo',
    name: 'MTN MoMo Rwanda',
    type: 'Mobile Money',
    status: 'online',
    isEnabled: false,
    apiKeyMasked: 'momo_***',
  },
];

/**
 * Ensures core gateways exist (upsert). Safe for concurrent calls.
 * Call from admin gateway list and from public checkout snapshot.
 */
export async function ensureCorePaymentGateways(): Promise<void> {
  for (const g of CORE_GATEWAY_DEFAULTS) {
    await PaymentGatewayConfig.updateOne(
      { key: g.key },
      {
        $setOnInsert: {
          key: g.key,
          name: g.name,
          type: g.type,
          status: g.status,
          isEnabled: g.isEnabled,
          apiKeyMasked: g.apiKeyMasked,
          issues: [],
          testMode: false,
        },
      },
      { upsert: true }
    );
  }
}

export async function assertPaymentGatewayEnabled(key: CoreKey): Promise<void> {
  await ensureCorePaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key }).lean();
  if (!row || !row.isEnabled) {
    throw new PaymentGatewayDisabledError(key);
  }
}

export async function getPublicGatewayFlags(): Promise<{
  flutterwave: boolean;
  mtn_momo: boolean;
}> {
  await ensureCorePaymentGateways();
  const rows = await PaymentGatewayConfig.find({
    key: { $in: [PAYMENT_GATEWAY_KEYS.flutterwave, PAYMENT_GATEWAY_KEYS.mtn_momo] },
  })
    .select('key isEnabled')
    .lean();
  const map = new Map(rows.map((r) => [r.key, r.isEnabled]));
  return {
    flutterwave: map.get('flutterwave') === true,
    mtn_momo: map.get('mtn_momo') === true,
  };
}
