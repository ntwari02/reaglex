import mongoose from 'mongoose';
import flw from '../config/flutterwave';
import { getClientUrl } from '../config/publicEnv';
import { Order, IOrder } from '../models/Order';
import { EscrowWallet } from '../models/EscrowWallet';
import { TransactionLog } from '../models/TransactionLog';
import { sendNotification } from './notificationService';
import { scheduleAutoRelease } from './escrowService';
import { processReferralRewardOnOrderPaid } from './referralReward.service';
import { assertPaymentGatewayEnabled } from './paymentGateway.service';
import {
  assertMomoCallbackUrlProductionSafe,
  getRequestToPayStatus,
  isMomoConfigured,
  newMomoReferenceId,
  normalizeMomoMsisdn,
  requestToPay,
} from './momoService';

export type CheckoutPaymentProcessor = 'flutterwave' | 'momo';

export interface InitializePaymentInput {
  orderId: string;
  buyer: {
    _id: string;
    email: string;
    phone?: string;
    fullName: string;
  };
}

export interface InitializePaymentOptions {
  paymentMethod?: CheckoutPaymentProcessor;
  /** Required when paymentMethod is momo — MTN MSISDN (local or international format). */
  momoPhone?: string;
}

export function calculateFees(orderTotal: number, processor: CheckoutPaymentProcessor = 'flutterwave') {
  const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 5);
  const flutterwaveFeeRate = 0.014;
  const momoFeeRate = Number(process.env.MOMO_FEE_RATE ?? 0.02);
  const processingRate = processor === 'momo' ? momoFeeRate : flutterwaveFeeRate;

  const platformFee = Math.round(orderTotal * (platformFeePercent / 100));
  const flutterwaveFee = Math.round(orderTotal * processingRate);
  const sellerReceives = orderTotal - platformFee - flutterwaveFee;

  return {
    orderTotal,
    platformFeePercent,
    platformFee,
    flutterwaveFee,
    sellerReceives,
    breakdown: {
      gross: orderTotal,
      reaglexCommission: platformFee,
      processingFee: flutterwaveFee,
      netToSeller: sellerReceives,
    },
  };
}

function orderPayCurrency(order: IOrder): 'RWF' | 'USD' {
  return order.paymentMethod === 'RWF' ? 'RWF' : 'USD';
}

/**
 * Applies escrow + ledger side-effects once per order (idempotent).
 */
export async function finalizeSuccessfulEscrowPayment(
  orderId: string,
  ctx: {
    provider: CheckoutPaymentProcessor;
    paidAmount: number;
    currency: string;
    paymentMethodLabel: string;
    flutterwaveTransactionId?: string | number;
    momoReferenceId?: string;
    momoFinancialTransactionId?: string;
  }
): Promise<{ success: true; status: 'ESCROW_HOLD' } | { success: true; status: 'ALREADY_COMPLETED' }> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.escrow?.status === 'ESCROW_HOLD' && order.payment?.paidAt) {
    return { success: true, status: 'ALREADY_COMPLETED' };
  }

  if (order.escrow?.status !== 'PENDING') {
    throw new Error('Order is not awaiting payment');
  }

  const fees = calculateFees(order.total, ctx.provider);

  await Order.findByIdAndUpdate(orderId, {
    'payment.provider': ctx.provider,
    'payment.amount': ctx.paidAmount,
    'payment.currency': ctx.currency,
    'payment.paidAt': new Date(),
    'payment.method': ctx.paymentMethodLabel,
    ...(ctx.flutterwaveTransactionId != null
      ? { 'payment.flutterwaveTransactionId': String(ctx.flutterwaveTransactionId) }
      : {}),
    ...(ctx.momoReferenceId ? { 'payment.momoReferenceId': ctx.momoReferenceId } : {}),
    ...(ctx.momoFinancialTransactionId
      ? { 'payment.momoFinancialTransactionId': ctx.momoFinancialTransactionId }
      : {}),
    'escrow.status': 'ESCROW_HOLD',
    'escrow.heldAt': new Date(),
    'escrow.releaseEligibleAt': new Date(
      Date.now() + parseInt(process.env.AUTO_RELEASE_DAYS || '3', 10) * 24 * 60 * 60 * 1000
    ),
    'fees.platformFeePercent': fees.platformFeePercent,
    'fees.platformFeeAmount': fees.platformFee,
    'fees.sellerAmount': fees.sellerReceives,
    'fees.flutterwaveFee': fees.flutterwaveFee,
    'escrow.autoReleaseScheduled': true,
  });

  await EscrowWallet.updateOne({}, { $inc: { totalHeld: order.total } }, { upsert: true });

  await new TransactionLog({
    type: 'PAYMENT',
    orderId,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount: order.total,
    currency: ctx.currency,
    flutterwaveRef:
      ctx.provider === 'flutterwave' && ctx.flutterwaveTransactionId != null
        ? String(ctx.flutterwaveTransactionId)
        : ctx.momoFinancialTransactionId || ctx.momoReferenceId || 'momo',
    status: 'ESCROW_HOLD',
    metadata: {
      provider: ctx.provider,
      payment_type: ctx.paymentMethodLabel,
      momoReferenceId: ctx.momoReferenceId,
      momoFinancialTransactionId: ctx.momoFinancialTransactionId,
    },
  }).save();

  await sendNotification(order.buyerId.toString(), 'PAYMENT_RECEIVED');
  await sendNotification(order.sellerId.toString(), 'NEW_ORDER_PAID');

  await scheduleAutoRelease(orderId);

  void processReferralRewardOnOrderPaid({
    _id: order._id,
    buyerId: order.buyerId,
    total: order.total,
  });

  return { success: true, status: 'ESCROW_HOLD' };
}

