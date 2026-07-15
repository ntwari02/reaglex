const STORAGE_KEY = 'spacilly_detected_delivery_v1';
const STORAGE_TTL_MS = 6 * 60 * 60 * 1000;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pickNearestDestination(destinations, lat, lng) {
  if (!destinations?.length || lat == null || lng == null) return null;
  let best = null;
  let bestKm = Infinity;
  for (const d of destinations) {
    if (d.lat == null || d.lng == null) continue;
    const km = haversineKm(lat, lng, Number(d.lat), Number(d.lng));
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return best;
}

function rwandaDistrictFromAddress(address = {}) {
  const raw =
    address.state_district ||
    address.county ||
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    '';
  return String(raw).trim();
}

async function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '10');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('reverse geocode failed');
  const data = await res.json();
  const address = data?.address || {};
  const countryCode = String(address.country_code || '').toUpperCase();
  const district = rwandaDistrictFromAddress(address);
  return {
    countryCode: countryCode || 'RW',
    countryName: address.country || (countryCode === 'RW' ? 'Rwanda' : ''),
    district,
    city: district || address.city || address.town || '',
    lat,
    lng,
  };
}

export function readCachedDetection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at || Date.now() - parsed.at > STORAGE_TTL_MS) return null;
    return parsed.location || null;
  } catch {
    return null;
  }
}

export function writeCachedDetection(location) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ at: Date.now(), location }),
    );
  } catch {
    /* ignore */
  }
}

export function buildLocationFromDestination(dest, districtOverride) {
  const district =
    districtOverride ||
    dest?.region ||
    dest?.city ||
    '';
  const city = dest?.city || district;
  return {
    country: dest?.countryCode || 'RW',
    countryName: dest?.countryName || 'Rwanda',
    city,
    district,
    state: dest?.region || '',
    zip: '',
    displayLabel: dest?.displayLabel || city,
    source: 'detected',
  };
}

export async function detectUserDeliveryLocation(destinations) {
  const cached = readCachedDetection();
  if (cached) return cached;

  if (!navigator?.geolocation) {
    return null;
  }

  const coords = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  });

  const lat = coords.latitude;
  const lng = coords.longitude;
  let geo = null;
  try {
    geo = await reverseGeocode(lat, lng);
  } catch {
    geo = { countryCode: 'RW', countryName: 'Rwanda', district: '', city: '', lat, lng };
  }

  const nearest = pickNearestDestination(destinations, lat, lng);
  const district =
    geo.countryCode === 'RW' && geo.district
      ? geo.district
      : nearest?.region || nearest?.city || geo.city || '';

  const loc = nearest
    ? {
        ...buildLocationFromDestination(nearest, district),
        source: 'gps',
      }
    : {
        country: geo.countryCode || 'RW',
        countryName: geo.countryName || 'Rwanda',
        city: district || geo.city || 'Kigali',
        district: district || geo.city || '',
        state: '',
        zip: '',
        displayLabel: district || geo.city || 'Rwanda',
        source: 'gps',
      };

  writeCachedDetection(loc);
  return loc;
}
