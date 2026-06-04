import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { SellerSubscription } from '../models/SellerSubscription';
import {
  evaluateEffectivePrice,
  getPlanByTierIdAny,
  planFeaturesFromPlan,
  type BillingCycleChoice,
} from './subscriptionPlan.service';
import { getPlanByTierId } from '../models/SubscriptionPlan';

export type SubscriptionFeatureKey =
  | 'analytics'
  | 'api_access'
  | 'advanced_api'
  | 'custom_branding'
  | 'white_label'
  | 'product_boost'
  | 'priority_support'
  | 'dedicated_support'
  | 'custom_integrations';

export interface SellerEntitlements {
  sellerId: string;
  tierId: string;
  tierName: string;
  planStatus: string;
  isActive: boolean;
  productLimit: number | null;
  productCount: number;
  storageLimitBytes: number | null;
  apiCallsPerMonth: number;
  analyticsEnabled: boolean;
  customBranding: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  advancedApi: boolean;
  customIntegrations: boolean;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  productBoostEnabled: boolean;
  productBoostMonthlyLimit: number | null;
  features: string[];
  effectivePrice: number;
  billingCycle: BillingCycleChoice;
}

function parseAdminCoupon(discountApplied: unknown): {
  code?: string;
  percent_off?: number;
  fixed_off?: number;
} | null {
  if (!discountApplied || typeof discountApplied !== 'object') return null;
  const d = discountApplied as Record<string, unknown>;
  return {
    code: d.code as string | undefined,
    percent_off: d.percent_off != null ? Number(d.percent_off) : undefined,
    fixed_off: d.fixed_off != null ? Number(d.fixed_off) : undefined,
  };
}

export async function getSellerEntitlements(sellerId: string): Promise<SellerEntitlements | null> {
  const oid = new mongoose.Types.ObjectId(sellerId);
  const sub = await SellerSubscription.findOne({ user_id: oid }).lean();
  if (!sub) return null;

  const tierId = sub.current_plan?.tier_id;
  const plan = tierId ? await getPlanByTierId(tierId) : null;
  const planAny = tierId && !plan ? await getPlanByTierIdAny(tierId) : plan;

  const overrides = (sub.metadata as any)?.admin_limit_overrides || {};
  const pf = sub.plan_features || ({} as Record<string, unknown>);

  let productLimit: number | null = null;
  const numericLimit = overrides.product_limit ?? pf.product_limit_numeric;
  if (numericLimit === -1 || pf.product_limit === 'unlimited') {
    productLimit = null;
  } else if (numericLimit != null && Number(numericLimit) > 0) {
    productLimit = Number(numericLimit);
  } else if (planAny?.limits?.products?.is_unlimited) {
    productLimit = null;
  } else if (planAny?.limits?.products?.limit != null) {
    productLimit = planAny.limits.products.limit;
  }

  let storageLimitBytes: number | null = null;
  const storageOverride = overrides.storage_bytes;
  if (storageOverride === -1) storageLimitBytes = null;
  else if (storageOverride != null) storageLimitBytes = Number(storageOverride);
  else if (planAny?.limits?.storage?.is_unlimited) storageLimitBytes = null;
  else storageLimitBytes = Number(pf.storage_limit_bytes ?? planAny?.limits?.storage?.limit_bytes ?? 0);

  const apiCallsPerMonth =
    overrides.api_calls_per_month != null
      ? Number(overrides.api_calls_per_month)
      : Number(planAny?.limits?.api_calls_per_month ?? 0);

  const boost = (planAny?.limits as any)?.product_boost;
  const boostFromFeatures = pf as any;
  let productBoostMonthlyLimit: number | null = 0;
  if (boostFromFeatures.product_boost_monthly_limit === -1 || boost?.is_unlimited) {
    productBoostMonthlyLimit = null;
  } else if (boostFromFeatures.product_boost_monthly_limit != null) {
    productBoostMonthlyLimit = Number(boostFromFeatures.product_boost_monthly_limit);
  } else if (boost?.enabled) {
    productBoostMonthlyLimit = boost.is_unlimited ? null : Number(boost.monthly_limit ?? 0);
  }

  const productCount = await Product.countDocuments({ sellerId: oid });

  const cycle: BillingCycleChoice =
    sub.current_plan?.billing_cycle === 'annual' ? 'annual' : 'monthly';
  const effective = planAny
    ? evaluateEffectivePrice(planAny, {
        billingCycle: cycle,
        adminCoupon: parseAdminCoupon(sub.current_plan?.discount_applied),
      })
    : { effectivePrice: Number(sub.current_plan?.effective_price ?? sub.current_plan?.price ?? 0) };

  return {
    sellerId,
    tierId: tierId || 'unknown',
    tierName: sub.current_plan?.tier_name || 'Unknown',
    planStatus: sub.current_plan?.status || sub.status || 'unknown',
    isActive: Boolean(sub.is_active),
    productLimit,
    productCount,
    storageLimitBytes,
    apiCallsPerMonth,
    analyticsEnabled: Boolean(pf.analytics_enabled),
    customBranding: Boolean(pf.custom_branding),
    whiteLabel: Boolean(pf.white_label),
    apiAccess: Boolean(pf.api_access),
    advancedApi: Boolean(pf.advanced_api),
    customIntegrations: Boolean(pf.custom_integrations),
    prioritySupport: Boolean(pf.priority_support),
    dedicatedSupport: Boolean(pf.dedicated_support),
    productBoostEnabled: Boolean(boostFromFeatures.product_boost_enabled ?? boost?.enabled),
    productBoostMonthlyLimit,
    features: planAny?.features || [],
    effectivePrice: effective.effectivePrice,
    billingCycle: cycle,
  };
}

