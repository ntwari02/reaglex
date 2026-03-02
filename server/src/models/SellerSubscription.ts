import mongoose, { Document, Schema } from 'mongoose';

export interface ISellerSubscription extends Document {
  seller_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  store_name: string;
  identity_and_trust: {
    identity_status: string;
    tax_id?: string;
    tax_id_type?: string;
    country: string;
    business_legal_name?: string;
    business_registration_number?: string;
    risk_level: string;
    risk_score: number;
    risk_factors: string[];
    device_fingerprints: Array<{
      fingerprint: string;
      device_type: string;
      browser: string;
      os: string;
      ip_address: string;
      first_seen: Date;
      last_seen: Date;
      is_trusted: boolean;
    }>;
    last_security_review: Date;
    security_review_frequency_days: number;
    next_security_review: Date;
    kyc_status: string;
    kyc_verified_at?: Date;
    kyc_documents: Array<{
      type: string;
      status: string;
      verified_at: Date;
    }>;
  };
  payment_gateway: {
    type: string;
    gateway_customer_id?: string;
    gateway_subscription_id?: string;
    default_payment_method_id?: string;
    billing_portal_url?: string;
    billing_portal_enabled: boolean;
    payout_destination: {
      type: string;
      gateway_account_id?: string;
      destination_id?: string;
      method: string;
      currency: string;
      country: string;
    };
    momo_account?: any;
    paypal_account?: any;
    gateway_metadata: Record<string, any>;
  };
  current_plan: {
    plan_id: string;
    tier_id: string;
    tier_name: string;
    name: string;
    price: number;
    currency: string;
    billing_cycle: string;
    status: string;
    start_date: Date;
    renewal_date: Date;
    auto_renew: boolean;
    cancelled_at?: Date;
    cancellation_reason?: string;
    trial_days: number;
    trial_used: boolean;
    discount_applied?: any;
    effective_price: number;
  };
  plan_features: {
    product_limit: string;
    product_limit_numeric: number;
    storage_limit: string;
    storage_limit_bytes: number;
    analytics_enabled: boolean;
    priority_support: boolean;
    custom_branding: boolean;
    api_access: boolean;
    fast_payment_processing: boolean;
    white_label: boolean;
    advanced_api: boolean;
    custom_integrations: boolean;
    dedicated_support: boolean;
  };
  financial_events: Array<{
    event_id: string;
    type: string;
    subtype: string;
    gateway_ref?: string;
    amount: number;
    currency: string;
    status: string;
    reason_code?: string;
    related_order?: string;
    related_invoice?: string;
    description: string;
    processed_at?: Date;
    created_at: Date;
  }>;
  billing_history: Array<{
    invoice_id: string;
    invoice_number: string;
    date: Date;
    period: string;
    period_type: string;
    plan_name: string;
    plan_id: string;
    subscription_amount: number;
    currency: string;
    status: string;
    payment_method_id?: string;
    payment_date?: Date;
    transaction_id?: string;
    gateway_ref?: string;
    breakdown: {
      gross_commission: number;
      processing_fees: number;
      other_fees: number;
      adjustments: number;
      net_payout: number;
    };
    payout: {
      scheduled_date: Date;
      actual_payout_date?: Date;
      payout_method: string;
      payout_status: string;
      payout_reference?: string;
      gateway_ref?: string;
    };
    invoice_url?: string;
    created_at: Date;
    updated_at: Date;
  }>;
  payment_methods: Array<{
    payment_method_id: string;
    type: string;
    brand: string;
    last4: string;
    expiry_month: number;
    expiry_year: number;
    expiry_display: string;
    cardholder_name?: string;
    is_default: boolean;
    is_active: boolean;
    gateway_payment_method_id?: string;
    gateway_type?: string;
    billing_address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    created_at: Date;
    updated_at: Date;
  }>;
  payout_settings: {
    frequency: string;
    frequency_options: string[];
    next_payout_date: Date;
    last_payout_date?: Date;
    payout_method: string;
    payout_destination: {
      type: string;
      account_holder_name?: string;
      account_type?: string;
      routing_number?: string;
      account_number_masked?: string;
      bank_name?: string;
      country: string;
      currency: string;
      is_verified: boolean;
      verified_at?: Date;
      gateway_account_id?: string;
    };
    minimum_payout_threshold: number;
    currency: string;
  };
  risk_and_defense: {
    failed_payments_count: number;
    failed_payments_last_30_days: number;
    failed_payments_history: any[];
    disputed_transactions: any[];
    dispute_count: number;
    dispute_count_last_90_days: number;
    location_mismatch_score: number;
    location_mismatch_events: any[];
    behavior_alerts: any[];
    suspicious_activity_flags: any[];
    fraud_score: number;
    fraud_indicators: string[];
    account_health_score: number;
    account_health_status: string;
    last_risk_assessment: Date;
    risk_assessment_frequency_days: number;
  };
  subscription_history: Array<{
    plan_id: string;
    tier_id: string;
    tier_name: string;
    start_date: Date;
    end_date?: Date;
    price: number;
    billing_cycle: string;
    reason: string;
    changed_at: Date;
    changed_by: string;
    change_ip?: string;
    change_user_agent?: string;
  }>;
  audit_logs: Array<{
    log_id: string;
    actor_id: string;
    actor_type: string;
    action: string;
    field: string;
    old_value?: any;
    new_value?: any;
    ip_address?: string;
    user_agent?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  statistics: {
    total_subscription_paid: number;
    total_commissions_earned: number;
    total_processing_fees: number;
    total_other_fees: number;
    total_net_payouts: number;
    average_monthly_payout: number;
    last_updated: Date;
  };
  b2b_payment_requests?: Array<{
    request_id: string;
    type: 'ach' | 'wire';
    status: 'pending' | 'approved' | 'rejected' | 'active';
    company_name: string;
    business_legal_name: string;
    tax_id: string;
    tax_id_type: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    annual_contract_value?: number;
    currency: string;
    country: string;
    bank_name?: string;
    account_type?: string;
    routing_number?: string;
    account_number_masked?: string;
    swift_code?: string;
    iban?: string;
    instructions?: string;
    notes?: string;
    requested_at: Date;
    reviewed_at?: Date;
    approved_at?: Date;
    reviewed_by?: string;
  }>;
  metadata: {
    created_at: Date;
    updated_at: Date;
    created_by: string;
    last_modified_by: string;
    version: number;
    schema_version: string;
    notes?: string;
  };
  status: string;
  is_active: boolean;
  trial: {
    is_trial: boolean;
    trial_start_date?: Date;
    trial_end_date?: Date;
    trial_days: number;
    trial_used?: boolean;
  };
}

const sellerSubscriptionSchema = new Schema<ISellerSubscription>(
  {
    seller_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    store_name: { type: String, required: true },
    identity_and_trust: { type: Schema.Types.Mixed, required: true },
    payment_gateway: { type: Schema.Types.Mixed, required: true },
    current_plan: { type: Schema.Types.Mixed, required: true },
    plan_features: { type: Schema.Types.Mixed, required: true },
    financial_events: { type: Schema.Types.Mixed, default: [] },
    billing_history: { type: Schema.Types.Mixed, default: [] },
    payment_methods: { type: Schema.Types.Mixed, default: [] },
    payout_settings: { type: Schema.Types.Mixed, required: true },
    risk_and_defense: { type: Schema.Types.Mixed, required: true },
    subscription_history: { type: Schema.Types.Mixed, default: [] },
    audit_logs: { type: Schema.Types.Mixed, default: [] },
    statistics: { type: Schema.Types.Mixed, required: true },
    metadata: { type: Schema.Types.Mixed, required: true },
    b2b_payment_requests: { type: Schema.Types.Mixed, default: [] },
    status: { type: String, default: 'active' },
    is_active: { type: Boolean, default: true },
    trial: { type: Schema.Types.Mixed, required: true },
  },
  { collection: 'seller_subscriptions', timestamps: false }
);

// Indexes for faster queries
sellerSubscriptionSchema.index({ user_id: 1 });
sellerSubscriptionSchema.index({ seller_id: 1 });
sellerSubscriptionSchema.index({ 'current_plan.tier_id': 1 });
sellerSubscriptionSchema.index({ status: 1, is_active: 1 });

export const SellerSubscription = mongoose.model<ISellerSubscription>('SellerSubscription', sellerSubscriptionSchema);