export async function initializePayment(
  orderId: string,
  buyer: InitializePaymentInput['buyer'],
  options: InitializePaymentOptions = {}
) {
  const processor: CheckoutPaymentProcessor = options.paymentMethod === 'momo' ? 'momo' : 'flutterwave';

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (processor === 'flutterwave') {
    await assertPaymentGatewayEnabled('flutterwave');
  } else {
    await assertPaymentGatewayEnabled('mtn_momo');
    if (!isMomoConfigured()) {
      throw new Error('MTN MoMo is not configured on the server');
    }
  }

  if (processor === 'momo') {
    /** Rwanda Collections settle in RWF; orders must be created with paymentMethod RWF for MoMo checkout. */
    const currency = orderPayCurrency(order);
    if (currency !== 'RWF') {
      throw new Error('MTN MoMo Rwanda is only available for orders in RWF (set paymentMethod to RWF at checkout)');
    }

    assertMomoCallbackUrlProductionSafe();

    const msisdn = normalizeMomoMsisdn(options.momoPhone || buyer.phone || '');
    if (!msisdn) {
      throw new Error('A valid MTN MoMo phone number is required');
    }

    const referenceId = newMomoReferenceId();
    const amountStr = String(Math.round(order.total));

    await requestToPay({
      referenceId,
      amount: amountStr,
      currency: 'RWF',
      externalId: order._id.toString(),
      payerMsisdn: msisdn,
      payerMessage: `Reaglex ${order.orderNumber}`,
      payeeNote: `Order ${order.orderNumber}`,
    });

    await Order.findByIdAndUpdate(order._id, {
      'payment.provider': 'momo',
      'payment.momoReferenceId': referenceId,
      'payment.momoStatus': 'PENDING',
      'escrow.status': 'PENDING',
    });

    return {
      provider: 'momo' as const,
      referenceId,
      orderId: order._id.toString(),
      amount: order.total,
      currency: 'RWF',
      message: 'Payment request sent. Approve the prompt on your phone or dial *182# to pay.',
    };
  }

  const siteBase = getClientUrl();
  if (!siteBase) {
    throw new Error('CLIENT_URL is not set; cannot build payment redirect URL');
  }

  const txRef = `REAGLEX-${order._id}-${Date.now()}`;

  const payload: any = {
    tx_ref: txRef,
    amount: order.total,
    currency: orderPayCurrency(order),
    redirect_url: `${siteBase}/payment/verify`,
    customer: {
      email: buyer.email,
      phonenumber: buyer.phone,
      name: buyer.fullName,
    },
    customizations: {
      title: 'Reaglex Payment',
      description: `Order ${order._id}`,
      logo: `${siteBase}/logo.jpg`,
    },
    meta: {
      order_id: order._id.toString(),
      buyer_id: buyer._id.toString(),
      seller_id: order.sellerId.toString(),
    },
  };

  const response = await flw.Payment.initiate(payload as any);

  if (response.status === 'success') {
    await Order.findByIdAndUpdate(order._id, {
      'payment.flutterwaveReference': txRef,
      'payment.provider': 'flutterwave',
      'escrow.status': 'PENDING',
    });

    return {
      provider: 'flutterwave' as const,
      paymentLink: response.data.link,
      txRef,
      amount: order.total,
    };
  }

  throw new Error(response.message || 'Failed to initialize payment');
}

