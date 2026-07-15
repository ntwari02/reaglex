import { PlatformShippingPolicy, IPlatformShippingPolicy } from '../models/PlatformShippingPolicy';
import { ShippingZone } from '../models/ShippingZone';
import { DeliveryDestination } from '../models/DeliveryDestination';
import {
  ensureDefaultDeliveryDestinations,
  ensureDefaultPlatformZones,
  findDeliveryDestination,
} from './deliveryDestination.service';
import { invalidatePlatformTaxCache } from './platformTax.service';
import type { SpacillySellerShippingConfig, SpacillyShippingMethodRule } from '../types/spacillyShipping.types';

const POLICY_ID = 'platform-rw';

function clamp(n: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, n)) * 100) / 100;
}

export async function getPlatformShippingPolicy(): Promise<IPlatformShippingPolicy> {
  let doc = await PlatformShippingPolicy.findOne({ marketCode: 'RW' }).lean();
  if (!doc) {
    const created = await PlatformShippingPolicy.create({});
    doc = created.toObject();
  }
  return doc as IPlatformShippingPolicy;
}

export async function updatePlatformShippingPolicy(
  patch: Partial<IPlatformShippingPolicy>,
): Promise<IPlatformShippingPolicy> {
  const doc = await PlatformShippingPolicy.findOneAndUpdate(
    { marketCode: patch.marketCode || 'RW' },
    { $set: patch },
    { upsert: true, new: true },
  ).lean();
  invalidatePlatformTaxCache();
  return doc as IPlatformShippingPolicy;
}

export async function getPlatformShippingContext() {
  await ensureDefaultDeliveryDestinations();
  await ensureDefaultPlatformZones();
  const [policy, zones, destinations] = await Promise.all([
    getPlatformShippingPolicy(),
    ShippingZone.find({}).sort({ name: 1 }).lean(),
    DeliveryDestination.find({ isActive: true }).sort({ sortOrder: 1, city: 1 }).lean(),
  ]);

  return {
    policyId: POLICY_ID,
    policy: {
      marketCode: policy.marketCode,
      marketName: policy.marketName,
      currency: policy.currency,
      sellerCanDefineZones: policy.sellerCanDefineZones,
      feeLimits: policy.feeLimits,
      etaLimits: policy.etaLimits,
      enabledMethods: policy.enabledMethods || ['standard', 'express', 'pickup'],
      platformFreeShippingThreshold: policy.platformFreeShippingThreshold,
      defaultWarehouseCountry: policy.defaultWarehouseCountry,
      defaultWarehouseCity: policy.defaultWarehouseCity,
      buyerLocationPickerEnabled: policy.buyerLocationPickerEnabled !== false,
      codEnabled: policy.codEnabled !== false,
      salesTaxRate: Number(policy.salesTaxRate ?? 0.18),
    },
    zones: zones.map((z) => ({
      id: String(z._id),
      name: z.name,
      type: z.type,
      baseRate: z.baseRate,
      countries: z.countries || [],
      freeShippingThreshold: z.freeShippingThreshold,
    })),
    destinations: destinations.map((d) => ({
      id: String(d._id),
      countryCode: d.countryCode,
      countryName: d.countryName,
      city: d.city,
      displayLabel: d.displayLabel,
      extraEtaDays: d.extraEtaDays ?? 0,
      etaDaysMin: d.etaDaysMin,
      etaDaysMax: d.etaDaysMax,
      isDefault: Boolean(d.isDefault),
    })),
    roles: {
      admin: [
        'Delivery cities buyers see in header (Deliver to …)',
        'Country/region shipping zones & surcharges',
        'Platform fee limits and allowed delivery methods',
        'Default market (Rwanda) and free-shipping threshold',
      ],
      seller: [
        'Warehouse location (ship-from)',
        'Base fee, rate per km, and min fee within platform limits',
        'Enable standard / express / pickup per allowed methods',
        'Estimated days per method within platform ETA range',
      ],
    },
  };
}

export function platformZoneSurcharge(
  buyerCountry: string,
  platformZones: Array<{ countries?: string[]; baseRate?: number }>,
): number {
  const c = String(buyerCountry || '').toUpperCase();
  if (!c) return 0;
  let add = 0;
  for (const z of platformZones) {
    if ((z.countries || []).some((code) => String(code).toUpperCase() === c)) {
      add += Number(z.baseRate || 0);
    }
  }
  return add;
}

export function applyPlatformPolicyToSellerConfig(
  sellerCfg: SpacillySellerShippingConfig,
  policy: IPlatformShippingPolicy,
): SpacillySellerShippingConfig {
  const limits = policy.feeLimits;
  const eta = policy.etaLimits;
  const allowed = new Set((policy.enabledMethods || ['standard', 'express', 'pickup']).map(String));

  const defaults = {
    ...sellerCfg.defaults,
    baseFee: clamp(Number(sellerCfg.defaults.baseFee), limits.baseFee.min, limits.baseFee.max),
    ratePerKm: clamp(Number(sellerCfg.defaults.ratePerKm), limits.ratePerKm.min, limits.ratePerKm.max),
    handlingFee: clamp(
      Number(sellerCfg.defaults.handlingFee),
      limits.handlingFee.min,
      limits.handlingFee.max,
    ),
    minShippingFee: clamp(
      Number(sellerCfg.defaults.minShippingFee),
      limits.minShippingFee.min,
      limits.minShippingFee.max,
    ),
  };

  const methods = (sellerCfg.methods || [])
    .filter((m) => allowed.has(String(m.key)))
    .map((m) => normalizeMethodEta(m, eta.min, eta.max));

  const warehouses = (sellerCfg.warehouses || []).map((w) => ({
    ...w,
    country: w.country || policy.defaultWarehouseCountry,
    city: w.city || policy.defaultWarehouseCity,
  }));

  return {
    ...sellerCfg,
    currency: policy.currency || sellerCfg.currency,
    defaults,
    methods,
    warehouses,
    zones: policy.sellerCanDefineZones ? sellerCfg.zones || [] : [],
  };
}

function normalizeMethodEta(
  m: SpacillyShippingMethodRule,
  etaMin: number,
  etaMax: number,
): SpacillyShippingMethodRule {
  const days = Number(m.estimatedDays ?? m.etaDaysMax ?? 3);
  const min = clamp(Number(m.etaDaysMin ?? Math.max(etaMin, days - 1)), etaMin, etaMax);
  const max = clamp(Number(m.etaDaysMax ?? days), min, etaMax);
  return { ...m, etaDaysMin: min, etaDaysMax: max, estimatedDays: max };
}

export async function resolveEffectiveSellerConfig(
  rawSeller: unknown,
  resolveFn: (raw: unknown) => SpacillySellerShippingConfig,
): Promise<{ cfg: SpacillySellerShippingConfig; policy: IPlatformShippingPolicy; platformZones: any[] }> {
  const policy = await getPlatformShippingPolicy();
  const platformCtx = await getPlatformShippingContext();
  const base = resolveFn(rawSeller);
  const cfg = applyPlatformPolicyToSellerConfig(base, policy);
  return { cfg, policy, platformZones: platformCtx.zones };
}

export { findDeliveryDestination };
