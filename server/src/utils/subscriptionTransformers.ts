import { IPlan } from '../models/SubscriptionPlan';
import { ISellerSubscription } from '../models/SellerSubscription';

/**
 * Transform MongoDB plan to frontend Tier format
 */
export function transformPlanToTier(plan: IPlan, currentTierId?: string) {
  return {
    id: plan.tier_id,
    name: plan.tier_name,
    price: plan.price,
    features: plan.features,
    limits: {
      products: plan.limits.products.display,
      storage: plan.limits.storage.limit_display,
      analytics: plan.limits.analytics.enabled,
    },
    current: currentTierId === plan.tier_id,
    popular: plan.is_popular,
  };
}

/**
 * Transform MongoDB invoice to frontend Invoice format
 */
export function transformInvoiceToFrontend(invoice: any) {
  return {
    id: invoice.invoice_id,
    invoiceNumber: invoice.invoice_number || invoice.invoice_id,
    date: formatDate(invoice.date),
    amount: invoice.subscription_amount,
    currency: invoice.currency || 'USD',
    status: invoice.status,
    plan: invoice.plan_name,
    planId: invoice.plan_id,
    period: invoice.period,
    periodType: invoice.period_type,
    commission: invoice.breakdown?.gross_commission || 0,
    processingFees: invoice.breakdown?.processing_fees || 0,
    otherFees: invoice.breakdown?.other_fees || 0,
    adjustments: invoice.breakdown?.adjustments || 0,
    netPayout: invoice.breakdown?.net_payout || 0,
    payoutDate: formatDate(invoice.payout?.scheduled_date),
    payoutStatus: invoice.payout?.payout_status || 'pending',
    payoutMethod: invoice.payout?.payout_method || 'bank_transfer',
    payoutReference: invoice.payout?.payout_reference || null,
    paymentMethodId: invoice.payment_method_id || null,
    paymentDate: formatDate(invoice.payment_date),
    transactionId: invoice.transaction_id || null,
    gatewayRef: invoice.gateway_ref || null,
    invoiceUrl: invoice.invoice_url || null,
    createdAt: formatDate(invoice.created_at),
    updatedAt: formatDate(invoice.updated_at),
  };
}

/**
 * Transform MongoDB payment method to frontend format
 */
export function transformPaymentMethodToFrontend(method: any) {
  return {
    id: method.payment_method_id,
    type: method.type || 'card',
    last4: method.last4,
    brand: method.brand || method.type?.toUpperCase() || 'Card',
    expiry: method.expiry_display || null,
    phoneNumber: method.phone_number || null,
    isDefault: method.is_default,
  };
}

/**
 * Transform current plan data to frontend format
 */
export function transformCurrentPlanToFrontend(subscription: ISellerSubscription) {
  return {
    name: subscription.current_plan.tier_name,
    price: subscription.current_plan.price,
    renewalDate: formatDate(subscription.current_plan.renewal_date),
    limits: {
      products: subscription.plan_features.product_limit,
      storage: subscription.plan_features.storage_limit,
      analytics: subscription.plan_features.analytics_enabled,
    },
  };
}

/**
 * Format ISO date to YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Calculate next renewal date based on billing cycle
 */
export function calculateRenewalDate(startDate: Date, billingCycle: string): Date {
  const renewal = new Date(startDate);
  if (billingCycle === 'monthly') {
    renewal.setMonth(renewal.getMonth() + 1);
  } else if (billingCycle === 'annual') {
    renewal.setFullYear(renewal.getFullYear() + 1);
  }
  return renewal;
}

/**
 * Calculate prorated amount for plan upgrade/downgrade
 */
export function calculateProratedAmount(
  oldPrice: number,
  newPrice: number,
  daysRemaining: number,
  totalDaysInCycle: number
): number {
  const oldProrated = (oldPrice * daysRemaining) / totalDaysInCycle;
  const newProrated = (newPrice * daysRemaining) / totalDaysInCycle;
  return newProrated - oldProrated;
}

