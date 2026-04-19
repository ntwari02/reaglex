import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { initializePayment } from './paymentService';

export type ShippingSpeed = 'standard' | 'express' | 'international';

/** Must match enabled gateways + `initializePayment` processors. */
export type CommerceCheckoutProvider = 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel';

export interface CommerceShippingInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PerformCheckoutInput {
  buyerId: string;
  productId: string;
  quantity: number;
  shipping: CommerceShippingInput;
  shippingSpeed: ShippingSpeed;
  /** Defaults to flutterwave. Must be enabled & configured server-side. */
  paymentProvider?: CommerceCheckoutProvider | string;
  /** MTN MoMo payer wallet (required when paymentProvider is momo if not inferable from shipping.phone). */
  momoPhone?: string;
  /** Airtel Money wallet (required when paymentProvider is airtel if not inferable from shipping.phone). */
  airtelPhone?: string;
}

export interface PerformCheckoutResult {
  ok: boolean;
  error?: string;
  orderNumber?: string;
  /** Mongo order id — required for MoMo/Airtel status polling URLs */
  orderId?: string;
  paymentLink?: string;
  provider?: CommerceCheckoutProvider;
  referenceId?: string;
  amount?: number;
  currency?: string;
  message?: string;
}

function shippingCost(speed: ShippingSpeed): number {
  if (speed === 'express') return 15;
  if (speed === 'international') return 25;
  return 5;
}

export function normalizeCommerceProvider(raw?: string): CommerceCheckoutProvider {
  const m = String(raw || 'flutterwave').toLowerCase();
  if (m === 'momo' || m === 'mtn' || m === 'mtn_momo') return 'momo';
  if (m === 'stripe') return 'stripe';
  if (m === 'paypal') return 'paypal';
  if (m === 'airtel' || m === 'airtel_money') return 'airtel';
  return 'flutterwave';
}

/**
 * Single-seller checkout used by the AI agent and the assistant checkout form.
 * Creates a pending order and starts payment (Flutterwave link, Stripe/PayPal redirect, or MoMo/Airtel push).
 */
export async function performCheckoutSingleProduct(
  input: PerformCheckoutInput
): Promise<PerformCheckoutResult> {
  try {
    if (!mongoose.Types.ObjectId.isValid(input.buyerId)) {
      return { ok: false, error: 'Invalid buyer' };
    }
    if (!mongoose.Types.ObjectId.isValid(input.productId)) {
      return { ok: false, error: 'Invalid product' };
    }

    const buyerOid = new mongoose.Types.ObjectId(input.buyerId);
    const productOid = new mongoose.Types.ObjectId(input.productId);

    const user = await User.findById(buyerOid).lean();
    if (!user) {
      return { ok: false, error: 'Buyer not found' };
    }

    const product = await Product.findById(productOid).lean();
    if (!product) {
      return { ok: false, error: 'Product not found' };
    }

    if (!['in_stock', 'low_stock'].includes(String(product.status))) {
      return { ok: false, error: 'Product is not available' };
    }

    const qty = Math.max(1, Math.min(99, Math.floor(Number(input.quantity) || 1)));
    if (product.stock < qty) {
      return { ok: false, error: 'Insufficient stock for the requested quantity' };
    }

    const provider = normalizeCommerceProvider(input.paymentProvider);
    const sellerId = product.sellerId;
    const subtotal = product.price * qty;
    const discount = 0;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * 0.1;
    const ship = shippingCost(input.shippingSpeed);
    const total = subtotalAfterDiscount + tax + ship;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    const sh = input.shipping;
    const orderPaymentMethod = provider === 'momo' || provider === 'airtel' ? 'RWF' : 'card';

    const order = new Order({
      sellerId,
      buyerId: buyerOid,
      orderNumber,
      customer: sh.fullName,
      customerEmail: user.email || '',
      customerPhone: sh.phone,
      items: [
        {
          productId: productOid,
          name: product.name,
          quantity: qty,
          price: product.price,
        },
      ],
      subtotal,
      shipping: ship,
      tax,
      total,
      status: 'pending',
      date: new Date(),
      shippingAddress: {
        name: sh.fullName,
        street: `${sh.addressLine1}${sh.addressLine2 ? `, ${sh.addressLine2}` : ''}`,
        city: sh.city,
        state: sh.state || 'N/A',
        zip: sh.postalCode || '',
        country: sh.country,
      },
      paymentMethod: orderPaymentMethod,
      timeline: [
        {
          status: 'pending',
          date: new Date(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    });

    await order.save();

    const paymentInit = await initializePayment(
      order._id.toString(),
      {
        _id: user._id.toString(),
        email: user.email || '',
        phone: user.phone,
        fullName: (user as { fullName?: string }).fullName ?? user.email ?? 'Customer',
      },
      {
        paymentMethod: provider,
        momoPhone: provider === 'momo' ? input.momoPhone || sh.phone : undefined,
        airtelPhone: provider === 'airtel' ? input.airtelPhone || sh.phone : undefined,
      }
    );

    const oid = order._id.toString();
    const cur =
      provider === 'momo' || provider === 'airtel'
        ? 'RWF'
        : orderPaymentMethod === 'RWF'
          ? 'RWF'
          : 'USD';

    if (paymentInit.provider === 'flutterwave' && 'paymentLink' in paymentInit && paymentInit.paymentLink) {
      return {
        ok: true,
        orderNumber: order.orderNumber,
        orderId: oid,
        paymentLink: paymentInit.paymentLink,
        provider: 'flutterwave',
        amount: paymentInit.amount,
        currency: cur,
      };
    }

    if (paymentInit.provider === 'stripe' && 'paymentLink' in paymentInit && paymentInit.paymentLink) {
      return {
        ok: true,
        orderNumber: order.orderNumber,
        orderId: oid,
        paymentLink: paymentInit.paymentLink,
        provider: 'stripe',
        amount: paymentInit.amount,
        currency: cur,
      };
    }

    if (paymentInit.provider === 'paypal' && 'paymentLink' in paymentInit && paymentInit.paymentLink) {
      return {
        ok: true,
        orderNumber: order.orderNumber,
        orderId: oid,
        paymentLink: paymentInit.paymentLink,
        provider: 'paypal',
        amount: paymentInit.amount,
        currency: cur,
      };
    }

    if (paymentInit.provider === 'momo' && 'referenceId' in paymentInit && paymentInit.referenceId) {
      return {
        ok: true,
        orderNumber: order.orderNumber,
        orderId: oid,
        provider: 'momo',
        referenceId: paymentInit.referenceId,
        amount: paymentInit.amount,
        currency: 'RWF',
        message: paymentInit.message,
      };
    }

    if (paymentInit.provider === 'airtel' && 'referenceId' in paymentInit && paymentInit.referenceId) {
      return {
        ok: true,
        orderNumber: order.orderNumber,
        orderId: oid,
        provider: 'airtel',
        referenceId: paymentInit.referenceId,
        amount: paymentInit.amount,
        currency: 'RWF',
        message: paymentInit.message,
      };
    }

    return { ok: false, error: 'Payment could not be started for the selected method' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    return { ok: false, error: msg };
  }
}
