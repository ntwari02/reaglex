import { useCallback, useEffect, useRef, useState } from 'react';
import { shippingAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

let taxRateCache = 0.18;
let taxRateCacheAt = 0;

async function getSalesTaxRate() {
  if (Date.now() - taxRateCacheAt < 5 * 60 * 1000) return taxRateCache;
  try {
    const ctx = await shippingAPI.getPlatformContext();
    const rate = Number(ctx?.policy?.salesTaxRate);
    if (Number.isFinite(rate) && rate >= 0 && rate <= 1) {
      taxRateCache = rate;
      taxRateCacheAt = Date.now();
    }
  } catch {
    /* keep cached/default */
  }
  return taxRateCache;
}

/**
 * Live shipping preview for the cart drawer (multi-seller, zone + distance rules).
 * Uses /shipping/estimate when logged out; /shipping/quote with estimate:true when logged in.
 */
export function useCartShippingPreview(items, shippingPreviewLocation) {
  const user = useAuthStore((s) => s.user);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taxRate, setTaxRate] = useState(taxRateCache);
  const timerRef = useRef(null);

  useEffect(() => {
    void getSalesTaxRate().then(setTaxRate);
  }, []);

  const run = useCallback(async () => {
    if (!items?.length || !shippingPreviewLocation?.country?.trim() || !shippingPreviewLocation?.city?.trim()) {
      setQuote(null);
      setError(null);
      return;
    }
    const lines = items.map((i) => ({ productId: i.id, quantity: i.quantity }));
    const dest = {
      country: shippingPreviewLocation.country.trim(),
      city: shippingPreviewLocation.city.trim(),
      state: shippingPreviewLocation.state?.trim() || '',
      postal_code: shippingPreviewLocation.zip?.trim() || '',
    };

    setLoading(true);
    setError(null);
    try {
      let data;
      if (user?.id) {
        data = await shippingAPI.quote({
          lines,
          estimate: true,
          shippingAddress: {
            full_name: user.fullName || user.name || 'Cart estimate',
            phone: user.phone || '000',
            address_line1: `${dest.city} (estimate)`,
            address_line2: '',
            city: dest.city,
            state: dest.state || '—',
            postal_code: dest.postal_code || '00000',
            country: dest.country,
          },
          selectedMethods: {},
        });
      } else {
        data = await shippingAPI.estimate({
          lines,
          destination: dest,
          selectedMethods: {},
        });
      }
      setQuote(data);
    } catch (e) {
      setQuote(null);
      setError(e?.response?.data?.message || e?.message || 'Shipping preview failed');
    } finally {
      setLoading(false);
    }
  }, [items, shippingPreviewLocation, user]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void run();
    }, 450);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [run]);

  const subtotal = (items || []).reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * taxRate;
  const shippingTotal = quote?.totalShipping != null ? Number(quote.totalShipping) : 0;
  const grand = subtotal + shippingTotal + tax;

  return { quote, loading, error, subtotal, tax, taxRate, shippingTotal, grand, refresh: run };
}
