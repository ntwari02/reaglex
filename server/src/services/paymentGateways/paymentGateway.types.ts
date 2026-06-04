/**
 * Pluggable checkout providers — keys align with `financial/paymentGatewayRegistry.ts`.
 * Credentials: Admin → Finance → Payment Gateways (encrypted in DB, env fallback).
 */
export type CheckoutProviderKey = 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel';

/** Admin / Mongo gateway config keys */
export type PaymentGatewayConfigKey =
  | 'offline'
  | 'flutterwave'
  | 'mtn_momo'
  | 'airtel_money'
  | 'stripe'
  | 'paypal';

export interface UnifiedPaymentInitResult {
  provider: CheckoutProviderKey;
  /** Human-readable label for TransactionLog */
  label: string;
  gatewayKey: PaymentGatewayConfigKey;
}
