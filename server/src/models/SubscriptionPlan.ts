import mongoose, { Document, Schema } from 'mongoose';

export interface IPlan {
  plan_id: string;
  tier_id: string;
  tier_name: string;
  display_name: string;
  name: string;
  price: number;
  currency: string;
  billing_cycle: string;
  billing_cycles: {
    monthly: number;
    annual: number;
  };
  product_limits: {
    max_products: number;
    max_products_display: string;
    is_unlimited: boolean;
  };
  usage_limits: {
    storage_bytes: number;
    storage_display: string;
    api_calls_per_month: number;
    api_calls_per_day: number;
    bandwidth_per_month_gb: number;
    is_unlimited: boolean;
  };
  trial_days: number;
  trial_enabled: boolean;
  discount_rules: Array<{
    discount_id: string;
    type: string;
    value: number;
    applies_to: string;
    min_commitment_months: number;
    valid_from: Date | string;
    valid_until: Date | string | null;
  }>;
  tier_upgrade_path: {
    can_upgrade_to: string[];
    can_downgrade_to?: string[];
    upgrade_benefits: string[];
    upgrade_pricing: Record<string, number>;
  };
  features: string[];
  limits: {
    products: {
      limit: number;
      display: string;
      is_unlimited: boolean;
    };
    storage: {
      limit_bytes: number;
      limit_display: string;
      is_unlimited: boolean;
    };
    analytics: {
      enabled: boolean;
      level: string;
    };
    api_calls_per_month: number;
    support_level: string;
    custom_branding: boolean;
    white_label: boolean;
  };
  identity_requirements: {
    identity_status: string;
    requires_verification: boolean;
    requires_tax_id: boolean;
    requires_business_registration: boolean;
    risk_level_allowed: string[];
  };
  is_popular: boolean;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ISubscriptionPlansDocument extends Document {
  plans: IPlan[];
  metadata: {
    version: string;
    schema_version: string;
    last_updated: Date | string;
    currency_default: string;
    supported_currencies: string[];
    supported_payment_gateways: string[];
    supported_payout_destinations: string[];
    payment_method_icons?: {
      visa?: string;
      mtn?: string;
      airtel?: string;
    };
  };
}

const subscriptionPlansSchema = new Schema<ISubscriptionPlansDocument>(
  {
    plans: { type: [Schema.Types.Mixed], required: true, default: [] } as any,
    metadata: { type: Schema.Types.Mixed, required: true },
  },
  { collection: 'plans', timestamps: false }
);

export const SubscriptionPlans = mongoose.model<ISubscriptionPlansDocument>('SubscriptionPlans', subscriptionPlansSchema);

// Helper function to get plans from the document
export async function getPlansFromDB(): Promise<IPlan[]> {
  const plansDoc = await SubscriptionPlans.findOne().lean();
  if (!plansDoc || !plansDoc.plans) {
    return [];
  }
  return plansDoc.plans.filter((plan: IPlan) => plan.is_active && plan.is_visible);
}

// Helper function to get a single plan by tier_id
export async function getPlanByTierId(tierId: string): Promise<IPlan | null> {
  const plansDoc = await SubscriptionPlans.findOne().lean();
  if (!plansDoc || !plansDoc.plans) {
    return null;
  }
  const plan = plansDoc.plans.find((p: IPlan) => p.tier_id === tierId && p.is_active && p.is_visible);
  return plan || null;
}
