import mongoose from 'mongoose';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { ShippingRouteCache } from '../models/ShippingRouteCache';
import {
  geocodeAddressFreeform,
  getDrivingDistanceKm,
  haversineKm,
  routeCacheKey,
  type LatLng,
} from './openRouteService';
import {
  type SpacillySellerShippingConfig,
  type SpacillyShippingMethodKey,
  type SpacillyShippingMethodRule,
  defaultSpacillySellerShipping,
} from '../types/spacillyShipping.types';
import {
  applyDestinationEtaToMethods,
  findDeliveryDestination,
} from './deliveryDestination.service';
import {
  getPlatformShippingContext,
  platformZoneSurcharge,
  applyPlatformPolicyToSellerConfig,
} from './platformShippingPolicy.service';

export const GROUP_KEY_SEP = '|';

/** Stable fingerprint for checkout lock — must match client quote `addressFingerprint`. */
export function fingerprintShippingAddress(shippingAddress: {
  address_line1?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}): string {
  const buyerCountry = String(shippingAddress.country || '').toUpperCase();
  return [
    shippingAddress.address_line1?.toLowerCase().trim(),
    shippingAddress.city?.toLowerCase().trim(),
    shippingAddress.postal_code?.toLowerCase().trim(),
    buyerCountry,
  ].join('|');
}

export function makeShipmentGroupKey(sellerId: string, warehouseId: string): string {
  return `${String(sellerId)}${GROUP_KEY_SEP}${String(warehouseId || 'default')}`;
}

export function parseShipmentGroupKey(key: string): { sellerId: string; warehouseId: string } {
  const i = key.indexOf(GROUP_KEY_SEP);
  if (i <= 0) return { sellerId: key, warehouseId: 'default' };
  return { sellerId: key.slice(0, i), warehouseId: key.slice(i + GROUP_KEY_SEP.length) || 'default' };
}

function mergeMethodRule(
  cfg: SpacillySellerShippingConfig,
  key: SpacillyShippingMethodKey
): SpacillyShippingMethodRule & {
  baseFee: number;
  ratePerKm: number;
  handlingFee: number;
  minShippingFee: number;
  expressDistanceMultiplier: number;
  distanceMultiplier: number;
  estimatedDays: number;
  flatFee: number;
  minOrderValue?: number;
  maxRadiusKm?: number;
  pickupFee: number;
  etaDaysMin: number;
  etaDaysMax: number;
  enabled: boolean;
  label?: string;
  freeShippingThreshold?: number;
} {
  const d = cfg.defaults;
  const m = cfg.methods.find((x) => x.key === key) || { key, enabled: key === 'standard', etaDaysMin: 3, etaDaysMax: 7 };
  const distanceMultiplier = m.distanceMultiplier ?? m.expressDistanceMultiplier ?? (key === 'express' ? 1.2 : 1);
  const estimatedDays = m.estimatedDays ?? m.etaDaysMax ?? 3;
  return {
    ...m,
    key,
    enabled: m.enabled !== false,
    etaDaysMin: m.etaDaysMin ?? Math.max(0, estimatedDays - 1),
    etaDaysMax: m.etaDaysMax ?? estimatedDays,
    baseFee: m.baseFee ?? d.baseFee,
    ratePerKm: m.ratePerKm ?? d.ratePerKm,
    handlingFee: m.handlingFee ?? d.handlingFee,
    minShippingFee: m.minShippingFee ?? d.minShippingFee,
    expressDistanceMultiplier: distanceMultiplier,
    distanceMultiplier,
    estimatedDays,
    flatFee: m.flatFee ?? 0,
    minOrderValue: m.minOrderValue,
    maxRadiusKm: m.maxRadiusKm,
    pickupFee: m.pickupFee ?? 0,
    freeShippingThreshold: m.freeShippingThreshold,
    label: m.label,
  };
}

