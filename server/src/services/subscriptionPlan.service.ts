import { SubscriptionPlans, IPlan, ISubscriptionPlansDocument } from '../models/SubscriptionPlan';

export type BillingCycleChoice = 'monthly' | 'annual';

export interface EffectivePriceResult {
  basePrice: number;
  effectivePrice: number;
  discountAmount: number;
  billingCycle: BillingCycleChoice;
  appliedDiscounts: Array<{ id: string; label: string; amount: number }>;
}

export interface PlanUpsertInput {
  tier_id?: string;
  tier_name: string;
  display_name?: string;
  name: string;
  price?: number;
  currency?: string;
  billing_cycle?: string;
  billing_cycles?: { monthly: number; annual: number };
  features?: string[];
  limits?: Partial<IPlan['limits']> & {
    product_boost?: {
      enabled?: boolean;
      monthly_limit?: number;
      is_unlimited?: boolean;
    };
  };
  discount_rules?: IPlan['discount_rules'];
  trial_days?: number;
  trial_enabled?: boolean;
  is_popular?: boolean;
  is_active?: boolean;
  is_visible?: boolean;
  sort_order?: number;
}

function roundMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

export function planFeaturesFromPlan(plan: IPlan) {
  const boost = (plan.limits as any)?.product_boost;
  return {
    product_limit: plan.limits.products.is_unlimited ? 'unlimited' : plan.limits.products.display,
    product_limit_numeric: plan.limits.products.is_unlimited ? -1 : plan.limits.products.limit,
    storage_limit: plan.limits.storage.limit_display,
    storage_limit_bytes: plan.limits.storage.limit_bytes,
    analytics_enabled: plan.limits.analytics.enabled,
    priority_support: plan.limits.support_level !== 'email',
    custom_branding: plan.limits.custom_branding,
    api_access: plan.limits.api_calls_per_month > 0,
    fast_payment_processing: true,
    white_label: plan.limits.white_label,
    advanced_api: plan.limits.api_calls_per_month > 10000,
    custom_integrations: Boolean((plan.limits as any)?.custom_integrations),
    dedicated_support: plan.limits.support_level === 'dedicated_24_7',
    product_boost_enabled: Boolean(boost?.enabled),
    product_boost_monthly_limit: boost?.is_unlimited ? -1 : Number(boost?.monthly_limit ?? 0),
  };
}

export function planMarketingBullets(p: IPlan): string[] {
  const out: string[] = [];
  if (p.limits?.products?.is_unlimited) out.push('Unlimited products');
  else if (p.limits?.products?.display) out.push(`Up to ${p.limits.products.display} products`);
  if (p.limits?.analytics?.enabled) out.push('Advanced analytics');
  const sup = p.limits?.support_level || '';
  if (sup && sup !== 'email') out.push('Priority support');
  out.push('Fast payment processing');
  if (p.limits?.custom_branding) out.push('Custom branding');
  if ((p.limits?.api_calls_per_month ?? 0) > 0) out.push('API access');
  const boost = (p.limits as any)?.product_boost;
  if (boost?.enabled) {
    if (boost.is_unlimited) out.push('Unlimited product boosts');
    else if (boost.monthly_limit > 0) out.push(`Up to ${boost.monthly_limit} boosts per month`);
  }
  if (p.features?.length) {
    for (const f of p.features.slice(0, 8)) {
      if (!out.includes(f)) out.push(f);
    }
  }
  return out.slice(0, 12);
}

export function basePriceForCycle(plan: IPlan, cycle: BillingCycleChoice): number {
  const cycles = plan.billing_cycles;
  if (cycles) {
    const fromCycles = cycle === 'annual' ? Number(cycles.annual) : Number(cycles.monthly);
    if (Number.isFinite(fromCycles) && fromCycles >= 0) return fromCycles;
  }
  if (cycle === 'annual' && plan.price > 0) {
    return roundMoney(plan.price * 0.8 * 12);
  }
  return Number(plan.price) || 0;
}

