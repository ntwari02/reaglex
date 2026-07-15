/**
 * Rule-based order status emails (payment method + payout aware).
 * Returns { subject, email_body } for transactional sends.
 */

export type EmailOrderStatus = 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'SETTLED';
export type PayoutStatusLabel = 'PENDING' | 'COMPLETED';

export interface OrderStatusEmailInput {
  customer_name?: string;
  seller_name?: string;
  order_id: string;
  order_status: EmailOrderStatus;
  payment_method: string;
  order_total: string;
  commission?: string;
  seller_amount?: string;
  payout_status: PayoutStatusLabel;
  delivery_status?: string;
}

export interface OrderStatusEmailResult {
  subject: string;
  email_body: string;
}

function greet(name?: string): string {
  const n = String(name || '').trim();
  return n ? `Hi ${n.split(' ')[0]},` : 'Hello,';
}

function formatMoney(amount: number | undefined, currency = 'USD'): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function normalizePaymentMethodLabel(raw?: string): string {
  const m = String(raw || 'card').toLowerCase();
  if (m.includes('momo') || m.includes('mobile') || m.includes('mtn') || m.includes('airtel')) {
    return 'Mobile Money';
  }
  if (m.includes('cod') || m.includes('cash')) return 'Cash on Delivery';
  if (m.includes('wallet')) return 'Wallet';
  if (m.includes('bank') || m.includes('transfer')) return 'Bank Transfer';
  if (m.includes('paypal')) return 'PayPal';
  if (m.includes('stripe') || m.includes('card')) return 'Card';
  return raw ? raw.replace(/_/g, ' ') : 'Card';
}

export function resolvePayoutStatusLabel(order: {
  payout?: { paidToSellerAt?: Date; transferStatus?: string };
  escrow?: { status?: string; releasedAt?: Date };
}): PayoutStatusLabel {
  if (order.payout?.paidToSellerAt) return 'COMPLETED';
  const es = String(order.escrow?.status || '');
  if (es === 'RELEASED' || es === 'AUTO_RELEASED') return 'COMPLETED';
  const ts = String(order.payout?.transferStatus || '').toLowerCase();
  if (ts === 'successful' || ts === 'success' || ts === 'completed') return 'COMPLETED';
  return 'PENDING';
}

export function resolveEmailOrderStatus(order: {
  status?: string;
  escrow?: { status?: string };
}): EmailOrderStatus {
  const escrow = String(order.escrow?.status || '').toUpperCase();
  if (escrow === 'REFUNDED') return 'REFUNDED';
  const st = String(order.status || '').toLowerCase();
  if (st === 'cancelled') return 'CANCELLED';
  if (st === 'completed' || escrow === 'RELEASED' || escrow === 'AUTO_RELEASED') return 'COMPLETED';
  if (st === 'delivered' || escrow === 'DELIVERED') return 'DELIVERED';
  if (escrow === 'RELEASED' || escrow === 'AUTO_RELEASED') return 'SETTLED';
  return 'DELIVERED';
}

export function buildOrderStatusEmailInput(order: {
  orderNumber?: string;
  _id?: { toString(): string };
  customer?: string;
  sellerName?: string;
  total?: number;
  currency?: string;
  paymentMethod?: string;
  payment?: { method?: string; currency?: string };
  fees?: { platformFeeAmount?: number; sellerAmount?: number };
  status?: string;
  escrow?: { status?: string; releasedAt?: Date };
  payout?: { paidToSellerAt?: Date; transferStatus?: string };
  trackingNumber?: string;
  sellerId?: { fullName?: string; email?: string };
}, buyerName?: string, sellerName?: string): OrderStatusEmailInput {
  const currency = order.payment?.currency || order.currency || 'USD';
  return {
    customer_name: buyerName || order.customer,
    seller_name: sellerName || order.sellerName || (order.sellerId as { fullName?: string })?.fullName,
    order_id: order.orderNumber || String(order._id),
    order_status: resolveEmailOrderStatus(order),
    payment_method: normalizePaymentMethodLabel(order.payment?.method || order.paymentMethod),
    order_total: formatMoney(order.total, currency),
    commission: order.fees?.platformFeeAmount != null ? formatMoney(order.fees.platformFeeAmount, currency) : undefined,
    seller_amount: order.fees?.sellerAmount != null ? formatMoney(order.fees.sellerAmount, currency) : undefined,
    payout_status: resolvePayoutStatusLabel(order),
    delivery_status: order.trackingNumber ? `Tracking ${order.trackingNumber}` : undefined,
  };
}

