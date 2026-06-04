import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import {
  useDeliveryDestinations,
  formatDeliverToLabel,
  formatHeaderDeliveryLabel,
} from '../../hooks/useDeliveryDestinations';
import { usePlatformFeature } from '../../hooks/useSystemFeatures';
import { detectUserDeliveryLocation } from '../../lib/deliveryLocationDetect';
import DeliveryLocationSheet from './DeliveryLocationSheet';
import '../../styles/delivery-location.css';

export default function DeliveryLocationBar({
  compact = false,
  headerCenter = false,
  className = '',
}) {
  const { enabled: locationPickerOn } = usePlatformFeature('buyer_location_picker');
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const setShippingPreviewLocation = useBuyerCart((s) => s.setShippingPreviewLocation);
  const { destinations, defaultDestination, loading } = useDeliveryDestinations();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (!locationPickerOn || loading) return;
    if (shippingPreviewLocation?.source === 'manual') return;

    const hasMeaningful =
      shippingPreviewLocation?.source === 'gps' ||
      shippingPreviewLocation?.source === 'detected' ||
      (shippingPreviewLocation?.city &&
        shippingPreviewLocation.city !== 'Kigali' &&
        shippingPreviewLocation?.displayLabel);

    if (hasMeaningful) return;

    let cancelled = false;
    (async () => {
      setDetecting(true);
      try {
        const detected = await detectUserDeliveryLocation(destinations);
        if (cancelled) return;
        if (detected) {
          setShippingPreviewLocation(detected);
          return;
        }
        if (defaultDestination) {
          setShippingPreviewLocation({
            country: defaultDestination.countryCode,
            countryName: defaultDestination.countryName,
            city: defaultDestination.city,
            district: defaultDestination.region || defaultDestination.city,
            state: defaultDestination.region || '',
            zip: '',
            displayLabel: defaultDestination.displayLabel,
            source: 'default',
          });
        }
      } catch {
        if (!cancelled && defaultDestination) {
          setShippingPreviewLocation({
            country: defaultDestination.countryCode,
            countryName: defaultDestination.countryName,
            city: defaultDestination.city,
            district: defaultDestination.region || defaultDestination.city,
            state: defaultDestination.region || '',
            zip: '',
            displayLabel: defaultDestination.displayLabel,
            source: 'default',
          });
        }
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    locationPickerOn,
    loading,
    destinations,
    defaultDestination,
    setShippingPreviewLocation,
    shippingPreviewLocation?.source,
    shippingPreviewLocation?.city,
    shippingPreviewLocation?.displayLabel,
  ]);

  if (!locationPickerOn) return null;

  const headerLabel = formatHeaderDeliveryLabel(shippingPreviewLocation, { detecting });
  const standardLabel =
    shippingPreviewLocation?.displayLabel ||
    formatDeliverToLabel({
      city: shippingPreviewLocation?.city,
      district: shippingPreviewLocation?.district,
      country: shippingPreviewLocation?.country,
      countryName: shippingPreviewLocation?.countryName,
    });

  const isHeader = headerCenter || compact;

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={[
          'delivery-loc-bar',
          compact ? 'delivery-loc-bar--compact' : '',
          headerCenter ? 'delivery-loc-bar--header-center' : '',
          isHeader ? 'delivery-loc-bar--header' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={`Delivery location: ${headerCenter ? headerLabel : standardLabel}`}
      >
        {!isHeader && (
          <MapPin size={compact ? 14 : 15} strokeWidth={2} className="delivery-loc-bar__icon" aria-hidden />
        )}
        {headerCenter && (
          <MapPin size={16} strokeWidth={2} className="delivery-loc-bar__icon delivery-loc-bar__icon--header" aria-hidden />
        )}
        {headerCenter ? (
          <span className="delivery-loc-bar__header-line">
            {/^delivery in /i.test(headerLabel) ? (
              <>
                <span className="delivery-loc-bar__header-muted">Delivery In </span>
                <span className="delivery-loc-bar__header-place">
                  {headerLabel.replace(/^delivery in\s*/i, '')}
                </span>
              </>
            ) : (
              <span className="delivery-loc-bar__header-muted">{headerLabel}</span>
            )}
          </span>
        ) : (
          <>
            <span className="delivery-loc-bar__prefix">Deliver to</span>
            <span className="delivery-loc-bar__place">{standardLabel}</span>
            <ChevronDown size={14} className="delivery-loc-bar__chev" aria-hidden />
          </>
        )}
      </button>

      <DeliveryLocationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        value={shippingPreviewLocation}
        onSelect={(loc) =>
          setShippingPreviewLocation({
            ...loc,
            district: loc.district || loc.city,
            source: 'manual',
          })
        }
      />
    </>
  );
}
