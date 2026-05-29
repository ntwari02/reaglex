import { formatIntNoDecimals } from './currencyFormat';
import { formatCurrency } from './utils';

/** Buyer/seller order totals — whole units for RWF (MoMo-friendly). */
export function formatOrderMoney(amount: number, currency = 'RWF'): string {
  const n = Number(amount) || 0;
  const c = String(currency || 'RWF').toUpperCase();
  if (c === 'RWF') {
    return `RWF ${formatIntNoDecimals(n).toLocaleString('en-RW')}`;
  }
  if (['USD', 'EUR', 'KES'].includes(c)) {
    return formatCurrency(n, c as 'USD' | 'EUR' | 'RWF' | 'KES');
  }
  return `${c} ${formatIntNoDecimals(n).toLocaleString()}`;
}