export function evaluateEffectivePrice(
  plan: IPlan,
  opts: {
    billingCycle?: BillingCycleChoice;
    couponCode?: string | null;
    adminCoupon?: { code?: string; percent_off?: number; fixed_off?: number } | null;
    now?: Date;
  } = {},
): EffectivePriceResult {
  const cycle = opts.billingCycle || (plan.billing_cycle === 'annual' ? 'annual' : 'monthly');
  const now = opts.now || new Date();
  let price = basePriceForCycle(plan, cycle);
  const applied: EffectivePriceResult['appliedDiscounts'] = [];

  for (const rule of plan.discount_rules || []) {
    const from = rule.valid_from ? new Date(rule.valid_from) : null;
    const until = rule.valid_until ? new Date(rule.valid_until) : null;
    if (from && now < from) continue;
    if (until && now > until) continue;
    const appliesTo = String(rule.applies_to || 'all').toLowerCase();
    if (appliesTo !== 'all' && appliesTo !== cycle) continue;

    const type = String(rule.type || '').toLowerCase();
    const value = Number(rule.value) || 0;
    let amount = 0;
    if (type === 'percent' || type === 'percentage') {
      amount = roundMoney((price * value) / 100);
    } else if (type === 'fixed' || type === 'amount') {
      amount = roundMoney(Math.min(price, value));
    }
    if (amount > 0) {
      price = roundMoney(price - amount);
      applied.push({
        id: rule.discount_id || `rule_${applied.length}`,
        label: `${value}${type.includes('percent') ? '%' : ''} promotion`,
        amount,
      });
    }
  }

  const coupon = opts.adminCoupon || (opts.couponCode ? { code: opts.couponCode } : null);
  if (coupon?.percent_off && coupon.percent_off > 0) {
    const amount = roundMoney((price * coupon.percent_off) / 100);
    price = roundMoney(price - amount);
    applied.push({
      id: 'admin_coupon',
      label: coupon.code ? `Coupon ${coupon.code} (${coupon.percent_off}%)` : `${coupon.percent_off}% off`,
      amount,
    });
  }
  if (coupon?.fixed_off && coupon.fixed_off > 0) {
    const amount = roundMoney(Math.min(price, coupon.fixed_off));
    price = roundMoney(price - amount);
    applied.push({
      id: 'admin_coupon_fixed',
      label: coupon.code ? `Coupon ${coupon.code}` : 'Fixed discount',
      amount,
    });
  }

  const base = basePriceForCycle(plan, cycle);
  return {
    basePrice: base,
    effectivePrice: price,
    discountAmount: roundMoney(base - price),
    billingCycle: cycle,
    appliedDiscounts: applied,
  };
}

async function loadDoc(): Promise<ISubscriptionPlansDocument | null> {
  return SubscriptionPlans.findOne();
}

