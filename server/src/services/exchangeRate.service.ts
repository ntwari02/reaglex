import { Request } from 'express';

type RatesMap = Record<string, number>;

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
  FR: 'EUR',
  DE: 'EUR',
  BE: 'EUR',
  US: 'USD',
  CA: 'USD',
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
      return currentSnapshot;
    } catch {
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

export function detectCurrencyFromRequest(req: Request): string {
  const hdrCountry = String(req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toUpperCase();
  if (hdrCountry && COUNTRY_TO_CURRENCY[hdrCountry]) return COUNTRY_TO_CURRENCY[hdrCountry];
  const lang = String(req.headers['accept-language'] || '').toLowerCase();
  if (lang.includes('rw')) return 'RWF';
  if (lang.includes('sw')) return 'KES';
  if (lang.includes('fr')) return 'EUR';
  return 'USD';
}
