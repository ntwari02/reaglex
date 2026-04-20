import mongoose from 'mongoose';
import { getFlutterwaveClient } from '../config/flutterwave';
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
import {
  airtelRequestToPay,
  getAirtelPaymentStatus,
  newAirtelReferenceId,
  normalizeAirtelMsisdn,
} from './airtelMoney.service';
import { createStripeCheckoutSession } from './stripeCheckout.service';
import { createPayPalCheckoutOrder, capturePayPalOrder } from './paypalCheckout.service';
import { getMomoResolvedConfig } from './paymentGatewayCredentials.service';

export type CheckoutPaymentProcessor = 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel';

export type CheckoutPaymentMethod = CheckoutPaymentProcessor;

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
  paymentMethod?: CheckoutPaymentMethod;
  /** MTN MoMo MSISDN */
  momoPhone?: string;
  /** Airtel Money MSISDN */
  airtelPhone?: string;
}

export function calculateFees(orderTotal: number, processor: CheckoutPaymentProcessor = 'flutterwave') {
  const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 5);
  const flutterwaveFeeRate = 0.014;
  const momoFeeRate = Number(process.env.MOMO_FEE_RATE ?? 0.02);
  const mobileMoneyRate = Number(process.env.MOBILE_MONEY_FEE_RATE ?? process.env.MOMO_FEE_RATE ?? 0.02);
  const processingRate = processor === 'momo' || processor === 'airtel' ? mobileMoneyRate : flutterwaveFeeRate;

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
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    paypalOrderId?: string;
    paypalCaptureId?: string;
    airtelTransactionId?: string;
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
    ...(ctx.stripeCheckoutSessionId ? { 'payment.stripeCheckoutSessionId': ctx.stripeCheckoutSessionId } : {}),
    ...(ctx.stripePaymentIntentId ? { 'payment.stripePaymentIntentId': ctx.stripePaymentIntentId } : {}),
    ...(ctx.paypalOrderId ? { 'payment.paypalOrderId': ctx.paypalOrderId } : {}),
    ...(ctx.paypalCaptureId ? { 'payment.paypalCaptureId': ctx.paypalCaptureId } : {}),
    ...(ctx.airtelTransactionId ? { 'payment.airtelTransactionId': ctx.airtelTransactionId } : {}),
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
        : ctx.stripePaymentIntentId ||
          ctx.paypalCaptureId ||
          ctx.airtelTransactionId ||
          ctx.momoFinancialTransactionId ||
          ctx.momoReferenceId ||
          ctx.provider,
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
  const method: CheckoutPaymentMethod = options.paymentMethod || 'flutterwave';

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (method === 'flutterwave') {
    await assertPaymentGatewayEnabled('flutterwave');
  } else if (method === 'momo') {
    await assertPaymentGatewayEnabled('mtn_momo');
    if (!(await isMomoConfigured())) {
      throw new Error('MTN MoMo is not configured on the server');
    }
  } else if (method === 'stripe') {
    await assertPaymentGatewayEnabled('stripe');
  } else if (method === 'paypal') {
    await assertPaymentGatewayEnabled('paypal');
  } else if (method === 'airtel') {
    await assertPaymentGatewayEnabled('airtel_money');
  }

  if (method === 'momo') {
    const currency = orderPayCurrency(order);
    const cfg = await getMomoResolvedConfig();
    if (!cfg?.currency) {
      throw new Error('MTN MoMo is not configured (missing currency)');
    }
    if (currency !== cfg.currency) {
      const env = String(cfg.targetEnvironment || '').trim() || 'sandbox';
      throw new Error(
        `MTN MoMo currency mismatch: gateway is configured for ${cfg.currency} (${env}) but the order is ${currency}. ` +
          `Fix: in Admin → Finance → MTN MoMo set Currency to ${currency} and use the correct MTN environment/base URL for that currency (Rwanda production typically RWF; sandbox often EUR).`
      );
    }

    await assertMomoCallbackUrlProductionSafe();

    const msisdn = normalizeMomoMsisdn(options.momoPhone || buyer.phone || '');
    if (!msisdn) {
      throw new Error('A valid MTN MoMo phone number is required');
    }

    const referenceId = newMomoReferenceId();
    const amountStr = String(Math.round(order.total));

    await requestToPay({
      referenceId,
      amount: amountStr,
      currency: cfg.currency,
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
      currency: cfg.currency,
      message: 'Payment request sent. Approve the prompt on your phone or dial *182# to pay.',
    };
  }

  if (method === 'stripe') {
    const { url, sessionId } = await createStripeCheckoutSession(order, buyer.email);
    await Order.findByIdAndUpdate(order._id, {
      'payment.provider': 'stripe',
      'payment.stripeCheckoutSessionId': sessionId,
      'escrow.status': 'PENDING',
    });
    return {
      provider: 'stripe' as const,
      paymentLink: url,
      sessionId,
      amount: order.total,
      currency: orderPayCurrency(order),
    };
  }

  if (method === 'paypal') {
    const { approvalUrl, orderId: paypalOrderId } = await createPayPalCheckoutOrder(order);
    await Order.findByIdAndUpdate(order._id, {
      'payment.provider': 'paypal',
      'payment.paypalOrderId': paypalOrderId,
      'escrow.status': 'PENDING',
    });
    return {
      provider: 'paypal' as const,
      paymentLink: approvalUrl,
      paypalOrderId,
      amount: order.total,
      currency: orderPayCurrency(order),
    };
  }

  if (method === 'airtel') {
    const currency = orderPayCurrency(order);
    if (currency !== 'RWF') {
      throw new Error('Airtel Money is only available for orders in RWF (set paymentMethod to RWF at checkout)');
    }
    const msisdn = normalizeAirtelMsisdn(options.airtelPhone || buyer.phone || '');
    if (!msisdn) {
      throw new Error('A valid Airtel Money phone number is required');
    }
    const reference = newAirtelReferenceId();
    const { transactionId } = await airtelRequestToPay({
      amount: String(Math.round(order.total)),
      msisdn,
      reference,
      externalId: order._id.toString(),
    });
    await Order.findByIdAndUpdate(order._id, {
      'payment.provider': 'airtel',
      'payment.airtelTransactionId': transactionId,
      'payment.airtelStatus': 'PENDING',
      'escrow.status': 'PENDING',
    });
    return {
      provider: 'airtel' as const,
      referenceId: transactionId,
      orderId: order._id.toString(),
      amount: order.total,
      currency: 'RWF',
      message: 'Payment request sent to Airtel Money. Approve on your phone when prompted.',
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

  const flw = await getFlutterwaveClient();
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

  const flw = await getFlutterwaveClient();
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

function isAirtelTerminalFailure(status: string): boolean {
  const u = String(status || '').toUpperCase();
  return ['FAILED', 'FAILURE', 'TF', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(u);
}

function isAirtelSuccess(status: string): boolean {
  const u = String(status || '').toUpperCase();
  return ['SUCCESS', 'SUCCESSFUL', 'TS', 'COMPLETED', 'SUCCEEDED'].includes(u);
}

export async function syncAirtelOrderPayment(transactionId: string, opts?: { buyerUserId?: string }) {
  const query: Record<string, unknown> = { 'payment.airtelTransactionId': transactionId };
  if (opts?.buyerUserId && mongoose.Types.ObjectId.isValid(opts.buyerUserId)) {
    query.buyerId = new mongoose.Types.ObjectId(opts.buyerUserId);
  }
  const order = await Order.findOne(query);
  if (!order) {
    throw new Error('Order not found for this Airtel reference');
  }

  if (order.escrow?.status === 'ESCROW_HOLD' && order.payment?.paidAt) {
    return {
      success: true as const,
      airtelStatus: order.payment?.airtelStatus || 'SUCCESS',
      orderId: order._id.toString(),
      escrowStatus: 'ESCROW_HOLD' as const,
      alreadyPaid: true as const,
    };
  }

  const st = await getAirtelPaymentStatus(transactionId);

  await Order.findByIdAndUpdate(order._id, {
    'payment.airtelStatus': st.status,
  });

  if (!isAirtelSuccess(st.status)) {
    if (isAirtelTerminalFailure(st.status)) {
      return {
        success: false as const,
        airtelStatus: st.status,
        orderId: order._id.toString(),
        failed: true as const,
      };
    }
    return {
      success: false as const,
      airtelStatus: st.status,
      orderId: order._id.toString(),
    };
  }

  const paidAmount = st.amount != null ? Number(st.amount) : order.total;
  const currency = st.currency || 'RWF';

  const expectedCur = orderPayCurrency(order);
  if (currency !== expectedCur || Math.round(paidAmount) < Math.round(order.total)) {
    throw new Error('Airtel payment amount or currency does not match the order');
  }

  const fin = await finalizeSuccessfulEscrowPayment(order._id.toString(), {
    provider: 'airtel',
    paidAmount,
    currency,
    paymentMethodLabel: 'airtel_money',
    airtelTransactionId: transactionId,
  });

  return {
    success: true as const,
    airtelStatus: st.status,
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
