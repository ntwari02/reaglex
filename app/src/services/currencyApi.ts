import api from './api';

export interface CurrencyContextPayload {
  baseCurrency: 'USD';
  detectedCurrency: string;
  selectedCurrency: string;
  currencyUserPinned?: boolean;
  exchangeRate: number;
  fetchedAt: string;
  source: 'live' | 'cache';
}

export interface CurrencyRatesPayload {
  baseCurrency: 'USD';
  rates: Record<string, number>;
  fetchedAt: string;
  source: 'live' | 'cache';
}

export const currencyApi = {
  getContext: () => api.get('/currency/context').then((r) => r.data as CurrencyContextPayload),
  getRates: (symbols?: string[]) =>
    api
      .get('/currency/rates', {
        params: symbols?.length ? { symbols: symbols.join(',') } : undefined,
      })
      .then((r) => r.data as CurrencyRatesPayload),
  setPreference: (currency: string) => api.post('/currency/preference', { currency }).then((r) => r.data),
};
