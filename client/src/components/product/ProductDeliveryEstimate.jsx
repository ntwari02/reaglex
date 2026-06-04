import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { shippingAPI } from '../../services/api';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';

export default function ProductDeliveryEstimate({ productId, compact = false }) {
  const loc = useBuyerCart((s) => s.shippingPreviewLocation);
  const currencyPricing = useCurrencyPricing();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !loc?.country || !loc?.city) return undefined;
    let mounted = true;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await shippingAPI.estimateProduct({
          productId: String(productId),
          quantity: 1,
          destination: {
            country: loc.country,
            city: loc.city,
            state: loc.state || '',
            postal_code: loc.zip || '',
          },
        });
        if (mounted) setData(res);
      } catch {
        if (mounted) setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 400);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [productId, loc?.country, loc?.city, loc?.state, loc?.zip]);

  const eta = data?.deliveryEstimate;
  const shipping = data?.totalShipping;
  const place =
    loc?.displayLabel || (loc?.city && loc?.country ? `${loc.city}, ${loc.country}` : 'your location');

  if (!productId) return null;

  return (
    <div className={compact ? 'pd2-delivery-estimate pd2-delivery-estimate--compact' : 'pd2-delivery-estimate'}>
      <Truck size={14} aria-hidden />
      <span>
        {loading && `Estimating to ${place}…`}
        {!loading && eta && (
          <>
            To <strong>{place}</strong>
            {shipping != null && ` · ${currencyPricing.formatLocalWithUsd(shipping)} shipping`}
            {` · ${eta.etaDaysMin}–${eta.etaDaysMax} days`}
          </>
        )}
        {!loading && !eta && `Deliver to ${place} — set location in header for ETA`}
      </span>
    </div>
  );
}
