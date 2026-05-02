/**
 * OpenRouteService (ORS) — primary route distance; haversine fallback when no API key or ORS fails.
 * Docs: https://openrouteservice.org/dev/#/api-docs
 */

const ORS_BASE = 'https://api.openrouteservice.org';

function getApiKey(): string {
  return String(process.env.OPENROUTESERVICE_API_KEY || process.env.ORS_API_KEY || '').trim();
}

export type LatLng = { lat: number; lng: number };

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle distance in km (fallback). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/** Build a stable cache key from rounded coordinates (≈100m grid). */
export function routeCacheKey(origin: LatLng, dest: LatLng): string {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return `ors:${r(origin.lng)},${r(origin.lat)}|${r(dest.lng)},${r(dest.lat)}`;
}

export async function geocodeAddressFreeform(text: string): Promise<LatLng | null> {
  const q = String(text || '').trim();
  if (!q) return null;
  const key = getApiKey();
  if (!key) return null;

  const url = new URL(`${ORS_BASE}/geocode/search`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('text', q.slice(0, 500));
  url.searchParams.set('size', '1');

  const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: Array<{ geometry?: { coordinates?: number[] } }> };
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  return { lng: coords[0], lat: coords[1] };
}

/**
 * Driving route distance (km) between two points using ORS directions API.
 */
export async function getDrivingDistanceKm(origin: LatLng, dest: LatLng): Promise<{
  distanceKm: number;
  source: 'openrouteservice' | 'haversine';
}> {
  const key = getApiKey();
  if (!key) {
    return { distanceKm: haversineKm(origin, dest) * 1.25, source: 'haversine' };
  }

  try {
    const url = `${ORS_BASE}/v2/directions/driving-car?api_key=${encodeURIComponent(key)}&start=${origin.lng},${origin.lat}&end=${dest.lng},${dest.lat}`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return { distanceKm: haversineKm(origin, dest) * 1.25, source: 'haversine' };
    }
    const data = (await res.json()) as { routes?: Array<{ summary?: { distance?: number } }> };
    const meters = data?.routes?.[0]?.summary?.distance;
    if (typeof meters !== 'number' || !Number.isFinite(meters) || meters <= 0) {
      return { distanceKm: haversineKm(origin, dest) * 1.25, source: 'haversine' };
    }
    return { distanceKm: meters / 1000, source: 'openrouteservice' };
  } catch {
    return { distanceKm: haversineKm(origin, dest) * 1.25, source: 'haversine' };
  }
}
