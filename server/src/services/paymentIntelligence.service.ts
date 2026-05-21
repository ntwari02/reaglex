import { Order } from '../models/Order';
import { initializePayment, finalizeSuccessfulEscrowPayment } from './paymentService';
import { selectOptimalGateway } from './paymentOptimizer';
import { orderPayAmount, orderPayCurrency } from './orderPayMoney';

function mapProcessorToMethod(proc: string): 'flutterwave' | 'momo' | 'stripe' | 'paypal' | 'airtel' {
  const p = String(proc).toLowerCase();
  if (p === 'momo' || p === 'mtn_momo') return 'momo';
  if (p === 'stripe') return 'stripe';
  if (p === 'paypal') return 'paypal';
  if (p === 'airtel' || p === 'airtel_money') return 'airtel';
  return 'flutterwave';
}

export async function optimizeGatewayForOrder(orderId: string, country?: string) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error('Order not found');
  const selection = await selectOptimalGateway({
    country: country || order.shippingAddress?.country || 'RW',
    amount: orderPayAmount(order as any),
    preferredMethod: order.payment?.provider as any,
  });
  await Order.findByIdAndUpdate(orderId, {
    $set: {
      'paymentIntelligence.optimizer': {
        selectedGateway: selection.selectedGateway,
        reason: selection.reason,
        alternatives: selection.alternatives,
        evaluatedAt: new Date(),
      },
    },
  });
  return selection;
}

export async function initializeSmartPayment(params: {
  orderId: string;
  buyer: { _id: string; email: string; phone?: string; fullName: string };
  country?: string;
  preferredMethod?: string;
  amountOverride?: number;
}) {
  const order = await Order.findById(params.orderId);
  if (!order) throw new Error('Order not found');

  const selection = await selectOptimalGateway({
    country: params.country || order.shippingAddress?.country || 'RW',
    amount: params.amountOverride ?? orderPayAmount(order),
    preferredMethod: mapProcessorToMethod(params.preferredMethod || order.payment?.provider || 'flutterwave'),
  });

  const method = selection.selectedGateway;
  const init = await initializePayment(
    params.orderId,
    { _id: params.buyer._id, email: params.buyer.email, phone: params.buyer.phone, fullName: params.buyer.fullName },
    { paymentMethod: method, momoPhone: params.buyer.phone, airtelPhone: params.buyer.phone }
  );

  return {
    ...init,
    paymentOptimizer: {
      selectedGateway: selection.selectedGateway,
      reason: selection.reason,
      alternatives: selection.alternatives,
    },
  };
}

export async function payInstallment(params: {
  orderId: string;
  buyer: { _id: string; email: string; phone?: string; fullName: string };
  installmentIndex?: number;
  paymentMethod?: string;
  country?: string;
}) {
  const order = await Order.findById(params.orderId);
  if (!order) throw new Error('Order not found');
  const schedule = (order as any).paymentIntelligence?.paymentSchedule || [];
  if (!schedule.length) throw new Error('No payment schedule on order');

  const idx = Math.max(0, Number(params.installmentIndex) || 0);
  const installment = schedule[idx];
  if (!installment) throw new Error('Invalid installment index');
  if (installment.status === 'paid') throw new Error('Installment already paid');

  const payAmount = Number(installment.amount);
  const init = await initializeSmartPayment({
    orderId: params.orderId,
    buyer: params.buyer,
    country: params.country || order.shippingAddress?.country,
    preferredMethod: params.paymentMethod,
    amountOverride: payAmount,
  });

  schedule[idx].status = 'paid';
  schedule[idx].paidAt = new Date();
  (order as any).paymentIntelligence.paymentSchedule = schedule;
  await order.save();

  return { installment: schedule[idx], payment: init };
}

export async function setupSplitSchedule(orderId: string, schedule: Array<{ amount: number; dueDate: string }>) {
  await Order.findByIdAndUpdate(orderId, {
    $set: {
      'paymentIntelligence.paymentSchedule': schedule.map((s, i) => ({
        installment: i + 1,
        amount: s.amount,
        dueDate: s.dueDate,
        status: i === 0 ? 'due_now' : 'scheduled',
      })),
      'paymentIntelligence.splitPayment': { enabled: true, installments: schedule.length },
    },
  });
}

export async function setupCryptoPayment(orderId: string, asset: 'BTC' | 'USDT', network?: string) {
  const address = `rx_${asset.toLowerCase()}_${Math.random().toString(36).slice(2, 10)}`;
  await Order.findByIdAndUpdate(orderId, {
    $set: {
      paymentMethod: 'crypto',
      'paymentIntelligence.crypto': {
        asset,
        network: network || (asset === 'BTC' ? 'bitcoin' : 'trc20'),
        depositAddress: address,
        status: 'awaiting_confirmation',
        escrowCompatible: true,
      },
    },
  });
  return { asset, network: network || (asset === 'BTC' ? 'bitcoin' : 'trc20'), depositAddress: address };
}

export async function confirmCryptoPayment(orderId: string, txRef?: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');
  const paidAmount = orderPayAmount(order);
  const currency = orderPayCurrency(order);
  await finalizeSuccessfulEscrowPayment(orderId, {
    provider: 'flutterwave',
    paidAmount,
    currency,
    paymentMethodLabel: 'crypto',
    flutterwaveTransactionId: txRef || `CRYPTO-${orderId}`,
  });
  (order as any).paymentIntelligence.crypto = {
    ...((order as any).paymentIntelligence?.crypto || {}),
    status: 'confirmed',
    txRef,
    confirmedAt: new Date(),
  };
  await order.save();
  return { success: true, escrowStatus: 'ESCROW_HOLD' };
}