export function resolveSellerShippingConfig(raw: unknown): SpacillySellerShippingConfig {
  const base = defaultSpacillySellerShipping();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SpacillySellerShippingConfig>;
  return {
    enabled: r.enabled !== false,
    currency: String(r.currency || base.currency),
    warehouses: Array.isArray(r.warehouses) && r.warehouses.length
      ? r.warehouses.map((w) => ({
          warehouseId: String(w.warehouseId || 'default'),
          label: String(w.label || 'Warehouse'),
          address: w.address,
          street: w.street,
          city: w.city,
          state: w.state,
          postalCode: w.postalCode,
          country: w.country,
          lat: Number(w.lat),
          lng: Number(w.lng),
          pickupAvailable: Boolean(w.pickupAvailable),
        }))
      : base.warehouses,
    defaults: {
      baseFee: Number(r.defaults?.baseFee ?? base.defaults.baseFee),
      ratePerKm: Number(r.defaults?.ratePerKm ?? base.defaults.ratePerKm),
      handlingFee: Number(r.defaults?.handlingFee ?? base.defaults.handlingFee),
      minShippingFee: Number(r.defaults?.minShippingFee ?? base.defaults.minShippingFee),
      freeShippingThreshold:
        r.defaults?.freeShippingThreshold != null ? Number(r.defaults.freeShippingThreshold) : undefined,
    },
    zones: Array.isArray(r.zones)
      ? r.zones.map((z) => ({
          id: String(z.id || 'zone'),
          name: String(z.name || ''),
          countryCodes: (z.countryCodes || []).map((c) => String(c).toUpperCase()),
          surcharge: Number(z.surcharge || 0),
        }))
      : [],
    methods: Array.isArray(r.methods) && r.methods.length ? (r.methods as SpacillyShippingMethodRule[]) : base.methods,
  };
}

async function getCachedOrComputeDistance(origin: LatLng, dest: LatLng): Promise<{ distanceKm: number; source: string }> {
  const key = routeCacheKey(origin, dest);
  const now = new Date();
  const cached = await ShippingRouteCache.findOne({ cacheKey: key, expiresAt: { $gt: now } }).lean();
  if (cached) {
    return { distanceKm: cached.distanceKm, source: cached.source };
  }
  const { distanceKm, source } = await getDrivingDistanceKm(origin, dest);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await ShippingRouteCache.findOneAndUpdate(
    { cacheKey: key },
    { cacheKey: key, distanceKm, source, expiresAt },
    { upsert: true }
  ).catch(() => null);
  return { distanceKm, source };
}

function zoneSurchargeForCountry(cfg: SpacillySellerShippingConfig, country: string): number {
  const c = String(country || '').toUpperCase();
  if (!c) return 0;
  let add = 0;
  for (const z of cfg.zones || []) {
    if ((z.countryCodes || []).includes(c)) add += Number(z.surcharge || 0);
  }
  return add;
}

export function computeMethodPrice(params: {
  cfg: SpacillySellerShippingConfig;
  methodKey: SpacillyShippingMethodKey;
  distanceKm: number;
  groupSubtotal: number;
  cartSubtotal: number;
  buyerCountry: string;
  platformFreeThreshold?: number;
  /** When set (platform-managed zones), replaces seller zone surcharges. */
  externalZoneSurcharge?: number;
}): {
  shippingTotal: number;
  freeShippingApplied: boolean;
  baseFee: number;
  ratePerKm: number;
  handlingFee: number;
  minShippingFee: number;
  zoneSurcharge: number;
} {
  const { cfg, methodKey, distanceKm, groupSubtotal, cartSubtotal, buyerCountry, platformFreeThreshold, externalZoneSurcharge } = params;
  const merged = mergeMethodRule(cfg, methodKey);
  if (!merged.enabled && methodKey !== 'pickup') {
    return {
      shippingTotal: 0,
      freeShippingApplied: false,
      baseFee: merged.baseFee,
      ratePerKm: merged.ratePerKm,
      handlingFee: merged.handlingFee,
      minShippingFee: merged.minShippingFee,
      zoneSurcharge: 0,
    };
  }

  const zoneSurcharge =
    externalZoneSurcharge != null
      ? externalZoneSurcharge
      : zoneSurchargeForCountry(cfg, buyerCountry);

  let freeShippingApplied = false;
  if (platformFreeThreshold != null && cartSubtotal >= platformFreeThreshold) {
    freeShippingApplied = true;
  }
  const sellerTh = cfg.defaults?.freeShippingThreshold;
  if (sellerTh != null && groupSubtotal >= sellerTh) freeShippingApplied = true;
  if (merged.freeShippingThreshold != null && groupSubtotal >= merged.freeShippingThreshold) {
    freeShippingApplied = true;
  }

  if (methodKey === 'pickup') {
    const fee = merged.pickupFee ?? 0;
    return {
      shippingTotal: freeShippingApplied ? 0 : fee,
      freeShippingApplied,
      baseFee: 0,
      ratePerKm: 0,
      handlingFee: 0,
      minShippingFee: 0,
      zoneSurcharge: 0,
    };
  }

  if (freeShippingApplied) {
    return {
      shippingTotal: 0,
      freeShippingApplied: true,
      baseFee: merged.baseFee,
      ratePerKm: merged.ratePerKm,
      handlingFee: merged.handlingFee,
      minShippingFee: merged.minShippingFee,
      zoneSurcharge,
    };
  }

  const distPart = distanceKm * merged.ratePerKm * (methodKey === 'express' ? merged.expressDistanceMultiplier : 1);
  let raw = merged.baseFee + distPart + merged.handlingFee + zoneSurcharge;
  raw = Math.max(raw, merged.minShippingFee);
  return {
    shippingTotal: Math.round(raw * 100) / 100,
    freeShippingApplied: false,
    baseFee: merged.baseFee,
    ratePerKm: merged.ratePerKm,
    handlingFee: merged.handlingFee,
    minShippingFee: merged.minShippingFee,
    zoneSurcharge,
  };
}