export async function getAllPlansForAdmin(): Promise<IPlan[]> {
  const doc = await loadDoc();
  if (!doc?.plans) return [];
  return [...doc.plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export async function getPlanByTierIdAny(tierId: string): Promise<IPlan | null> {
  const doc = await loadDoc();
  if (!doc?.plans) return null;
  return doc.plans.find((p) => p.tier_id === tierId) || null;
}

function slugTierId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

function defaultLimits(input?: PlanUpsertInput['limits']): IPlan['limits'] {
  const products = input?.products;
  const storage = input?.storage;
  const boost = input?.product_boost;
  return {
    products: {
      limit: products?.limit ?? 50,
      display: products?.display ?? String(products?.limit ?? 50),
      is_unlimited: Boolean(products?.is_unlimited),
    },
    storage: {
      limit_bytes: storage?.limit_bytes ?? 5_368_709_120,
      limit_display: storage?.limit_display ?? '5 GB',
      is_unlimited: Boolean(storage?.is_unlimited),
    },
    analytics: {
      enabled: input?.analytics?.enabled ?? false,
      level: input?.analytics?.level ?? 'basic',
    },
    api_calls_per_month: input?.api_calls_per_month ?? 0,
    support_level: input?.support_level ?? 'email',
    custom_branding: input?.custom_branding ?? false,
    white_label: input?.white_label ?? false,
    ...(boost
      ? {
          product_boost: {
            enabled: Boolean(boost.enabled),
            monthly_limit: Number(boost.monthly_limit ?? 0),
            is_unlimited: Boolean(boost.is_unlimited),
          },
        }
      : {}),
  } as IPlan['limits'];
}

export async function createPlan(input: PlanUpsertInput): Promise<IPlan> {
  let doc = await loadDoc();
  if (!doc) {
    doc = await SubscriptionPlans.create({
      plans: [],
      metadata: {
        version: '1.0',
        schema_version: '3.1',
        last_updated: new Date(),
        currency_default: input.currency || 'USD',
        supported_currencies: ['USD', 'RWF'],
        supported_payment_gateways: ['stripe', 'mtn_momo', 'airtel_money', 'paypal'],
        supported_payout_destinations: ['bank_account', 'momo'],
      },
    });
  }

  const tierId = input.tier_id?.trim() || slugTierId(input.tier_name);
  if (doc.plans.some((p) => p.tier_id === tierId)) {
    throw new Error(`Plan with tier_id "${tierId}" already exists`);
  }

  const now = new Date();
  const plan: IPlan = {
    plan_id: `plan_${tierId}_${Date.now()}`,
    tier_id: tierId,
    tier_name: input.tier_name,
    display_name: input.display_name || input.name,
    name: input.name,
    price: Number(input.price ?? 0),
    currency: input.currency || 'USD',
    billing_cycle: input.billing_cycle || 'monthly',
    billing_cycles: input.billing_cycles || {
      monthly: Number(input.price ?? 0),
      annual: roundMoney(Number(input.price ?? 0) * 0.8 * 12),
    },
    product_limits: {
      max_products: input.limits?.products?.limit ?? 50,
      max_products_display: input.limits?.products?.display ?? '50',
      is_unlimited: Boolean(input.limits?.products?.is_unlimited),
    },
    usage_limits: {
      storage_bytes: input.limits?.storage?.limit_bytes ?? 5_368_709_120,
      storage_display: input.limits?.storage?.limit_display ?? '5 GB',
      api_calls_per_month: input.limits?.api_calls_per_month ?? 0,
      api_calls_per_day: Math.ceil((input.limits?.api_calls_per_month ?? 0) / 30),
      bandwidth_per_month_gb: 100,
      is_unlimited: false,
    },
    trial_days: input.trial_days ?? 0,
    trial_enabled: input.trial_enabled ?? false,
    discount_rules: input.discount_rules || [],
    tier_upgrade_path: {
      can_upgrade_to: [],
      can_downgrade_to: [],
      upgrade_benefits: [],
      upgrade_pricing: {},
    },
    features: input.features || [],
    limits: defaultLimits(input.limits),
    identity_requirements: {
      identity_status: 'verified',
      requires_verification: false,
      requires_tax_id: false,
      requires_business_registration: false,
      risk_level_allowed: ['low', 'medium', 'high'],
    },
    is_popular: input.is_popular ?? false,
    is_active: input.is_active ?? true,
    is_visible: input.is_visible ?? true,
    sort_order: input.sort_order ?? doc.plans.length,
    created_at: now,
    updated_at: now,
  };

  doc.plans.push(plan as any);
  doc.metadata = { ...doc.metadata, last_updated: now };
  doc.markModified('plans');
  doc.markModified('metadata');
  await doc.save();
  return plan;
}

export async function updatePlan(tierId: string, input: PlanUpsertInput): Promise<IPlan> {
  const doc = await loadDoc();
  if (!doc) throw new Error('No plan catalog found');

  const idx = doc.plans.findIndex((p) => p.tier_id === tierId);
  if (idx < 0) throw new Error('Plan not found');

  const existing = doc.plans[idx] as IPlan;
  const now = new Date();

  const merged: IPlan = {
    ...existing,
    tier_name: input.tier_name ?? existing.tier_name,
    display_name: input.display_name ?? existing.display_name,
    name: input.name ?? existing.name,
    price: input.price !== undefined ? Number(input.price) : existing.price,
    currency: input.currency ?? existing.currency,
    billing_cycle: input.billing_cycle ?? existing.billing_cycle,
    billing_cycles: input.billing_cycles ?? existing.billing_cycles,
    features: input.features ?? existing.features,
    discount_rules: input.discount_rules ?? existing.discount_rules,
    trial_days: input.trial_days ?? existing.trial_days,
    trial_enabled: input.trial_enabled ?? existing.trial_enabled,
    is_popular: input.is_popular ?? existing.is_popular,
    is_active: input.is_active ?? existing.is_active,
    is_visible: input.is_visible ?? existing.is_visible,
    sort_order: input.sort_order ?? existing.sort_order,
    updated_at: now,
    limits: input.limits
      ? {
          ...existing.limits,
          ...input.limits,
          products: { ...existing.limits.products, ...(input.limits.products || {}) },
          storage: { ...existing.limits.storage, ...(input.limits.storage || {}) },
          analytics: { ...existing.limits.analytics, ...(input.limits.analytics || {}) },
          ...((input.limits as any).product_boost
            ? {
                product_boost: {
                  ...(existing.limits as any).product_boost,
                  ...(input.limits as any).product_boost,
                },
              }
            : {}),
        }
      : existing.limits,
  };

  if (input.limits?.products) {
    merged.product_limits = {
      max_products: merged.limits.products.limit,
      max_products_display: merged.limits.products.display,
      is_unlimited: merged.limits.products.is_unlimited,
    };
  }

  doc.plans[idx] = merged as any;
  doc.metadata = { ...doc.metadata, last_updated: now };
  doc.markModified('plans');
  doc.markModified('metadata');
  await doc.save();
  return merged;
}

export async function deletePlan(tierId: string, hard = false): Promise<void> {
  const doc = await loadDoc();
  if (!doc) throw new Error('No plan catalog found');

  const idx = doc.plans.findIndex((p) => p.tier_id === tierId);
  if (idx < 0) throw new Error('Plan not found');

  if (hard) {
    doc.plans.splice(idx, 1);
  } else {
    const plan = doc.plans[idx] as IPlan;
    plan.is_active = false;
    plan.is_visible = false;
    plan.updated_at = new Date();
    doc.plans[idx] = plan as any;
  }

  doc.metadata = { ...doc.metadata, last_updated: new Date() };
  doc.markModified('plans');
  doc.markModified('metadata');
  await doc.save();
}
