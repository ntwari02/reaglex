import { API_BASE_URL } from '../lib/config';

export type FeeSchedulePaymentMethod = {
  key: string;
  label: string;
  description: string;
  rate: number;
  gatewayKey?: string;
};

export type FeeScheduleFaq = {
  id: string;
  q: string;
  a: string;
};

export type FeeSchedule = {
  commissionPercent: number;
  commissionRate: number;
  defaultProcessingRate: number;
  currency: string;
  listingsFree: boolean;
  monthlyFeeUsd: number;
  paymentMethods: FeeSchedulePaymentMethod[];
  faq: FeeScheduleFaq[];
  updatedAt: string;
};

const DEFAULT_SCHEDULE: FeeSchedule = {
  commissionPercent: 5,
  commissionRate: 0.05,
  defaultProcessingRate: 0.014,
  currency: 'USD',
  listingsFree: true,
  monthlyFeeUsd: 0,
  paymentMethods: [
    { key: 'card', label: '💳 Card (1.4%)', description: 'Visa, Mastercard and others', rate: 0.014 },
    { key: 'mtn', label: '📱 MTN MoMo (2.0%)', description: 'MTN Mobile Money', rate: 0.02 },
    { key: 'airtel', label: '📱 Airtel (2.0%)', description: 'Airtel Money', rate: 0.02 },
    { key: 'bank_local', label: '🏦 Bank Transfer (1.4%)', description: 'Local bank transfer', rate: 0.014 },
    { key: 'bank_intl', label: '🌍 Bank Transfer (1.4%)', description: 'International bank transfer', rate: 0.014 },
  ],
  faq: [
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
  ],
  updatedAt: new Date().toISOString(),
};

export async function fetchFeeSchedule(): Promise<FeeSchedule> {
  try {
    const response = await fetch(`${API_BASE_URL}/public/fee-schedule`, { credentials: 'include' });
    if (!response.ok) return DEFAULT_SCHEDULE;
    const data = (await response.json()) as FeeSchedule;
    if (!data?.commissionRate || !Array.isArray(data.paymentMethods)) {
      return DEFAULT_SCHEDULE;
    }
    return data;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export { DEFAULT_SCHEDULE };