export type QuoteCartLine = { productId: string; quantity: number; variantSku?: string };

export type ShipmentGroupQuote = {
  groupKey: string;
  sellerId: string;
  warehouseId: string;
  warehouseLabel: string;
  origin: LatLng & { addressText?: string };
  lines: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  distanceKm: number;
  distanceSource: string;
  methods: Array<{
    key: SpacillyShippingMethodKey;
    label: string;
    enabled: boolean;
    price: number;
    freeShippingApplied: boolean;
    etaDaysMin: number;
    etaDaysMax: number;
    freeShippingThreshold?: number;
    pickupAvailable: boolean;
  }>;
};

export async function buildShipmentGroupsFromLines(
  lines: QuoteCartLine[],
  productsById: Map<string, { sellerId: mongoose.Types.ObjectId; name: string; price: number; warehouseId?: string }>
): Promise<Map<string, { sellerId: string; warehouseId: string; lines: QuoteCartLine[] }>> {
  const map = new Map<string, { sellerId: string; warehouseId: string; lines: QuoteCartLine[] }>();
  for (const line of lines) {
    const p = productsById.get(String(line.productId));
    if (!p) continue;
    const wid = String(p.warehouseId || 'default').trim() || 'default';
    const sid = String(p.sellerId);
    const key = makeShipmentGroupKey(sid, wid);
    if (!map.has(key)) {
      map.set(key, { sellerId: sid, warehouseId: wid, lines: [] });
    }
    map.get(key)!.lines.push(line);
  }
  return map;
}

