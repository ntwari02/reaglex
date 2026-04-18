import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { initializePayment } from './paymentService';

export type ShippingSpeed = 'standard' | 'express' | 'international';

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
}

export interface PerformCheckoutResult {
  ok: boolean;
  error?: string;
  orderNumber?: string;
  paymentLink?: string;
  amount?: number;
  currency?: string;
}

function shippingCost(speed: ShippingSpeed): number {
  if (speed === 'express') return 15;
  if (speed === 'international') return 25;
  return 5;
}

/**
 * Single-seller checkout used by the AI agent and the assistant checkout form.
 * Creates a pending order and returns a Flutterwave payment link when configured.
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

    const sellerId = product.sellerId;
    const subtotal = product.price * qty;
    const discount = 0;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * 0.1;
    const ship = shippingCost(input.shippingSpeed);
    const total = subtotalAfterDiscount + tax + ship;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    const sh = input.shipping;
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
      paymentMethod: 'card',
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
        fullName: (user as any).fullName ?? user.email ?? 'Customer',
      },
      { paymentMethod: 'flutterwave' }
    );

    const currency = order.paymentMethod === 'RWF' ? 'RWF' : 'USD';

    if (paymentInit.provider !== 'flutterwave' || !paymentInit.paymentLink) {
      return { ok: false, error: 'Checkout requires Flutterwave for this flow' };
    }

    return {
      ok: true,
      orderNumber: order.orderNumber,
      paymentLink: paymentInit.paymentLink,
      amount: paymentInit.amount,
      currency,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Checkout failed' };
  }
}