export function hasEntitlementFeature(ent: SellerEntitlements, feature: SubscriptionFeatureKey): boolean {
  switch (feature) {
    case 'analytics':
      return ent.analyticsEnabled;
    case 'api_access':
      return ent.apiAccess;
    case 'advanced_api':
      return ent.advancedApi;
    case 'custom_branding':
      return ent.customBranding;
    case 'white_label':
      return ent.whiteLabel;
    case 'product_boost':
      return ent.productBoostEnabled;
    case 'priority_support':
      return ent.prioritySupport;
    case 'dedicated_support':
      return ent.dedicatedSupport;
    case 'custom_integrations':
      return ent.customIntegrations;
    default:
      return false;
  }
}

export async function assertCanCreateProduct(sellerId: string): Promise<{
  ok: boolean;
  message?: string;
  code?: string;
  entitlements?: SellerEntitlements;
}> {
  const ent = await getSellerEntitlements(sellerId);
  if (!ent) {
    return { ok: false, message: 'Active seller subscription required to list products.', code: 'NO_SUBSCRIPTION' };
  }
  if (!ent.isActive) {
    return {
      ok: false,
      message: 'Your subscription is inactive. Renew or contact support to list new products.',
      code: 'SUBSCRIPTION_INACTIVE',
      entitlements: ent,
    };
  }
  if (ent.productLimit != null && ent.productCount >= ent.productLimit) {
    return {
      ok: false,
      message: `Product limit reached (${ent.productCount}/${ent.productLimit}). Upgrade your plan to add more listings.`,
      code: 'PRODUCT_LIMIT',
      entitlements: ent,
    };
  }
  return { ok: true, entitlements: ent };
}

export async function assertFeatureAccess(
  sellerId: string,
  feature: SubscriptionFeatureKey,
): Promise<{ ok: boolean; message?: string; code?: string }> {
  const ent = await getSellerEntitlements(sellerId);
  if (!ent || !ent.isActive) {
    return { ok: false, message: 'Active subscription required.', code: 'NO_SUBSCRIPTION' };
  }
  if (!hasEntitlementFeature(ent, feature)) {
    const labels: Record<SubscriptionFeatureKey, string> = {
      analytics: 'Advanced analytics',
      api_access: 'API access',
      advanced_api: 'Advanced API',
      custom_branding: 'Custom branding',
      white_label: 'White-label',
      product_boost: 'Product boost',
      priority_support: 'Priority support',
      dedicated_support: 'Dedicated support',
      custom_integrations: 'Custom integrations',
    };
    return {
      ok: false,
      message: `${labels[feature]} is not included in your ${ent.tierName} plan. Upgrade to unlock this feature.`,
      code: 'FEATURE_NOT_IN_PLAN',
    };
  }
  return { ok: true };
}

export { planFeaturesFromPlan };
