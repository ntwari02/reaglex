import en from '../locales/en.json';
import fr from '../locales/fr.json';
import rw from '../locales/rw.json';

type Locale = 'en' | 'fr' | 'rw' | 'sw';

const catalogs: Record<Locale, typeof en> = {
  en,
  fr,
  rw,
  sw: en,
};

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const enRecord = en as unknown as Record<string, unknown>;
const legacyMessageKeyMap: Record<string, string> = {
  'An error occurred': 'messages.genericError',
  'Product not found.': 'messages.productNotFound',
  'Please agree to the terms.': 'checkout.errors.agreeTerms',
  'Failed to initialize payment': 'checkout.errors.paymentInitFailed',
  'Payment initialization failed': 'checkout.errors.paymentInitFailed',
};

/**
 * Resolve a dotted key (e.g. "nav.home"). Empty strings in fr/rw fall back to English.
 * Unknown keys fall back to the key path.
 */
export function translate(locale: string, key: string): string {
  const normalizedKey = legacyMessageKeyMap[key] ?? key;
  const loc = (locale === 'sw' ? 'en' : locale) as Locale;
  const table = catalogs[loc] ?? en;
  const primary = getNested(table as unknown as Record<string, unknown>, normalizedKey);
  if (primary !== undefined && primary !== '') return primary;
  const fb = getNested(enRecord, normalizedKey);
  if (fb !== undefined && fb !== '') return fb;
  return key;
}
