/**
 * Canonical payment gateway registry — single source of truth.
 * Checkout, TransactionLog, admin UI, and webhooks all reference these keys.
 * Enabling a gateway = save credentials in Admin → Finance → Payment Gateways.
 */

import type { CheckoutPaymentProcessor } from '../services/paymentService';

export type GatewayCredentialProfile =
  | 'flutterwave'
  | 'mtn_momo'
  | 'airtel_api'
  | 'stripe'
  | 'paypal'
  | 'generic_api_secret'
  | 'none';

export type CanonicalGatewayKey =
  | 'offline'
  | 'flutterwave'
  | 'mtn_momo'
  | 'airtel_money'
  | 'stripe'
  | 'paypal';

export type PaymentGatewayRegistryEntry = {
  /** Mongo / admin config key */
  key: CanonicalGatewayKey;
  /** Value used in Order.payment.provider & initializePayment */
  checkoutMethod: CheckoutPaymentProcessor | null;
  name: string;
  type: string;
  profile: GatewayCredentialProfile;
  defaultEnabled: boolean;
  /** Shown at checkout when enabled + configured */
  supportsOnlineCheckout: boolean;
  /** Default currencies (hint for checkout) */
  currencies?: string[];
};

export const PAYMENT_GATEWAY_REGISTRY: PaymentGatewayRegistryEntry[] = [
  {
    key: 'offline',
    checkoutMethod: null,
    name: 'Offline / Manual',
    type: 'Manual',
    profile: 'none',
    defaultEnabled: false,
    supportsOnlineCheckout: false,
  },
  {
    key: 'flutterwave',
    checkoutMethod: 'flutterwave',
    name: 'Flutterwave',
    type: 'Payment Gateway',
    profile: 'flutterwave',
    defaultEnabled: true,
    supportsOnlineCheckout: true,
    currencies: ['RWF', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'UGX', 'TZS'],
  },
  {
    key: 'mtn_momo',
    checkoutMethod: 'momo',
    name: 'MTN MoMo Rwanda',
    type: 'Mobile Money',
    profile: 'mtn_momo',
    defaultEnabled: false,
    supportsOnlineCheckout: true,
    currencies: ['RWF', 'EUR'],
  },
  {
    key: 'airtel_money',
    checkoutMethod: 'airtel',
    name: 'Airtel Money',
    type: 'Mobile Money',
    profile: 'airtel_api',
    defaultEnabled: false,
    supportsOnlineCheckout: true,
    currencies: ['RWF'],
  },
  {
    key: 'stripe',
    checkoutMethod: 'stripe',
    name: 'Stripe',
    type: 'Card Payments',
    profile: 'stripe',
    defaultEnabled: false,
    supportsOnlineCheckout: true,
    currencies: ['USD', 'EUR', 'GBP', 'RWF'],
  },
  {
    key: 'paypal',
    checkoutMethod: 'paypal',
    name: 'PayPal',
    type: 'Digital Wallet',
    profile: 'paypal',
    defaultEnabled: false,
    supportsOnlineCheckout: true,
    currencies: ['USD', 'EUR', 'GBP'],
  },
];
const CHECKOUT_TO_KEY: Record<CheckoutPaymentProcessor, CanonicalGatewayKey> = {
  flutterwave: 'flutterwave',
  momo: 'mtn_momo',
  stripe: 'stripe',
  paypal: 'paypal',
  airtel: 'airtel_money',
};

const KEY_TO_CHECKOUT: Partial<Record<CanonicalGatewayKey, CheckoutPaymentProcessor>> = Object.fromEntries(
  PAYMENT_GATEWAY_REGISTRY.filter((g) => g.checkoutMethod).map((g) => [g.key, g.checkoutMethod!]),
) as Partial<Record<CanonicalGatewayKey, CheckoutPaymentProcessor>>;

export function gatewayKeyFromCheckoutMethod(method: CheckoutPaymentProcessor): CanonicalGatewayKey {
  return CHECKOUT_TO_KEY[method];
}

export function checkoutMethodFromGatewayKey(key: string): CheckoutPaymentProcessor | null {
  const row = PAYMENT_GATEWAY_REGISTRY.find((g) => g.key === key);
  return row?.checkoutMethod ?? null;
}

export function getRegistryEntry(key: string): PaymentGatewayRegistryEntry | undefined {
  return PAYMENT_GATEWAY_REGISTRY.find((g) => g.key === key);
}

export function listCheckoutGatewayKeys(): CanonicalGatewayKey[] {
  return PAYMENT_GATEWAY_REGISTRY.filter((g) => g.supportsOnlineCheckout).map((g) => g.key);
}

export function allCanonicalGatewayKeys(): CanonicalGatewayKey[] {
  return PAYMENT_GATEWAY_REGISTRY.map((g) => g.key);
}
