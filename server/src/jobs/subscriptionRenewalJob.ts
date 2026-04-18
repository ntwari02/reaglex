import cron from 'node-cron';
import { SellerSubscription } from '../models/SellerSubscription';
import { calculateRenewalDate } from '../utils/subscriptionTransformers';
import { chargeDefaultPaymentMethodForSubscription } from '../services/subscriptionBilling.service';

function ensurePaymentMethodsArray(paymentMethods: unknown): any[] {
  if (!paymentMethods) return [];
  if (Array.isArray(paymentMethods)) return paymentMethods;
  return [paymentMethods];
}

/**
 * Daily: charge default payment method for subscriptions past renewal_date (auto_renew, paid plans).
 */
cron.schedule('15 7 * * *', async () => {
  try {
    const now = new Date();
    const rows = await SellerSubscription.find({
      is_active: true,
      status: 'active',
      'current_plan.auto_renew': true,
      'current_plan.price': { $gt: 0 },
      'current_plan.renewal_date': { $lte: now },
    })
      .limit(100)
      .lean();

    for (const row of rows) {
      try {
        const subscription = await SellerSubscription.findById(row._id);
        if (!subscription) continue;

        const paymentMethods = ensurePaymentMethodsArray(subscription.payment_methods);
        const defaultPaymentMethod = paymentMethods.find((m: any) => m && m.is_default && m.is_active !== false);
        if (!defaultPaymentMethod) continue;

        const plan = subscription.current_plan as Record<string, any>;
        const amount = Number(plan?.price ?? 0);
        if (amount <= 0) continue;

        const currency = String(plan?.currency || 'USD');
        const result = await chargeDefaultPaymentMethodForSubscription(
          defaultPaymentMethod as Record<string, unknown>,
          amount,
          currency,
          `Subscription renewal: ${plan?.tier_name || 'plan'}`,
          { subscriptionUserId: subscription.user_id.toString(), renewal: true }
        );

        if (!result.success) {
          // eslint-disable-next-line no-console
          console.warn(`[subscription-renewal] charge failed for ${subscription.user_id}:`, result.message);
          continue;
        }

        const cycleStart = new Date();
        const newRenewal = calculateRenewalDate(cycleStart, plan.billing_cycle || 'monthly');

        subscription.set('current_plan', {
          ...plan,
          renewal_date: newRenewal,
          start_date: cycleStart,
        });
        subscription.markModified('current_plan');

        const invoiceId = `inv_renew_${Date.now()}_${subscription._id}`;
        const billingSlice = Array.isArray(subscription.billing_history) ? subscription.billing_history : [];
        billingSlice.push({
          invoice_id: invoiceId,
          invoice_number: invoiceId,
          date: cycleStart,
          period: cycleStart.toISOString().slice(0, 7),
          period_type: plan.billing_cycle,
          plan_name: plan.tier_name,
          plan_id: plan.plan_id,
          subscription_amount: amount,
          currency,
          status: 'paid',
          payment_method_id: (defaultPaymentMethod as any).payment_method_id,
          payment_date: cycleStart,
          transaction_id: result.transactionId,
          gateway_ref: result.gatewayRef,
          created_at: cycleStart,
          updated_at: cycleStart,
        } as any);
        subscription.billing_history = billingSlice;
        subscription.markModified('billing_history');

        if (!Array.isArray(subscription.financial_events)) subscription.financial_events = [];
        subscription.financial_events.push({
          event_id: `evt_renew_${Date.now()}`,
          type: 'subscription',
          subtype: 'renewal',
          gateway_ref: result.gatewayRef,
          amount,
          currency,
          status: result.status,
          description: 'Subscription renewal',
          processed_at: cycleStart,
          created_at: cycleStart,
        } as any);
        subscription.markModified('financial_events');

        const stats = subscription.statistics as Record<string, any> | undefined;
        if (stats) {
          stats.total_subscription_paid = (stats.total_subscription_paid || 0) + amount;
          stats.last_updated = cycleStart;
          subscription.markModified('statistics');
        }

        subscription.metadata = {
          ...((subscription.metadata as any) || {}),
          updated_at: cycleStart,
          last_modified_by: 'system:renewal_cron',
        };
        subscription.markModified('metadata');

        await subscription.save();
        // eslint-disable-next-line no-console
        console.log(`[subscription-renewal] renewed subscription ${subscription._id}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[subscription-renewal] row error', err);
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[subscription-renewal] tick error', err);
  }
});