export function generateOrderStatusEmail(input: OrderStatusEmailInput): OrderStatusEmailResult {
  const ref = input.order_id ? `order ${input.order_id}` : 'your order';
  const paymentNote = input.payment_method ? `Payment method: ${input.payment_method}.` : '';
  const totalNote = input.order_total ? `Order total: ${input.order_total}.` : '';

  if (input.order_status === 'CANCELLED') {
    return {
      subject: `Order ${input.order_id} — cancelled`,
      email_body: [
        greet(input.customer_name),
        '',
        `We're writing to confirm that ${ref} has been cancelled.`,
        paymentNote,
        'If you were charged, any refund will follow your payment provider\'s usual timing (typically 3–10 business days).',
        '',
        'If you have questions, reply to this email or contact support from your account.',
        '',
        'Thank you,',
        'Spacilly Support',
      ].join('\n'),
    };
  }

  if (input.order_status === 'REFUNDED') {
    return {
      subject: `Refund processed for order ${input.order_id}`,
      email_body: [
        greet(input.customer_name),
        '',
        `Your refund for ${ref} has been processed.`,
        totalNote,
        paymentNote,
        '',
        'The amount should appear on your statement according to your bank or mobile money provider.',
        '',
        'Thank you for your patience,',
        'Spacilly Support',
      ].join('\n'),
    };
  }

  if (input.order_status === 'COMPLETED' && input.payout_status === 'COMPLETED') {
    return {
      subject: `Order ${input.order_id} completed`,
      email_body: [
        greet(input.customer_name),
        '',
        `Great news — ${ref} is fully completed.`,
        input.delivery_status || 'Your delivery has been confirmed.',
        totalNote,
        paymentNote,
        '',
        `The seller (${input.seller_name || 'your seller'}) has been paid for this order.`,
        '',
        'Thank you for shopping with Spacilly.',
      ].join('\n'),
    };
  }

  if (input.order_status === 'DELIVERED') {
    const payoutLine =
      input.payout_status === 'PENDING'
        ? 'Seller settlement is being processed separately — you do not need to take any action.'
        : '';
    return {
      subject: `Order ${input.order_id} delivered`,
      email_body: [
        greet(input.customer_name),
        '',
        `Your package for ${ref} was delivered successfully.`,
        input.delivery_status ? `${input.delivery_status}.` : '',
        totalNote,
        paymentNote,
        payoutLine,
        '',
        'We hope everything meets your expectations.',
        '',
        'Spacilly',
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  if (input.payout_status === 'PENDING') {
    return {
      subject: `Update on order ${input.order_id}`,
      email_body: [
        greet(input.customer_name),
        '',
        `Here is an update on ${ref}.`,
        totalNote,
        paymentNote,
        '',
        'Seller payment is still being processed. We will notify you when the order is fully closed.',
        '',
        'Spacilly',
      ].join('\n'),
    };
  }

  return {
    subject: `Order ${input.order_id} update`,
    email_body: [
      greet(input.customer_name),
      '',
      `There is an update on ${ref}.`,
      totalNote,
      '',
      'Spacilly',
    ].join('\n'),
  };
}

/** Seller-facing variant when payout completes */
export function generateSellerPayoutEmail(input: OrderStatusEmailInput): OrderStatusEmailResult {
  return {
    subject: `Payout sent for order ${input.order_id}`,
    email_body: [
      greet(input.seller_name),
      '',
      `Your earnings for order ${input.order_id} have been released.`,
      input.seller_amount ? `Amount: ${input.seller_amount}.` : '',
      input.commission ? `Platform fee: ${input.commission}.` : '',
      input.order_total ? `Order total: ${input.order_total}.` : '',
      '',
      'Funds should arrive according to your payout method.',
      '',
      'Spacilly Seller Hub',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
