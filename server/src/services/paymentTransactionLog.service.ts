import mongoose from 'mongoose';
import { TransactionLog, type TransactionType } from '../models/TransactionLog';
import {
  checkoutMethodFromGatewayKey,
  gatewayKeyFromCheckoutMethod,
  getRegistryEntry,
} from '../financial/paymentGatewayRegistry';
import type { CheckoutPaymentProcessor } from './paymentService';

export type RecordTransactionInput = {
  type: TransactionType;
  orderId?: string | mongoose.Types.ObjectId;
  buyerId?: string | mongoose.Types.ObjectId;
  sellerId?: string | mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: string;
  provider: CheckoutPaymentProcessor | string;
  providerRef?: string;
  gatewayKey?: string;
  metadata?: Record<string, unknown>;
};

function resolveGatewayKey(provider: string, explicit?: string): string {
  if (explicit) return explicit;
  const entry = getRegistryEntry(provider);
  if (entry) return entry.key;
  try {
    return gatewayKeyFromCheckoutMethod(provider as CheckoutPaymentProcessor);
  } catch {
    return provider;
  }
}

function providerLabel(provider: string, gatewayKey: string): string {
  const entry = getRegistryEntry(gatewayKey);
  if (entry) return entry.name;
  return provider;
}

/**
 * Single write path for financial audit rows (TransactionLog).
 * All payment / release / refund / fee events should go through here.
 */
export async function recordPaymentTransaction(
  input: RecordTransactionInput,
  session?: mongoose.ClientSession,
): Promise<void> {
  const gatewayKey = resolveGatewayKey(String(input.provider), input.gatewayKey);
  const checkoutMethod =
    checkoutMethodFromGatewayKey(gatewayKey) || (input.provider as CheckoutPaymentProcessor);

  const metadata = {
    provider: checkoutMethod,
    gatewayKey,
    gatewayName: providerLabel(String(input.provider), gatewayKey),
    ...input.metadata,
  };

  const doc = new TransactionLog({
    type: input.type,
    orderId: input.orderId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    amount: input.amount,
    currency: input.currency,
    flutterwaveRef: input.providerRef || checkoutMethod,
    status: input.status,
    metadata,
  });

  if (session) {
    await doc.save({ session });
  } else {
    await doc.save();
  }

  if (input.type === 'PAYMENT' || input.type === 'REFUND' || input.type === 'FEE') {
    const { enqueueIntelligenceIndex } = await import('../queues/intelligenceIndex.queue');
    enqueueIntelligenceIndex('payment', String(doc._id), 'created');
    if (input.orderId) {
      enqueueIntelligenceIndex('order', String(input.orderId), 'updated');
    }
  }
}

export async function recordPaymentCaptured(input: {
  orderId: string | mongoose.Types.ObjectId;
  buyerId: string | mongoose.Types.ObjectId;
  sellerId: string | mongoose.Types.ObjectId;
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  sellerNet: number;
  currency: string;
  provider: CheckoutPaymentProcessor;
  providerRef?: string;
  paymentMethodLabel?: string;
  extraMetadata?: Record<string, unknown>;
  session?: mongoose.ClientSession;
}): Promise<void> {
  const gatewayKey = gatewayKeyFromCheckoutMethod(input.provider);

  await recordPaymentTransaction(
    {
      type: 'PAYMENT',
      orderId: input.orderId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      amount: input.grossAmount,
      currency: input.currency,
      status: 'ESCROW_HOLD',
      provider: input.provider,
      providerRef: input.providerRef,
      gatewayKey,
      metadata: {
        payment_type: input.paymentMethodLabel,
        platform_fee: input.platformFee,
        processing_fee: input.processingFee,
        seller_net: input.sellerNet,
        ...input.extraMetadata,
      },
    },
    input.session,
  );

  if (input.platformFee > 0) {
    await recordPaymentTransaction(
      {
        type: 'FEE',
        orderId: input.orderId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        amount: input.platformFee,
        currency: input.currency,
        status: 'RECORDED',
        provider: input.provider,
        providerRef: input.providerRef,
        gatewayKey,
        metadata: { feeKind: 'platform_commission', ...input.extraMetadata },
      },
      input.session,
    );
  }
}
