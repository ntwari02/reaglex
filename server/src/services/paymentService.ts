import flw from '../config/flutterwave';
import { getClientUrl } from '../config/publicEnv';
import { Order } from '../models/Order';
import { EscrowWallet } from '../models/EscrowWallet';
import { TransactionLog } from '../models/TransactionLog';
import { sendNotification } from './notificationService';
import { scheduleAutoRelease } from './escrowService';
import { processReferralRewardOnOrderPaid } from './referralReward.service';

export interface InitializePaymentInput {
orderId: string;
buyer: {
_id: string;
email: string;
phone?: string;
fullName: string;
};
}

export function calculateFees(orderTotal: number) {
const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 5);
const flutterwaveFeeRate = 0.014; // ~1.4% FLW fee

const platformFee = Math.round(orderTotal * (platformFeePercent / 100));
const flutterwaveFee = Math.round(orderTotal * flutterwaveFeeRate);
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

export async function initializePayment(orderId: string, buyer: InitializePaymentInput['buyer']) {
const order = await Order.findById(orderId);
if (!order) {
throw new Error('Order not found');
}

const siteBase = getClientUrl();
if (!siteBase) {
throw new Error('CLIENT_URL is not set; cannot build payment redirect URL');
}

const txRef = `REAGLEX-${order._id}-${Date.now()}`;

const payload: any = {
tx_ref: txRef,
amount: order.total,
currency: order.paymentMethod === 'RWF' ? 'RWF' : 'USD',
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
'escrow.status': 'PENDING',
});

return {  
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

const response = await flw.Transaction.verify({ id: transactionId } as any);

const expectedCurrency =
order.payment?.currency ||
(order.paymentMethod === 'RWF' ? 'RWF' : 'USD');

if (
response.data.status === 'successful' &&
response.data.amount >= order.total &&
response.data.currency === expectedCurrency
) {
const fees = calculateFees(order.total);

await Order.findByIdAndUpdate(orderId, {  
  'payment.flutterwaveTransactionId': transactionId,  
  'payment.amount': response.data.amount,  
  'payment.currency': response.data.currency,  
  'payment.paidAt': new Date(),  
  'payment.method': response.data.payment_type,  
  'escrow.status': 'ESCROW_HOLD',  
  'escrow.heldAt': new Date(),  
  'escrow.releaseEligibleAt': new Date(  
    Date.now() + (parseInt(process.env.AUTO_RELEASE_DAYS || '3', 10) * 24 * 60 * 60 * 1000)  
  ),  
  'fees.platformFeePercent': fees.platformFeePercent,  
  'fees.platformFeeAmount': fees.platformFee,  
  'fees.sellerAmount': fees.sellerReceives,  
  'fees.flutterwaveFee': fees.flutterwaveFee,  
  'escrow.autoReleaseScheduled': true,  
});  

await EscrowWallet.updateOne(  
  {},  
  { $inc: { totalHeld: order.total } },  
  { upsert: true }  
);  

await new TransactionLog({  
  type: 'PAYMENT',  
  orderId,  
  buyerId: order.buyerId,  
  sellerId: order.sellerId,  
  amount: order.total,  
  currency: response.data.currency,  
  flutterwaveRef: String(transactionId),  
  status: 'ESCROW_HOLD',  
  metadata: {  
    payment_type: response.data.payment_type,  
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

return { success: true, status: 'ESCROW_HOLD' as const };

}

throw new Error('Payment verification failed');
}
