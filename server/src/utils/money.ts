import { convertUsdToCurrency, isSupportedDisplayCurrency } from '../services/exchangeRate.service';

export function formatMoney(amount: number, currency: string) {
  const code = String(currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'RWF' || code === 'UGX' || code === 'TZS' ? 0 : 2,
    }).format(Number(amount || 0));
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
}

export async function formatUsdAsCurrency(usd: number, currency: string) {
  const code = String(currency || 'USD').toUpperCase();
  if (!isSupportedDisplayCurrency(code) || code === 'USD') {
    return { currency: 'USD', localAmount: Number(usd || 0), formatted: formatMoney(Number(usd || 0), 'USD'), rate: 1 };
  }
  const conv = await convertUsdToCurrency(Number(usd || 0), code, { roundMode: code === 'RWF' || code === 'UGX' || code === 'TZS' ? 'round' : 'round' });
  return { currency: conv.currency, localAmount: conv.local, formatted: formatMoney(conv.local, conv.currency), rate: conv.rate };
}

