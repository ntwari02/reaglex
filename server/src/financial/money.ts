/**
 * Money utilities — integer minor units only (e.g. FRW × 1, cents × 1).
 * Never use floating point for money.
 */

const MINOR_SCALE: Record<string, number> = {
  RWF: 1,
  USD: 100,
  EUR: 100,
  GBP: 100,
};

export function minorScale(currency: string): number {
  return MINOR_SCALE[currency.toUpperCase()] ?? 100;
}

/** Convert major units (e.g. 10.5 USD) to minor integer string. */
export function toMinor(major: number | string, currency: string): string {
  const scale = minorScale(currency);
  const n = typeof major === 'string' ? Number(major) : major;
  if (!Number.isFinite(n)) throw new Error('Invalid money amount');
  return String(Math.round(n * scale));
}

/** Parse minor string to bigint. */
export function parseMinor(amountMinor: string): bigint {
  if (!/^-?\d+$/.test(amountMinor)) throw new Error('amountMinor must be integer string');
  return BigInt(amountMinor);
}

export function addMinor(a: string, b: string): string {
  return String(parseMinor(a) + parseMinor(b));
}

export function subMinor(a: string, b: string): string {
  return String(parseMinor(a) - parseMinor(b));
}

export function absMinor(a: string): string {
  const v = parseMinor(a);
  return v < 0n ? String(-v) : a;
}

export function compareMinor(a: string, b: string): -1 | 0 | 1 {
  const da = parseMinor(a);
  const db = parseMinor(b);
  if (da < db) return -1;
  if (da > db) return 1;
  return 0;
}

export function isZeroMinor(a: string): boolean {
  return parseMinor(a) === 0n;
}

/** Format for display (still use minor internally). */
export function formatMajor(amountMinor: string, currency: string, locale = 'en-RW'): string {
  const scale = minorScale(currency);
  const major = Number(amountMinor) / scale;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(major);
}
