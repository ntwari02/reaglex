import { Request } from 'express';
import NodeCache from 'node-cache';

type RatesMap = Record<string, number>;

/** ISO 4217 codes accepted for checkout + seller listing (USD is canonical base). */
export const SUPPORTED_DISPLAY_CURRENCIES = [
  'USD',
  'RWF',
  'KES',
  'EUR',
  'GBP',
  'UGX',
  'TZS',
  'NGN',
] as const;

export type SupportedDisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

export function isSupportedDisplayCurrency(code: string): boolean {
  const c = String(code || '')
    .trim()
    .toUpperCase();
  return (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(c);
}

interface ExchangeSnapshot {
  base: 'USD';
  rates: RatesMap;
  fetchedAt: Date;
  source: 'live' | 'cache';
}

interface ConvertOptions {
  roundMode?: 'round' | 'ceil';
}

const DEFAULT_RATES: RatesMap = {
  USD: 1,
  RWF: 1300,
  KES: 130,
  UGX: 3800,
  TZS: 2550,
  NGN: 1600,
  EUR: 0.92,
  GBP: 0.79,
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  RW: 'RWF',
  KE: 'KES',
  UG: 'UGX',
  TZ: 'TZS',
  NG: 'NGN',
  GB: 'GBP',
  US: 'USD',
  CA: 'USD',
  // Eurozone & common EU (only currencies in SUPPORTED_DISPLAY_CURRENCIES)
  FR: 'EUR',
  DE: 'EUR',
  BE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
  HR: 'EUR',
};

const REFRESH_MS = Number(process.env.EXCHANGE_RATE_REFRESH_MS || 5 * 60 * 1000);
const EXCHANGE_API_KEY =
  process.env.EXCHANGE_RATE_API_KEY ||
  process.env.EXCHANGERATE_API_KEY ||
  process.env.EXCHANGE_API_KEY ||
  '';
const EXCHANGE_BASE_URL =
  process.env.EXCHANGE_RATE_API_URL ||
  process.env.EXCHANGE_RATE_API_BASE_URL ||
  'https://v6.exchangerate-api.com/v6';

let currentSnapshot: ExchangeSnapshot = {
  base: 'USD',
  rates: DEFAULT_RATES,
  fetchedAt: new Date(0),
  source: 'cache',
};
let refreshTimer: NodeJS.Timeout | null = null;
let inflight: Promise<ExchangeSnapshot> | null = null;

/** Extra process-local cache (survives short gaps; TTL aligns with refresh window). */
const exchangeNodeCache = new NodeCache({
  stdTTL: Math.max(60, Math.floor(Number(process.env.EXCHANGE_RATE_REFRESH_MS || 5 * 60 * 1000) / 1000)),
  useClones: false,
});
const NODE_CACHE_KEY = 'spacilly:usd_rates_snapshot';

function safeRound(value: number, mode: 'round' | 'ceil' = 'round'): number {
  return mode === 'ceil' ? Math.ceil(value) : Math.round(value);
}

function normalizeCurrency(raw?: string): string {
  return String(raw || 'USD').trim().toUpperCase();
}

async function fetchLiveRates(): Promise<ExchangeSnapshot> {
  if (!EXCHANGE_API_KEY) {
    throw new Error('Missing EXCHANGE_RATE_API_KEY');
  }
  const url = `${EXCHANGE_BASE_URL}/${EXCHANGE_API_KEY}/latest/USD`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.result === 'error' || !data?.conversion_rates) {
    throw new Error(data?.['error-type'] || data?.message || 'Exchange rate fetch failed');
  }

  return {
    base: 'USD',
    rates: {
      ...DEFAULT_RATES,
      ...data.conversion_rates,
      USD: 1,
    },
    fetchedAt: new Date(),
    source: 'live',
  };
}

