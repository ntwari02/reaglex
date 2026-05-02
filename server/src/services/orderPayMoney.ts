import type { IOrder } from '../models/Order';

/**
 * Payable currency for gateways: prefer checkout lock (currencySnapshot), then legacy paymentMethod hints.
 */
export function orderPayCurrency(order: Pick<IOrder, 'paymentMethod' | 'currencySnapshot'>): string {
  const snapCur = order.currencySnapshot?.currency;
  if (snapCur && String(snapCur).trim()) {
    return String(snapCur).trim().toUpperCase();
  }
  const m = String(order.paymentMethod || '').trim().toUpperCase();
  if (m === 'RWF') return 'RWF';
  if (m === 'EUR') return 'EUR';
  return 'USD';
}

/**
 * Amount to charge in {@link orderPayCurrency} major units (integer for zero-decimal currencies).
 * Prefers locked checkout local total when a snapshot exists.
 */
export function orderPayAmount(order: Pick<IOrder, 'total' | 'currencySnapshot' | 'paymentMethod'>): number {
  const snap = order.currencySnapshot;
  if (snap && snap.totalLocal != null && snap.currency) {
    return Math.round(Number(snap.totalLocal));
  }
  return Math.round(Number(order.total || 0));
}
