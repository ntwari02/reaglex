export const searchAddress = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '6');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'rw,ug,tz,ke,bi,cd,za,ng,gh,et');
    url.searchParams.set('accept-language', 'en');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Spacilly-Marketplace/1.0 (spacillyitd@gmail.com)',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return data.map((item) => ({
      display_name: item.display_name,
      short_name: item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      city: item.address?.city || item.address?.town || item.address?.village || '',
      country: item.address?.country || '',
      country_code: item.address?.country_code?.toUpperCase() || '',
    }));
  } catch {
    return [];
  }
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Spacilly-Marketplace/1.0 (spacillyitd@gmail.com)',
      },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
};
