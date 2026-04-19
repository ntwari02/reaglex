/**
 * Pluggable checkout providers (server-side). Each adapter must use credentials
 * from paymentGatewayCredentials.service (DB + env merge), never hardcoded secrets.
 */
export type CheckoutProviderKey = 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel';

export interface UnifiedPaymentInitResult {
  provider: CheckoutProviderKey;
  /** Human-readable label for logs */
  label: string;
}
