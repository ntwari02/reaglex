import { useEffect, useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useDeliveryDestinations, formatDeliverToLabel } from '../../hooks/useDeliveryDestinations';
import { usePlatformFeature } from '../../hooks/useSystemFeatures';
import DeliveryLocationSheet from './DeliveryLocationSheet';
import '../../styles/delivery-location.css';

export default function DeliveryLocationBar({ compact = false, className = '' }) {
  const { enabled: locationPickerOn } = usePlatformFeature('buyer_location_picker');
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const setShippingPreviewLocation = useBuyerCart((s) => s.setShippingPreviewLocation);
  const { defaultDestination, loading } = useDeliveryDestinations();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!locationPickerOn) return;
    if (loading || !defaultDestination) return;
    const hasCity = shippingPreviewLocation?.city?.trim();
    if (!hasCity || (shippingPreviewLocation.city === 'Kigali' && !shippingPreviewLocation.displayLabel)) {
      setShippingPreviewLocation({
        country: defaultDestination.countryCode,
        countryName: defaultDestination.countryName,
        city: defaultDestination.city,
        state: defaultDestination.region || '',
        zip: '',
        displayLabel: defaultDestination.displayLabel,
      });
    }
  }, [locationPickerOn, loading, defaultDestination, setShippingPreviewLocation, shippingPreviewLocation]);

  if (!locationPickerOn) return null;

  const label =
    shippingPreviewLocation?.displayLabel ||
    formatDeliverToLabel({
      city: shippingPreviewLocation?.city,
      country: shippingPreviewLocation?.country,
      countryName: shippingPreviewLocation?.countryName,
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`delivery-loc-bar${compact ? ' delivery-loc-bar--compact' : ''} ${className}`.trim()}
        aria-label={`Delivery location: ${label}`}
      >
        <MapPin size={compact ? 14 : 15} strokeWidth={2} className="delivery-loc-bar__icon" aria-hidden />
        <span className="delivery-loc-bar__prefix">Deliver to</span>
        <span className="delivery-loc-bar__place">{label}</span>
        <ChevronDown size={14} className="delivery-loc-bar__chev" aria-hidden />
      </button>

      <DeliveryLocationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={shippingPreviewLocation}
        onSelect={(loc) => setShippingPreviewLocation(loc)}
      />
    </>
  );
}
