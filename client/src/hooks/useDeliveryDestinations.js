import { useEffect, useState } from 'react';
import { shippingAPI } from '../services/api';

let cache = null;
let cacheAt = 0;
const TTL_MS = 5 * 60 * 1000;

export function useDeliveryDestinations() {
  const [countries, setCountries] = useState(cache?.countries || []);
  const [destinations, setDestinations] = useState(cache?.destinations || []);
  const [defaultDestination, setDefaultDestination] = useState(cache?.defaultDestination || null);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cache && Date.now() - cacheAt < TTL_MS) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await shippingAPI.getDestinations();
        if (!mounted) return;
        cache = data;
        cacheAt = Date.now();
        setCountries(data.countries || []);
        setDestinations(data.destinations || []);
        setDefaultDestination(data.defaultDestination || null);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load destinations');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { countries, destinations, defaultDestination, loading, error };
}

export function formatDeliverToLabel(loc) {
  if (!loc?.city) return 'Select location';
  const country = loc.countryName || loc.country || '';
  if (country && country.length > 2 && country !== loc.city) {
    return `${loc.city}, ${country}`;
  }
  return loc.city;
}
