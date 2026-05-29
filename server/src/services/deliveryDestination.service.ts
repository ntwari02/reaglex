import { DeliveryDestination, IDeliveryDestination } from '../models/DeliveryDestination';
import { ShippingZone } from '../models/ShippingZone';

const DEFAULT_DESTINATIONS: Array<Partial<IDeliveryDestination>> = [
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    city: 'Kigali',
    region: 'Kigali City',
    displayLabel: 'Kigali, Rwanda',
    extraEtaDays: 0,
    etaDaysMin: 2,
    etaDaysMax: 5,
    lat: -1.9441,
    lng: 30.0619,
    isDefault: true,
    sortOrder: 0,
  },
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    city: 'Nyamagabe',
    region: 'Nyamagabe',
    displayLabel: 'Nyamagabe, Rwanda',
    extraEtaDays: 1,
    etaDaysMin: 3,
    etaDaysMax: 8,
    lat: -2.35,
    lng: 29.55,
    sortOrder: 1,
  },
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    city: 'Muhanga',
    region: 'Southern Province',
    displayLabel: 'Muhanga, Rwanda',
    extraEtaDays: 1,
    etaDaysMin: 3,
    etaDaysMax: 7,
    lat: -2.0764,
    lng: 29.7556,
    sortOrder: 2,
  },
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    city: 'Huye',
    region: 'Southern Province',
    displayLabel: 'Huye, Rwanda',
    extraEtaDays: 1,
    etaDaysMin: 3,
    etaDaysMax: 8,
    sortOrder: 3,
  },
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    city: 'Musanze',
    region: 'Northern Province',
    displayLabel: 'Musanze, Rwanda',
    extraEtaDays: 2,
    etaDaysMin: 4,
    etaDaysMax: 9,
    sortOrder: 4,
  },
  {
    countryCode: 'RW',
    countryName: 'Rwanda',
    city: 'Rubavu',
    region: 'Western Province',
    displayLabel: 'Rubavu, Rwanda',
    extraEtaDays: 2,
    etaDaysMin: 4,
    etaDaysMax: 10,
    sortOrder: 5,
  },
  {
    countryCode: 'KE',
    countryName: 'Kenya',
    city: 'Nairobi',
    displayLabel: 'Nairobi, Kenya',
    extraEtaDays: 2,
    etaDaysMin: 5,
    etaDaysMax: 12,
    sortOrder: 10,
  },
  {
    countryCode: 'UG',
    countryName: 'Uganda',
    city: 'Kampala',
    displayLabel: 'Kampala, Uganda',
    extraEtaDays: 2,
    etaDaysMin: 5,
    etaDaysMax: 12,
    sortOrder: 11,
  },
];

export async function ensureDefaultDeliveryDestinations(): Promise<void> {
  const count = await DeliveryDestination.countDocuments();
  if (count > 0) return;
  await DeliveryDestination.insertMany(
    DEFAULT_DESTINATIONS.map((d) => ({
      ...d,
      isActive: true,
    })),
  );
}

export async function ensureDefaultPlatformZones(): Promise<void> {
  const count = await ShippingZone.countDocuments();
  if (count > 0) return;
  await ShippingZone.insertMany([
    {
      name: 'Rwanda — local',
      type: 'local',
      rateType: 'distance',
      baseRate: 0,
      countries: ['RW'],
      codAvailable: true,
    },
    {
      name: 'East Africa',
      type: 'national',
      rateType: 'flat',
      baseRate: 2500,
      countries: ['KE', 'UG', 'TZ', 'BI'],
      codAvailable: false,
    },
    {
      name: 'International',
      type: 'international',
      rateType: 'flat',
      baseRate: 8000,
      countries: ['US', 'GB', 'FR', 'DE', 'CN'],
      codAvailable: false,
    },
  ]);
}

export async function findDeliveryDestination(
  countryCode: string,
  city: string,
): Promise<IDeliveryDestination | null> {
  const cc = String(countryCode || '').trim().toUpperCase();
  const c = String(city || '').trim();
  if (!cc || !c) return null;
  const exact = await DeliveryDestination.findOne({
    countryCode: cc,
    city: new RegExp(`^${escapeRegex(c)}$`, 'i'),
    isActive: true,
  }).lean();
  if (exact) return exact as IDeliveryDestination;
  return DeliveryDestination.findOne({ countryCode: cc, isDefault: true, isActive: true }).lean() as Promise<IDeliveryDestination | null>;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyDestinationEtaToMethods(
  methods: Array<{ etaDaysMin: number; etaDaysMax: number; [k: string]: unknown }>,
  dest: IDeliveryDestination | null,
): void {
  if (!dest) return;
  const extra = Number(dest.extraEtaDays || 0);
  for (const m of methods) {
    if (dest.etaDaysMin != null && dest.etaDaysMax != null) {
      m.etaDaysMin = dest.etaDaysMin;
      m.etaDaysMax = dest.etaDaysMax;
    } else if (extra > 0) {
      m.etaDaysMin += extra;
      m.etaDaysMax += extra;
    }
  }
}

export function buildDeliveryEstimateLabel(params: {
  city: string;
  countryName: string;
  etaDaysMin: number;
  etaDaysMax: number;
}): string {
  const { city, countryName, etaDaysMin, etaDaysMax } = params;
  if (etaDaysMin === etaDaysMax) {
    return `${city}, ${countryName} · ${etaDaysMin} day${etaDaysMin === 1 ? '' : 's'}`;
  }
  return `${city}, ${countryName} · ${etaDaysMin}–${etaDaysMax} days`;
}

export function aggregateDeliveryEstimate(
  groups: Array<{ methods?: Array<{ etaDaysMin: number; etaDaysMax: number; key?: string }> }>,
  dest: IDeliveryDestination | null,
  shippingAddress: { city: string; country: string },
): {
  etaDaysMin: number;
  etaDaysMax: number;
  displayLabel: string;
  destinationId?: string;
} {
  let etaMin = 99;
  let etaMax = 0;
  for (const g of groups) {
    const std = (g.methods || []).find((m) => m.key === 'standard') || g.methods?.[0];
    if (!std) continue;
    etaMin = Math.min(etaMin, std.etaDaysMin);
    etaMax = Math.max(etaMax, std.etaDaysMax);
  }
  if (etaMin === 99) {
    etaMin = dest?.etaDaysMin ?? 3;
    etaMax = dest?.etaDaysMax ?? 7;
  }
  const countryName = dest?.countryName || shippingAddress.country;
  const city = shippingAddress.city;
  return {
    etaDaysMin: etaMin,
    etaDaysMax: etaMax,
    displayLabel: buildDeliveryEstimateLabel({ city, countryName, etaDaysMin: etaMin, etaDaysMax: etaMax }),
    destinationId: dest?._id ? String(dest._id) : undefined,
  };
}
