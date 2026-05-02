import { Router } from 'express';
import { authenticate, AuthenticatedRequest, optionalAuthenticate } from '../middleware/auth';
import { User } from '../models/User';
import {
  detectCurrencyFromRequest,
  getExchangeSnapshot,
  isSupportedDisplayCurrency,
  refreshExchangeRates,
} from '../services/exchangeRate.service';

const router = Router();

router.get('/context', optionalAuthenticate, async (req, res) => {
  try {
    const snapshot = await refreshExchangeRates(false);
    const detectedRaw = detectCurrencyFromRequest(req);
    const detectedCurrency = isSupportedDisplayCurrency(detectedRaw) ? detectedRaw : 'USD';

    let preferredCurrency: string | null = null;
    let currencyUserPinned = false;
    const authUser = (req as AuthenticatedRequest).user;
    if (authUser?.id) {
      const u = (await User.findById(authUser.id)
        .select('preferences.currency preferences.currencyUserPinned')
        .lean()) as {
        preferences?: { currency?: string; currencyUserPinned?: boolean };
      } | null;
      const pc = u?.preferences?.currency ? String(u.preferences.currency).toUpperCase() : null;
      preferredCurrency = pc && isSupportedDisplayCurrency(pc) ? pc : null;
      currencyUserPinned = Boolean(u?.preferences?.currencyUserPinned);
    }

    const selectedCurrency = currencyUserPinned && preferredCurrency
      ? preferredCurrency
      : detectedCurrency;

    return res.json({
      baseCurrency: 'USD',
      detectedCurrency,
      selectedCurrency,
      currencyUserPinned,
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
    user.preferences = { ...user.preferences, currency, currencyUserPinned: true };
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
