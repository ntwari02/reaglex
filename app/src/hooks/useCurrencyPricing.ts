import { useEffect, useMemo, useState } from 'react';
import { currencyApi } from '../services/currencyApi';
import { CURRENCY_SYMBOLS, formatIntNoDecimals, roundMoneyInt } from '../lib/currencyFormat';
import { useTheme } from '../contexts/ThemeContext';

const REFRESH_MS = 5 * 60 * 1000;

export function useCurrencyPricing() {
  const { currency, setCurrency } = useTheme();
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'cache'>('cache');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await currencyApi.getRates([currency, 'USD']);
        if (!mounted) return;
        setRate(Number(data?.rates?.[currency] || 1));
        setSource(data?.source || 'cache');
      } catch {
        if (!mounted) return;
        setRate((r) => r || 1);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [currency]);

  return useMemo(
    () => ({
      selectedCurrency: currency,
      setSelectedCurrency: (curr: string) => setCurrency(curr as any),
      rate,
      loading,
      source,
      convertUsdToLocal: (usd: number) => roundMoneyInt(Number(usd || 0) * rate),
      formatLocalWithUsd: (usd: number) => {
        const local = roundMoneyInt(Number(usd || 0) * rate);
        const symbol = CURRENCY_SYMBOLS[currency] || currency;
        return `${formatIntNoDecimals(local)} ${symbol} (~ $${formatIntNoDecimals(usd)} USD)`;
      },
      formatLocalOnly: (usd: number) => {
        const local = roundMoneyInt(Number(usd || 0) * rate);
        const symbol = CURRENCY_SYMBOLS[currency] || currency;
        return `${formatIntNoDecimals(local)} ${symbol}`;
      },
      formatUsd: (usd: number) => `$${formatIntNoDecimals(usd)}`,
    }),
    [currency, rate, loading, source, setCurrency],
  );
}
