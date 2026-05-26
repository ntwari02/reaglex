import { Response } from 'express';
import { PAYMENT_GATEWAY_REGISTRY } from '../financial/paymentGatewayRegistry';

const FAQ_ITEMS = [
  {
    id: 'when-commission',
    q: 'When exactly is commission charged?',
    a: 'Commission is only charged when a buyer confirms delivery. If an order is cancelled or refunded before payout, no commission is charged.',
  },
  {
    id: 'pass-fees',
    q: 'Can I pass fees to buyers?',
    a: 'No. All seller fees are paid by the seller. However, you can factor fees into your product pricing strategy.',
  },
  {
    id: 'refunds',
    q: 'What if my sale is refunded?',
    a: 'If a refund is processed before payout, no fees are charged. If payout has already been sent, the commission is simply deducted from your next payout.',
  },
  {
    id: 'trial',
    q: 'Is there a free trial period?',
    a: 'All sellers start on our free Starter tier with zero monthly costs. Growth tier includes a 14-day free trial when you upgrade.',
  },
  {
    id: 'discounts',
    q: 'How are fees calculated on discounts?',
    a: 'Fees are calculated on the final sale price after all discount codes, coupons, or promotions are applied.',
  },
  {
    id: 'rejected-orders',
    q: 'Are there fees for rejected orders?',
    a: 'No. If an order is rejected or cancelled before shipping, zero fees are charged to the seller.',
  },
  {
    id: 'currencies',
    q: 'What currencies are supported?',
    a: 'All transactions are processed in USD. Mobile money payouts are converted at current exchange rates at the time of payout.',
  },
  {
    id: 'fee-history',
    q: 'Can I see fee history?',
    a: 'Yes. Your Seller Dashboard includes a complete fee breakdown for every transaction in the Analytics tab.',
  },
  {
    id: 'digital-products',
    q: 'Are fees different for digital products?',
    a: 'No. All product types share the same commission rate. There are no additional digital product fees.',
  },
  {
    id: 'tier-limits',
    q: 'What happens if I exceed my tier?',
    a: 'Starter sellers can always upgrade to Growth. There is no penalty for exceeding limits — you will simply be prompted to upgrade.',
  },
];

function buildPaymentMethods() {
  const cardRate = Number(process.env.FLUTTERWAVE_FEE_RATE ?? 0.014);
  const mobileRate = Number(process.env.MOMO_FEE_RATE ?? process.env.MOBILE_MONEY_FEE_RATE ?? 0.02);
  const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

  const enabledGateways = PAYMENT_GATEWAY_REGISTRY.filter((g) => g.supportsOnlineCheckout && g.key !== 'offline');

  const methods: Array<{
    key: string;
    label: string;
    description: string;
    rate: number;
    gatewayKey?: string;
  }> = [
    {
      key: 'card',
      label: `💳 Card (${pct(cardRate)})`,
      description: 'Visa, Mastercard and others via card checkout',
      rate: cardRate,
      gatewayKey: 'flutterwave',
    },
    {
      key: 'mtn',
      label: `📱 MTN MoMo (${pct(mobileRate)})`,
      description: 'MTN Mobile Money',
      rate: mobileRate,
      gatewayKey: 'mtn_momo',
    },
    {
      key: 'airtel',
      label: `📱 Airtel (${pct(mobileRate)})`,
      description: 'Airtel Money',
      rate: mobileRate,
      gatewayKey: 'airtel_money',
    },
    {
      key: 'bank_local',
      label: `🏦 Bank Transfer (${pct(cardRate)})`,
      description: 'Local bank transfer',
      rate: cardRate,
    },
    {
      key: 'bank_intl',
      label: `🌍 Bank Transfer (${pct(cardRate)})`,
      description: 'International bank transfer',
      rate: cardRate,
    },
  ];

  return { methods, enabledGateways: enabledGateways.map((g) => ({ key: g.key, name: g.name })) };
}

export function buildFeeSchedulePayload() {
  const commissionPercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 5);
  const commissionRate = commissionPercent / 100;
  const { methods, enabledGateways } = buildPaymentMethods();
  const defaultProcessingRate = Number(process.env.FLUTTERWAVE_FEE_RATE ?? 0.014);

  return {
    commissionPercent,
    commissionRate,
    defaultProcessingRate,
    currency: 'USD',
    listingsFree: true,
    monthlyFeeUsd: 0,
    paymentMethods: methods,
    enabledGateways,
    faq: FAQ_ITEMS.map((item) => ({
      ...item,
      a: item.id === 'digital-products'
        ? `No. All product types share the same ${commissionPercent}% commission rate. There are no additional digital product fees.`
        : item.a,
    })),
    updatedAt: new Date().toISOString(),
  };
}

/** GET /api/public/fee-schedule */
export async function getPublicFeeSchedule(_req: unknown, res: Response) {
  try {
    return res.json(buildFeeSchedulePayload());
  } catch (err) {
    console.error('[feeSchedule] getPublic', err);
    return res.status(500).json({ message: 'Failed to load fee schedule' });
  }
}
