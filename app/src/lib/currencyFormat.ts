/** Aligned with client `lib/currencyFormat.ts` */
export function roundMoneyInt(n: number): number {
  return Math.round(Number(n) || 0);
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RWF: 'RWF',
  KES: 'KES',
  UGX: 'UGX',
  TZS: 'TZS',
  NGN: 'NGN',
};

export function formatIntNoDecimals(n: number): string {
  return roundMoneyInt(n).toLocaleString();
}
