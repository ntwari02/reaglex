/** Single rounding rule for all buyer-facing money (whole units, no decimals). */
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

export function formatDualPrice(usd: number, local: number, currencyCode: string): string {
  const code = (currencyCode || 'USD').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || code;
  const localPart = `${formatIntNoDecimals(local)} ${symbol}`;
  const usdPart = `~ $${formatIntNoDecimals(usd)} USD`;
  if (code === 'USD') {
    return `${symbol}${formatIntNoDecimals(usd)} USD`;
  }
  return `${localPart} (${usdPart})`;
}

export const SUPPORTED_CURRENCIES = ['USD', 'RWF', 'KES', 'EUR', 'GBP', 'UGX', 'TZS', 'NGN'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(String(code || '').toUpperCase());
}
