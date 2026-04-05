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

/**
 * Resolve a dotted key (e.g. "nav.home"). Empty strings in fr/rw fall back to English.
 * Unknown keys fall back to the key path.
 */
export function translate(locale: string, key: string): string {
  const loc = (locale === 'sw' ? 'en' : locale) as Locale;
  const table = catalogs[loc] ?? en;
  const primary = getNested(table as unknown as Record<string, unknown>, key);
  if (primary !== undefined && primary !== '') return primary;
  const fb = getNested(enRecord, key);
  if (fb !== undefined && fb !== '') return fb;
  return key;
}