export async function verifyPayment(transactionId: number | string, orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const awaitingPayment = order.escrow?.status === 'PENDING' && !order.payment?.paidAt;
  if (awaitingPayment) {
    await assertPaymentGatewayEnabled('flutterwave');
  }

  const response = await flw.Transaction.verify({ id: transactionId } as any);

  const expectedCurrency = order.payment?.currency || orderPayCurrency(order);

  if (
    response.data.status === 'successful' &&
    response.data.amount >= order.total &&
    response.data.currency === expectedCurrency
  ) {
    const out = await finalizeSuccessfulEscrowPayment(orderId, {
      provider: 'flutterwave',
      paidAmount: response.data.amount,
      currency: response.data.currency,
      paymentMethodLabel: response.data.payment_type,
      flutterwaveTransactionId: transactionId,
    });
    if (out.status === 'ALREADY_COMPLETED') {
      return { success: true, status: 'ESCROW_HOLD' as const };
    }
    return { success: true, status: 'ESCROW_HOLD' as const };
  }

  throw new Error('Payment verification failed');
}

/**
 * Poll MTN for RequestToPay status and finalize when SUCCESSFUL.
 */
function isMomoTerminalFailure(status: string): boolean {
  const u = String(status || '').toUpperCase();
  return ['FAILED', 'REJECTED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u);
}

export async function syncMomoOrderPayment(referenceId: string, opts?: { buyerUserId?: string }) {
  const query: Record<string, unknown> = { 'payment.momoReferenceId': referenceId };
  if (opts?.buyerUserId && mongoose.Types.ObjectId.isValid(opts.buyerUserId)) {
    query.buyerId = new mongoose.Types.ObjectId(opts.buyerUserId);
  }
  const order = await Order.findOne(query);
  if (!order) {
    throw new Error('Order not found for this payment reference');
  }

  if (order.escrow?.status === 'ESCROW_HOLD' && order.payment?.paidAt) {
    return {
      success: true as const,
      momoStatus: order.payment?.momoStatus || 'SUCCESSFUL',
      orderId: order._id.toString(),
      escrowStatus: 'ESCROW_HOLD' as const,
      alreadyPaid: true as const,
    };
  }

  const st = await getRequestToPayStatus(referenceId);

  await Order.findByIdAndUpdate(order._id, {
    'payment.momoStatus': st.status,
    ...(st.financialTransactionId
      ? { 'payment.momoFinancialTransactionId': st.financialTransactionId }
      : {}),
  });

  if (st.status !== 'SUCCESSFUL') {
    if (isMomoTerminalFailure(st.status)) {
      return {
        success: false as const,
        momoStatus: st.status,
        orderId: order._id.toString(),
        failed: true as const,
      };
    }
    return {
      success: false as const,
      momoStatus: st.status,
      orderId: order._id.toString(),
    };
  }

  const paidAmount = st.amount != null ? Number(st.amount) : order.total;
  const currency = st.currency || 'RWF';

  const expectedCur = orderPayCurrency(order);
  if (currency !== expectedCur || Math.round(paidAmount) < Math.round(order.total)) {
    throw new Error('MoMo payment amount or currency does not match the order');
  }

  const fin = await finalizeSuccessfulEscrowPayment(order._id.toString(), {
    provider: 'momo',
    paidAmount,
    currency,
    paymentMethodLabel: 'mtn_momo',
    momoReferenceId: referenceId,
    momoFinancialTransactionId: st.financialTransactionId,
  });

  return {
    success: true as const,
    momoStatus: st.status,
    orderId: order._id.toString(),
    escrowStatus: fin.status === 'ALREADY_COMPLETED' ? ('ESCROW_HOLD' as const) : ('ESCROW_HOLD' as const),
  };
}

function extractMomoCallbackReferenceId(body: Record<string, unknown>, headerRef?: string): string | undefined {
  const h = typeof headerRef === 'string' ? headerRef.trim() : '';
  if (h) return h;
  const keys = ['referenceId', 'referenceid', 'reference_id', 'ReferenceId', 'resourceId'];
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * MoMo server-to-server callback (best-effort parse; always verify with MTN API).
 * Idempotent: repeated callbacks re-read MTN status; paid orders short-circuit in syncMomoOrderPayment.
 */
export async function handleMomoCallbackPayload(body: Record<string, unknown>, headerRef?: string) {
  const referenceId = extractMomoCallbackReferenceId(body, headerRef);

  if (!referenceId) {
    return { ok: false as const, message: 'Missing reference id' };
  }

  const order = await Order.findOne({ 'payment.momoReferenceId': referenceId });
  if (!order) {
    return { ok: false as const, message: 'Unknown reference' };
  }

  try {
    await syncMomoOrderPayment(referenceId);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[momo callback] sync failed', e);
    return { ok: false as const, message: (e as Error).message };
  }
  return { ok: true as const, referenceId };
}