export async function quoteSpacillyShipments(params: {
  lines: QuoteCartLine[];
  shippingAddress: {
    full_name: string;
    phone?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
  };
  selectedMethods?: Record<string, SpacillyShippingMethodKey>;
}): Promise<{
  groups: ShipmentGroupQuote[];
  totalShipping: number;
  addressFingerprint: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const ids = [...new Set(params.lines.map((l) => String(l.productId)))];
  const products = await Product.find({ _id: { $in: ids } })
    .select('sellerId name price warehouseId')
    .lean();
  const pmap = new Map<string, { sellerId: mongoose.Types.ObjectId; name: string; price: number; warehouseId?: string }>();
  for (const p of products) {
    pmap.set(String(p._id), {
      sellerId: p.sellerId as mongoose.Types.ObjectId,
      name: p.name,
      price: p.price,
      warehouseId: (p as { warehouseId?: string }).warehouseId,
    });
  }

  const groupMap = await buildShipmentGroupsFromLines(params.lines, pmap);
  const destText = [
    params.shippingAddress.address_line1,
    params.shippingAddress.address_line2,
    params.shippingAddress.city,
    params.shippingAddress.state,
    params.shippingAddress.postal_code,
    params.shippingAddress.country,
  ]
    .filter(Boolean)
    .join(', ');

  const buyerCountry = String(params.shippingAddress.country || '').toUpperCase();
  const buyerCity = String(params.shippingAddress.city || '').trim();
  const deliveryDest = await findDeliveryDestination(buyerCountry, buyerCity);

  let destCoords: LatLng | null = await geocodeAddressFreeform(destText);
  if (!destCoords && deliveryDest?.lat != null && deliveryDest?.lng != null) {
    destCoords = { lat: Number(deliveryDest.lat), lng: Number(deliveryDest.lng) };
    warnings.push(`Using ${deliveryDest.displayLabel || buyerCity} coordinates for distance estimate.`);
  }
  if (!destCoords) {
    warnings.push('Could not geocode buyer address; using default 5 km estimate.');
    destCoords = { lat: 0, lng: 0 };
  }
  const cartSubtotal = params.lines.reduce((s, l) => {
    const p = pmap.get(String(l.productId));
    return s + (p ? p.price * l.quantity : 0);
  }, 0);

  const platformCtx = await getPlatformShippingContext();
  const policy = platformCtx.policy;
  const platformFreeRaw = process.env.SPACILLY_PLATFORM_FREE_SHIPPING_THRESHOLD;
  const platformFreeThreshold =
    policy.platformFreeShippingThreshold ??
    (platformFreeRaw != null && String(platformFreeRaw).trim() !== ''
      ? Number(platformFreeRaw)
      : undefined);

  const groups: ShipmentGroupQuote[] = [];
  let totalShipping = 0;

  for (const [groupKey, g] of groupMap) {
    const seller = await User.findById(g.sellerId).select('spacillySellerShipping fullName').lean();
    const rawCfg = resolveSellerShippingConfig((seller as { spacillySellerShipping?: unknown })?.spacillySellerShipping);
    const cfg = applyPlatformPolicyToSellerConfig(rawCfg, policy as any);
    const externalZoneSurcharge = policy.sellerCanDefineZones
      ? undefined
      : platformZoneSurcharge(buyerCountry, platformCtx.zones);
    const wh = cfg.warehouses.find((w) => w.warehouseId === g.warehouseId) || cfg.warehouses[0];
    if (!wh || !Number.isFinite(wh.lat) || !Number.isFinite(wh.lng)) {
      warnings.push(`Seller ${g.sellerId} missing warehouse coordinates; using defaults.`);
    }
    const origin: LatLng = wh && Number.isFinite(wh.lat) && Number.isFinite(wh.lng) ? { lat: wh.lat, lng: wh.lng } : { lat: -1.9441, lng: 30.0619 };

    let distanceKm = 0;
    let distanceSource = 'none';
    if (destCoords.lat === 0 && destCoords.lng === 0) {
      distanceKm = 5;
      distanceSource = 'placeholder';
    } else {
      const d = await getCachedOrComputeDistance(origin, destCoords);
      distanceKm = d.distanceKm;
      distanceSource = d.source;
    }

    const lineDetails: ShipmentGroupQuote['lines'] = [];
    let subtotal = 0;
    for (const l of g.lines) {
      const p = pmap.get(String(l.productId));
      if (!p) continue;
      lineDetails.push({
        productId: String(l.productId),
        name: p.name,
        quantity: l.quantity,
        unitPrice: p.price,
      });
      subtotal += p.price * l.quantity;
    }

    const methodEntries: ShipmentGroupQuote['methods'] = [];
    const keys: SpacillyShippingMethodKey[] = ['standard', 'express', 'pickup'];
    const selected = params.selectedMethods?.[groupKey] || 'standard';

    for (const key of keys) {
      const merged = mergeMethodRule(cfg, key);
      const priced = computeMethodPrice({
        cfg,
        methodKey: key,
        distanceKm: key === 'pickup' ? 0 : distanceKm,
        groupSubtotal: subtotal,
        cartSubtotal,
        buyerCountry,
        platformFreeThreshold,
        externalZoneSurcharge,
      });
      methodEntries.push({
        key,
        label: merged.label || key,
        enabled:
          key === 'pickup'
            ? Boolean(wh?.pickupAvailable && mergeMethodRule(cfg, 'pickup').enabled)
            : merged.enabled,
        price: priced.shippingTotal,
        freeShippingApplied: priced.freeShippingApplied,
        etaDaysMin: merged.etaDaysMin,
        etaDaysMax: merged.etaDaysMax,
        freeShippingThreshold: merged.freeShippingThreshold ?? cfg.defaults.freeShippingThreshold,
        pickupAvailable: Boolean(wh?.pickupAvailable),
      });
    }

    applyDestinationEtaToMethods(methodEntries, deliveryDest);

    const chosen = keys.includes(selected) ? selected : 'standard';
    const chosenPrice =
      methodEntries.find((m) => m.key === chosen && m.enabled)?.price ??
      methodEntries.find((m) => m.key === 'standard')?.price ??
      0;

    totalShipping += chosenPrice;

    groups.push({
      groupKey,
      sellerId: g.sellerId,
      warehouseId: g.warehouseId,
      warehouseLabel: wh?.label || 'Warehouse',
      origin: { ...origin, addressText: [wh?.street, wh?.city, wh?.country].filter(Boolean).join(', ') },
      lines: lineDetails,
      subtotal,
      distanceKm: Math.round(distanceKm * 100) / 100,
      distanceSource,
      methods: methodEntries,
    });
  }

  const addressFingerprint = fingerprintShippingAddress(params.shippingAddress);

  return { groups, totalShipping: Math.round(totalShipping * 100) / 100, addressFingerprint, warnings };
}

