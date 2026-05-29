import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Search, Check } from 'lucide-react';
import { useDeliveryDestinations } from '../../hooks/useDeliveryDestinations';

export default function DeliveryLocationSheet({ open, onClose, value, onSelect }) {
  const { countries, loading } = useDeliveryDestinations();
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[220] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[221] max-h-[85dvh] rounded-t-3xl overflow-hidden flex flex-col"
            style={{ background: 'var(--card-bg)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--divider)' }}>
              <div className="flex items-center gap-2">
                <MapPin size={18} style={{ color: 'var(--brand-primary)' }} />
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Deliver to
                </h2>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-full" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search city or district…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setCountryFilter('')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${!countryFilter ? 'text-white' : ''}`}
                  style={{
                    background: !countryFilter ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                    borderColor: 'var(--divider)',
                    color: !countryFilter ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  All
                </button>
                {countries.map((c) => (
                  <button
                    key={c.countryCode}
                    type="button"
                    onClick={() => setCountryFilter(c.countryCode)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${countryFilter === c.countryCode ? 'text-white' : ''}`}
                    style={{
                      background: countryFilter === c.countryCode ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                      borderColor: 'var(--divider)',
                      color: countryFilter === c.countryCode ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {c.countryName}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {loading && (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  Loading locations…
                </p>
              )}
              {!loading && filtered.length === 0 && (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  No locations found. Ask admin to add your city.
                </p>
              )}
              <ul className="space-y-1">
                {filtered.map((d) => {
                  const selected =
                    value?.country === d.countryCode && value?.city?.toLowerCase() === d.city?.toLowerCase();
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
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                        style={{
                          background: selected ? 'var(--brand-tint)' : 'transparent',
                        }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {d.displayLabel}
                          </p>
                          {(d.etaDaysMin != null || d.extraEtaDays > 0) && (
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              Est.{' '}
                              {d.etaDaysMin != null && d.etaDaysMax != null
                                ? `${d.etaDaysMin}–${d.etaDaysMax} days`
                                : `+${d.extraEtaDays} day(s) vs capital`}
                            </p>
                          )}
                        </div>
                        {selected && <Check size={18} style={{ color: 'var(--brand-primary)' }} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
