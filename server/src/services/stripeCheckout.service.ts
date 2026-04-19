import Stripe from 'stripe';
import { getClientUrl } from '../config/publicEnv';
import { Order, IOrder } from '../models/Order';
import { getStripeCredentialsResolved } from './paymentGatewayCredentials.service';

function stripeUnitAmount(currency: string, amount: number): number {
  const c = currency.toUpperCase();
  const zeroDecimal = new Set([
    'BIF',
    'CLP',
    'DJF',
    'GNF',
    'JPY',
    'KMF',
    'KRW',
    'MGA',
    'PYG',
    'RWF',
    'UGX',
    'VND',
    'VUV',
    'XAF',
    'XOF',
    'XPF',
  ]);
  if (zeroDecimal.has(c)) return Math.max(1, Math.round(amount));
  return Math.max(1, Math.round(amount * 100));
}

async function getStripe(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentialsResolved();
  return new Stripe(secretKey, { typescript: true });
}

export async function createStripeCheckoutSession(order: IOrder, buyerEmail: string): Promise<{ url: string; sessionId: string }> {
  const siteBase = getClientUrl();
  if (!siteBase) {
    throw new Error('CLIENT_URL is not set');
  }
  const currency = (order.paymentMethod === 'RWF' ? 'RWF' : 'USD').toLowerCase();
  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: buyerEmail,
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: stripeUnitAmount(currency.toUpperCase(), order.total),
          product_data: {
            name: `Order ${order.orderNumber}`,
            description: `Reaglex order ${order._id}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      order_id: order._id.toString(),
      order_number: order.orderNumber,
    },
    success_url: `${siteBase.replace(/\/$/, '')}/payment/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteBase.replace(/\/$/, '')}/checkout?stripe=cancel`,
  });

  const url = session.url;
  if (!url) {
    throw new Error('Stripe Checkout did not return a URL');
  }
  return { url, sessionId: session.id };
}

/**
 * Retrieves session and finalizes escrow when payment is complete (also used after redirect).
 */
export async function processStripeCheckoutSession(sessionId: string): Promise<{
  ok: boolean;
  orderId?: string;
  message?: string;
}> {
  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    return { ok: false, message: 'Missing order_id in Stripe session metadata' };
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, orderId, message: `Payment not completed (${session.payment_status})` };
  }
  const order = await Order.findById(orderId);
  if (!order) {
    return { ok: false, message: 'Order not found' };
  }
  if (order.escrow?.status === 'ESCROW_HOLD' && order.payment?.paidAt) {
    return { ok: true, orderId };
  }
  const pi = session.payment_intent;
  const txId =
    typeof pi === 'object' && pi && 'id' in pi ? String((pi as Stripe.PaymentIntent).id) : session.id;

  const cur = (session.currency || 'usd').toUpperCase();
  const zeroDecimal = new Set([
    'BIF',
    'CLP',
    'DJF',
    'GNF',
    'JPY',
    'KMF',
    'KRW',
    'MGA',
    'PYG',
    'RWF',
    'UGX',
    'VND',
    'VUV',
    'XAF',
    'XOF',
    'XPF',
  ]);
  const raw = session.amount_total ?? 0;
  const paidAmount = zeroDecimal.has(cur) ? raw : raw / 100;

  const { finalizeSuccessfulEscrowPayment } = await import('./paymentService');
  await finalizeSuccessfulEscrowPayment(orderId, {
    provider: 'stripe',
    paidAmount,
    currency: cur,
    paymentMethodLabel: 'stripe_checkout',
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId: txId,
  });
  return { ok: true, orderId };
}

export async function testStripeConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const stripe = await getStripe();
    await stripe.balance.retrieve();
    return { ok: true, message: 'Connected — Stripe API accepted the secret key' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Stripe test failed' };
  }
}