export async function computeShippingForOrderGroup(params: {
  sellerId: string;
  warehouseId: string;
  lines: QuoteCartLine[];
  shippingAddress: {
    full_name: string;
    phone?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
  };
  methodKey: SpacillyShippingMethodKey;
}): Promise<{
  snapshot: Record<string, unknown>;
  shippingTotal: number;
}> {
  const sellerCfgDoc = await User.findById(params.sellerId).select('spacillySellerShipping').lean();
  const sellerCfg = resolveSellerShippingConfig(
    (sellerCfgDoc as { spacillySellerShipping?: unknown })?.spacillySellerShipping
  );

  const q = await quoteSpacillyShipments({
    lines: params.lines,
    shippingAddress: params.shippingAddress,
    selectedMethods: { [makeShipmentGroupKey(params.sellerId, params.warehouseId)]: params.methodKey },
  });
  const gk = makeShipmentGroupKey(params.sellerId, params.warehouseId);
  const g = q.groups.find((x) => x.groupKey === gk);
  if (!g) {
    return {
      shippingTotal: 5,
      snapshot: {
        version: 1,
        groupKey: gk,
        selectedShippingMethod: params.methodKey,
        distanceKm: 0,
        shippingTotal: 5,
        freeShippingApplied: false,
        shipmentStatus: 'pending',
      },
    };
  }
  const priced = computeMethodPrice({
    cfg: sellerCfg,
    methodKey: params.methodKey,
    distanceKm: params.methodKey === 'pickup' ? 0 : g.distanceKm,
    groupSubtotal: g.subtotal,
    cartSubtotal: q.groups.reduce((s, x) => s + x.subtotal, 0),
    buyerCountry: String(params.shippingAddress.country || '').toUpperCase(),
    platformFreeThreshold:
      process.env.SPACILLY_PLATFORM_FREE_SHIPPING_THRESHOLD != null
        ? Number(process.env.SPACILLY_PLATFORM_FREE_SHIPPING_THRESHOLD)
        : undefined,
  });

  const merged = mergeMethodRule(sellerCfg, params.methodKey);

  const destSnapshot = {
    full_name: params.shippingAddress.full_name,
    address_line1: params.shippingAddress.address_line1,
    address_line2: params.shippingAddress.address_line2,
    city: params.shippingAddress.city,
    state: params.shippingAddress.state,
    postal_code: params.shippingAddress.postal_code,
    country: params.shippingAddress.country,
  };

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + (merged.etaDaysMax || 7));

  return {
    shippingTotal: priced.shippingTotal,
    snapshot: {
      version: 1,
      groupKey: gk,
      sellerId: params.sellerId,
      warehouseId: params.warehouseId,
      warehouseLabel: g.warehouseLabel,
      origin: g.origin,
      buyerDelivery: destSnapshot,
      selectedShippingMethod: params.methodKey,
      distanceKm: g.distanceKm,
      distanceSource: g.distanceSource,
      baseFee: priced.baseFee,
      ratePerKm: priced.ratePerKm,
      handlingFee: priced.handlingFee,
      minShippingFee: priced.minShippingFee,
      zoneSurcharge: priced.zoneSurcharge,
      shippingTotal: priced.shippingTotal,
      freeShippingApplied: priced.freeShippingApplied,
      estimatedDeliveryFrom: from,
      estimatedDeliveryTo: to,
      trackingNumber: '',
      shipmentStatus: 'pending',
      deliveryProofUrl: '',
    },
  };
}
