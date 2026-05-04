import { useEffect, useRef, useState } from 'react';
import { reverseGeocode, searchAddress } from '../../utils/geocoding';

export default function AddressSearchInput({ value, onChange, placeholder, required }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value?.address) {
      setQuery(value.address);
      setConfirmed(true);
    } else if (value?.lat && value?.lng) {
      reverseGeocode(value.lat, value.lng).then((addr) => {
        if (addr) {
          setQuery(addr);
          setConfirmed(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleType = (e) => {
    const val = e.target.value;
    setQuery(val);
    setConfirmed(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchAddress(val);
      setSuggestions(results);
      setShowDrop(results.length > 0 || val.length >= 3);
      setLoading(false);
    }, 420);
  };

  const pick = (s) => {
    setQuery(s.display_name);
    setConfirmed(true);
    setShowDrop(false);
    setSuggestions([]);
    onChange({
      lat: s.lat,
      lng: s.lng,
      address: s.display_name,
      country: s.country_code,
    });
  };

  const clear = () => {
    setQuery('');
    setConfirmed(false);
    setSuggestions([]);
    onChange({ lat: '', lng: '', address: '', country: '' });
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleType}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          placeholder={placeholder || 'Type your warehouse address, e.g. "Kigali City Tower"'}
          required={required}
          autoComplete="off"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 38px 10px 36px',
            border: confirmed ? '1.5px solid #FF6B00' : '1px solid #D1D5DB',
            borderRadius: 8,
            fontSize: 14,
            color: '#111827',
            outline: 'none',
            background: confirmed ? '#FFF9F5' : '#FFFFFF',
            transition: 'border 150ms, background 150ms',
          }}
        />

        <span
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 16,
            pointerEvents: 'none',
            opacity: confirmed ? 1 : 0.4,
          }}
        >
          📍
        </span>

        {loading ? (
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 15,
              height: 15,
              border: '2px solid #E5E7EB',
              borderTopColor: '#FF6B00',
              borderRadius: '50%',
              animation: 'addr-spin .6s linear infinite',
            }}
          />
        ) : confirmed ? (
          <button
            type="button"
            onClick={clear}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {confirmed && (
        <div
          style={{
            marginTop: 5,
            padding: '4px 10px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 6,
            fontSize: 12,
            color: '#065F46',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          ✓ Location confirmed - coordinates saved automatically
        </div>
      )}

      {showDrop && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={`${s.display_name}-${i}`}
              onClick={() => pick(s)}
              style={{
                padding: '11px 14px',
                cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFF5EE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1, fontSize: 15 }}>📍</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
                  {s.display_name.split(',')[0]}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 1.4 }}>
                  {s.display_name.split(',').slice(1).join(',').trim()}
                </div>
              </div>
            </div>
          ))}
          <div
            style={{
              padding: '5px 14px',
              fontSize: 10,
              color: '#9CA3AF',
              background: '#FAFAFA',
              borderTop: '1px solid #F3F4F6',
              borderRadius: '0 0 10px 10px',
            }}
          >
            Powered by OpenStreetMap - No API key required
          </div>
        </div>
      )}

      {showDrop && !loading && query.length >= 3 && suggestions.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
            fontSize: 13,
            color: '#6B7280',
            textAlign: 'center',
          }}
        >
          No results for "{query}". Try a different address or landmark.
        </div>
      )}

      <style>{`
        @keyframes addr-spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
