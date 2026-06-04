import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Search, Check, ChevronRight } from 'lucide-react';
import { useDeliveryDestinations, formatDeliverToLabel } from '../../hooks/useDeliveryDestinations';
import { countryFlagEmoji } from '../../lib/countryFlag';
import '../../styles/delivery-location-sheet.css';

export default function DeliveryLocationSheet({ open, onClose, value, onSelect }) {
  const { countries, defaultDestination, loading } = useDeliveryDestinations();
  const [step, setStep] = useState('confirm');
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  useEffect(() => {
    if (open) {
      setStep('confirm');
      setQuery('');
      setCountryFilter('');
    }
  }, [open]);

  const confirmCountry = value?.countryName || value?.country || defaultDestination?.countryName || 'Rwanda';
  const confirmCode = value?.country || defaultDestination?.countryCode || 'RW';
  const confirmPlace = formatDeliverToLabel(value) || defaultDestination?.displayLabel || confirmCountry;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [];
    for (const c of countries) {
      if (countryFilter && c.countryCode !== countryFilter) continue;
      for (const city of c.cities || []) {
        const hay = `${city.displayLabel} ${city.city} ${c.countryName}`.toLowerCase();
        if (!q || hay.includes(q)) {
          list.push({ ...city, countryName: c.countryName });
        }
      }
    }
    return list;
  }, [countries, query, countryFilter]);

  const handleStay = () => {
    if (value?.city || value?.district) {
      onClose();
      return;
    }
    if (defaultDestination) {
      onSelect({
        country: defaultDestination.countryCode,
        countryName: defaultDestination.countryName,
        city: defaultDestination.city,
        district: defaultDestination.region || defaultDestination.city,
        state: defaultDestination.region || '',
        zip: '',
        displayLabel: defaultDestination.displayLabel,
      });
    }
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="dloc-overlay"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="dloc-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dloc-sheet-title"
          >
            <div className="dloc-sheet-handle" aria-hidden />
            {step === 'confirm' ? (
              <>
                <div className="dloc-sheet-head">
                  <h2 id="dloc-sheet-title" className="dloc-sheet-title">
                    Choose your location
                  </h2>
                  <button type="button" onClick={onClose} className="dloc-close" aria-label="Close">
                    <X size={22} strokeWidth={1.75} />
                  </button>
                </div>

                <p className="dloc-sheet-lead">
                  We will recommend goods and services based on the region you choose.
                </p>

                <button
                  type="button"
                  className="dloc-region-pick"
                  onClick={() => setStep('picker')}
                >
                  <MapPin size={18} className="dloc-region-pick__pin" aria-hidden />
                  <span className="dloc-region-pick__flag" aria-hidden>
                    {countryFlagEmoji(confirmCode)}
                  </span>
                  <span className="dloc-region-pick__label">{confirmPlace || confirmCountry}</span>
                  <ChevronRight size={18} className="dloc-region-pick__chev" aria-hidden />
                </button>

                <div className="dloc-sheet-actions">
                  <button type="button" className="dloc-btn dloc-btn--stay" onClick={handleStay}>
                    Stay
                  </button>
                  <button
                    type="button"
                    className="dloc-btn dloc-btn--leave"
                    onClick={() => setStep('picker')}
                  >
                    Leave
                  </button>
                </div>
              </>
            ) : (
              <div className="dloc-picker-body">
                <div className="dloc-sheet-head">
                  <button
                    type="button"
                    className="dloc-back"
                    onClick={() => setStep('confirm')}
                  >
                    ← Back
                  </button>
                  <h2 className="dloc-sheet-title">Change location</h2>
                  <button type="button" onClick={onClose} className="dloc-close" aria-label="Close">
                    <X size={20} strokeWidth={1.75} />
                  </button>
                </div>

                <div className="dloc-picker-tools">
                  <div className="dloc-search-wrap">
                    <Search size={16} className="dloc-search-icon" aria-hidden />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search city or district…"
                      className="dloc-search-input"
                    />
                  </div>
                  <div className="dloc-country-rail scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setCountryFilter('')}
                      className={`dloc-country-chip${!countryFilter ? ' is-active' : ''}`}
                    >
                      All regions
                    </button>
                    {countries.map((c) => (
                      <button
                        key={c.countryCode}
                        type="button"
                        onClick={() => setCountryFilter(c.countryCode)}
                        className={`dloc-country-chip${countryFilter === c.countryCode ? ' is-active' : ''}`}
                      >
                        {countryFlagEmoji(c.countryCode)} {c.countryName}
                      </button>
                    ))}
                  </div>
                </div>

                {!query.trim() && filtered.length > 0 && (
                  <>
                    <p className="dloc-quick-label">Popular</p>
                    <div className="dloc-quick-rail scrollbar-hide">
                      {filtered.slice(0, 10).map((d) => {
                        const selected =
                          value?.country === d.countryCode &&
                          value?.city?.toLowerCase() === d.city?.toLowerCase();
                        return (
                          <button
                            key={`quick-${d.id}`}
                            type="button"
                            className={`dloc-quick-chip${selected ? ' is-selected' : ''}`}
                            onClick={() => {
                              onSelect({
                                country: d.countryCode,
                                countryName: d.countryName,
                                city: d.city,
                                district: d.region || d.city,
                                state: d.region || '',
                                zip: '',
                                displayLabel: d.displayLabel,
                              });
                              onClose();
                            }}
                          >
                            {d.displayLabel}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="dloc-list">
                  {loading && <p className="dloc-list-empty">Loading locations…</p>}
                  {!loading && filtered.length === 0 && (
                    <p className="dloc-list-empty">No locations found. Try another search.</p>
                  )}
                  <ul className="dloc-list-ul">
                    {filtered.map((d) => {
                      const selected =
                        value?.country === d.countryCode &&
                        value?.city?.toLowerCase() === d.city?.toLowerCase();
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelect({
                                country: d.countryCode,
                                countryName: d.countryName,
                                city: d.city,
                                district: d.region || d.city,
                                state: d.region || '',
                                zip: '',
                                displayLabel: d.displayLabel,
                              });
                              onClose();
                            }}
                            className={`dloc-list-item${selected ? ' is-selected' : ''}`}
                          >
                            <div className="dloc-list-item__main">
                              <MapPin size={16} className="dloc-list-item__pin" aria-hidden />
                              <div>
                                <p className="dloc-list-item__title">{d.displayLabel}</p>
                                {(d.etaDaysMin != null || d.extraEtaDays > 0) && (
                                  <p className="dloc-list-item__meta">
                                    Est.{' '}
                                    {d.etaDaysMin != null && d.etaDaysMax != null
                                      ? `${d.etaDaysMin}–${d.etaDaysMax} days`
                                      : `+${d.extraEtaDays} day(s)`}
                                  </p>
                                )}
                              </div>
                            </div>
                            {selected && <Check size={18} className="dloc-list-check" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
