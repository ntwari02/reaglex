import { assertPaymentGatewayEnabled } from './paymentGateway.service';
import {
  assertMomoCallbackUrlProductionSafe,
  getRequestToPayStatus,
  isMomoConfigured,
  newMomoReferenceId,
  normalizeMomoMsisdn,
  requestToPay,
} from './momoService';
import { simulatePayment, type PaymentResponse } from './paymentSimulator';

/** Convert plan amount to RWF minor units for MTN Collections (Rwanda). */
export function subscriptionAmountToRwfMinor(amount: number, planCurrency: string): number {
  const c = String(planCurrency || 'USD').toUpperCase();
  if (c === 'RWF') return Math.max(1, Math.round(amount));
  const rate = Number(process.env.SUBSCRIPTION_USD_TO_RWF_RATE || process.env.USD_TO_RWF_RATE || 1300);
  return Math.max(1, Math.round(amount * rate));
}

const MOMO_POLL_MS = 2500;
const MOMO_POLL_MAX_MS = 90_000;

/**
 * Charges the seller's default payment method for subscription billing.
 * - `gateway_type === 'mtn_momo'`: real MTN Collections RequestToPay + short poll for SUCCESS.
 * - Otherwise: existing simulated card / gateway behavior.
 */
export async function chargeDefaultPaymentMethodForSubscription(
  defaultPaymentMethod: Record<string, unknown>,
  amount: number,
  planCurrency: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<PaymentResponse> {
  const gw = String(defaultPaymentMethod?.gateway_type || '').toLowerCase();

  if (gw === 'mtn_momo') {
    try {
      await assertPaymentGatewayEnabled('mtn_momo');
    } catch {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        message: 'MTN MoMo is disabled for payments',
        failureReason: 'gateway_disabled',
      };
    }

    if (!isMomoConfigured()) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        message: 'MTN MoMo is not configured on the server',
        failureReason: 'not_configured',
      };
    }

    try {
      assertMomoCallbackUrlProductionSafe();
    } catch (e) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        message: (e as Error).message,
        failureReason: 'callback_url',
      };
    }

    const rawPhone = defaultPaymentMethod.phone_number;
    const msisdn = normalizeMomoMsisdn(String(rawPhone || ''));
    if (!msisdn) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        message: 'Invalid MTN MoMo phone on your payment method',
        failureReason: 'phone',
      };
    }

    const rwf = subscriptionAmountToRwfMinor(amount, planCurrency);
    const referenceId = newMomoReferenceId();
    const uid = String(metadata?.subscriptionUserId || 'unknown');
    const externalId = `sub_${uid}_${Date.now()}`;

    await requestToPay({
      referenceId,
      amount: String(rwf),
      currency: 'RWF',
      externalId,
      payerMsisdn: msisdn,
      payerMessage: description.slice(0, 135),
      payeeNote: 'Reaglex subscription',
    });

    const deadline = Date.now() + MOMO_POLL_MAX_MS;
    let lastStatus = 'PENDING';
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, MOMO_POLL_MS));
      const st = await getRequestToPayStatus(referenceId);
      lastStatus = st.status;
      if (st.status === 'SUCCESSFUL') {
        const fin = st.financialTransactionId || referenceId;
        return {
          success: true,
          transactionId: fin,
          status: 'succeeded',
          message: 'MTN MoMo payment successful',
          gatewayRef: fin,
        };
      }
      const u = String(st.status || '').toUpperCase();
      if (['FAILED', 'REJECTED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u)) {
        return {
          success: false,
          transactionId: referenceId,
          status: 'failed',
          message: `MoMo payment ${st.status}`,
          failureReason: String(st.status),
        };
      }
    }

    return {
      success: false,
      transactionId: referenceId,
      status: 'failed',
      message: `MoMo payment still pending (${lastStatus}). Approve on your phone and try again.`,
      failureReason: 'pending_timeout',
    };
  }

  return simulatePayment({
    amount,
    currency: planCurrency || 'USD',
    paymentMethodId: String(defaultPaymentMethod.payment_method_id || ''),
    description,
    metadata: metadata as Record<string, any> | undefined,
  });
}
