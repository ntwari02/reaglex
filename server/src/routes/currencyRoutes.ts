import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import {
  detectCurrencyFromRequest,
  getExchangeSnapshot,
  isSupportedDisplayCurrency,
  refreshExchangeRates,
} from '../services/exchangeRate.service';

const router = Router();

router.get('/context', async (req, res) => {
  try {
    const snapshot = await refreshExchangeRates(false);
    const detectedCurrency = detectCurrencyFromRequest(req);
    const preferredCurrency = (req as AuthenticatedRequest).user?.id
      ? (await User.findById((req as AuthenticatedRequest).user?.id).select('preferences.currency').lean() as any)
          ?.preferences?.currency
      : null;

    const selectedCurrency = String(preferredCurrency || detectedCurrency || 'USD').toUpperCase();
    return res.json({
      baseCurrency: 'USD',
      detectedCurrency,
      selectedCurrency,
      exchangeRate: Number(snapshot.rates[selectedCurrency] || 1),
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load currency context' });
  }
});

router.get('/rates', async (req, res) => {
  try {
    const snapshot = await refreshExchangeRates(false);
    const symbolsRaw = String(req.query.symbols || '').trim();
    const symbols = symbolsRaw
      ? symbolsRaw
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : [];

    const rates = symbols.length
      ? symbols.reduce<Record<string, number>>((acc, symbol) => {
          acc[symbol] = Number(snapshot.rates[symbol] || 1);
          return acc;
        }, { USD: 1 })
      : snapshot.rates;

    return res.json({
      baseCurrency: 'USD',
      rates,
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load exchange rates' });
  }
});

router.post('/preference', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const currency = String(req.body?.currency || '').trim().toUpperCase();
    if (!currency || currency.length !== 3 || !isSupportedDisplayCurrency(currency)) {
      return res.status(400).json({ message: 'Invalid or unsupported currency code' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.preferences = { ...user.preferences, currency };
    await user.save();
    const snapshot = getExchangeSnapshot();
    return res.json({
      currency,
      rate: Number(snapshot.rates[currency] || 1),
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to save currency preference' });
  }
});

export default router;