export async function refreshExchangeRates(force = false): Promise<ExchangeSnapshot> {
  const age = Date.now() - currentSnapshot.fetchedAt.getTime();
  if (!force && age < REFRESH_MS && currentSnapshot.fetchedAt.getTime() > 0) {
    return currentSnapshot;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const snapshot = await fetchLiveRates();
      currentSnapshot = snapshot;
      try {
        exchangeNodeCache.set(NODE_CACHE_KEY, JSON.stringify({ ...snapshot, fetchedAt: snapshot.fetchedAt.toISOString() }));
      } catch {
        /* ignore */
      }
      return currentSnapshot;
    } catch {
      try {
        const raw = exchangeNodeCache.get<string>(NODE_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { rates: RatesMap; fetchedAt: string; source?: string };
          if (parsed?.rates) {
            currentSnapshot = {
              base: 'USD',
              rates: { ...DEFAULT_RATES, ...parsed.rates, USD: 1 },
              fetchedAt: new Date(parsed.fetchedAt || Date.now()),
              source: 'cache',
            };
            return currentSnapshot;
          }
        }
      } catch {
        /* ignore */
      }
      if (currentSnapshot.fetchedAt.getTime() > 0) {
        return { ...currentSnapshot, source: 'cache' as const };
      }
      currentSnapshot = {
        base: 'USD',
        rates: DEFAULT_RATES,
        fetchedAt: new Date(),
        source: 'cache',
      };
      return currentSnapshot;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function startExchangeRateWorker(): void {
  if (refreshTimer) return;
  void refreshExchangeRates(true);
  refreshTimer = setInterval(() => {
    void refreshExchangeRates(true);
  }, REFRESH_MS);
}

export function getExchangeSnapshot(): ExchangeSnapshot {
  return currentSnapshot;
}

export async function getRateForCurrency(currency: string): Promise<number> {
  const snapshot = await refreshExchangeRates(false);
  const code = normalizeCurrency(currency);
  return Number(snapshot.rates[code] || 1);
}

export async function convertUsdToCurrency(
  usdAmount: number,
  currency: string,
  options: ConvertOptions = {},
): Promise<{ usd: number; local: number; currency: string; rate: number }> {
  const code = normalizeCurrency(currency);
  const rate = await getRateForCurrency(code);
  const local = safeRound(Number(usdAmount || 0) * rate, options.roundMode || 'round');
  return { usd: Number(usdAmount || 0), local, currency: code, rate };
}

/**
 * Convert a seller-entered listing amount in `currency` (units per 1 USD from API) to canonical USD stored on Product.price.
 * Uses the same rate table as buyer display (USD → local rate; invert for local → USD).
 */
export async function convertListingToUsd(
  localAmount: number,
  currency: string,
): Promise<{ usd: number; rate: number }> {
  const code = normalizeCurrency(currency);
  if (code === 'USD') {
    return { usd: Math.max(0.01, Math.round(Number(localAmount || 0) * 100) / 100), rate: 1 };
  }
  const rate = await getRateForCurrency(code);
  if (!rate || rate <= 0) {
    return { usd: Math.max(0.01, Math.round(Number(localAmount || 0) * 100) / 100), rate: 1 };
  }
  const usd = Math.round((Number(localAmount || 0) / rate) * 100) / 100;
  return { usd: Math.max(0.01, usd), rate };
}

function countryCodeFromHeaders(req: Request): string {
  const candidates = [
    req.headers['cf-ipcountry'],
    req.headers['x-vercel-ip-country'],
    req.headers['cloudfront-viewer-country'],
    req.headers['fastly-client-geo-country'],
    req.headers['x-country-code'],
    req.headers['x-appengine-country'],
  ];
  for (const raw of candidates) {
    const code = String(raw || '')
      .trim()
      .toUpperCase()
      .slice(0, 2);
    if (code && code !== 'XX' && code !== 'T1' && /^[A-Z]{2}$/.test(code)) return code;
  }
  return '';
}

export function detectCurrencyFromRequest(req: Request): string {
  const hdrCountry = countryCodeFromHeaders(req);
  if (hdrCountry && COUNTRY_TO_CURRENCY[hdrCountry]) return COUNTRY_TO_CURRENCY[hdrCountry];
  const lang = String(req.headers['accept-language'] || '').toLowerCase();
  if (lang.includes('rw')) return 'RWF';
  if (lang.includes('sw')) return 'KES';
  if (lang.includes('fr')) return 'EUR';
  return 'USD';
}
