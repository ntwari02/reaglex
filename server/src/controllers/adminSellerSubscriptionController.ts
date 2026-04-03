import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { SellerSubscription } from '../models/SellerSubscription';
import { User } from '../models/User';
import { getPlanByTierId, getPlansFromDB, IPlan } from '../models/SubscriptionPlan';
import { calculateRenewalDate } from '../utils/subscriptionTransformers';
import { createSystemInboxAndFanout } from '../services/systemInboxFanout';

async function notifySellerAndAdmins(opts: {
  sellerUserId: string;
  adminId: string;
  title: string;
  message: string;
}) {
  try {
    await createSystemInboxAndFanout({
      title: opts.title.slice(0, 240),
      message: opts.message.slice(0, 8000),
      type: 'system_announcement',
      priority: 'medium',
      targetAudience: 'specific_user',
      targetUserId: opts.sellerUserId,
      createdBy: opts.adminId,
    });
    await createSystemInboxAndFanout({
      title: `[Ops] ${opts.title}`.slice(0, 240),
      message: opts.message.slice(0, 8000),
      type: 'info',
      priority: 'low',
      targetAudience: 'all_admins',
      createdBy: opts.adminId,
    });
  } catch (e) {
    console.warn('[adminSellerSubscription] notifySellerAndAdmins', e);
  }
}

function planFeaturesFromPlan(plan: IPlan) {
  return {
    product_limit: plan.limits.products.is_unlimited ? 'unlimited' : plan.limits.products.display,
    product_limit_numeric: plan.limits.products.limit,
    storage_limit: plan.limits.storage.limit_display,
    storage_limit_bytes: plan.limits.storage.limit_bytes,
    analytics_enabled: plan.limits.analytics.enabled,
    priority_support: plan.limits.support_level !== 'email',
    custom_branding: plan.limits.custom_branding,
    api_access: plan.limits.api_calls_per_month > 0,
    fast_payment_processing: true,
    white_label: plan.limits.white_label,
    advanced_api: plan.limits.api_calls_per_month > 10000,
    custom_integrations: false,
    dedicated_support: plan.limits.support_level === 'dedicated_24_7',
  };
}

function pushAudit(
  sub: InstanceType<typeof SellerSubscription>,
  adminId: string,
  action: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
) {
  const logs = Array.isArray(sub.audit_logs) ? sub.audit_logs : [];
  logs.push({
    log_id: `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    actor_id: adminId,
    actor_type: 'admin',
    action,
    field,
    old_value: oldValue,
    new_value: newValue,
    timestamp: new Date(),
  });
  sub.audit_logs = logs;
  sub.markModified('audit_logs');
}

function planMarketingBullets(p: IPlan): string[] {
  const out: string[] = [];
  if (p.limits?.products?.is_unlimited) out.push('Unlimited products');
  else if (p.limits?.products?.display) out.push(`Up to ${p.limits.products.display} products`);
  if (p.limits?.analytics?.enabled) out.push('Advanced analytics');
  const sup = p.limits?.support_level || '';
  if (sup && sup !== 'email') out.push('Priority support');
  out.push('Fast payment processing');
  if (p.limits?.custom_branding) out.push('Custom branding');
  if ((p.limits?.api_calls_per_month ?? 0) > 0) out.push('API access');
  if (p.features?.length) {
    for (const f of p.features.slice(0, 6)) {
      if (!out.includes(f)) out.push(f);
    }
  }
  return out.slice(0, 8);
}

export async function adminListSubscriptionPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const plans = await getPlansFromDB();
    plans.sort((a, b) => a.sort_order - b.sort_order);
    return res.json({
      plans: plans.map((p) => ({
        tier_id: p.tier_id,
        tier_name: p.tier_name,
        name: p.name,
        display_name: p.display_name || p.name,
        price: p.price,
        currency: p.currency || 'USD',
        billing_cycle: p.billing_cycle,
        billing_cycles: p.billing_cycles,
        is_active: p.is_active,
        is_visible: p.is_visible,
        is_popular: p.is_popular,
        trial_days: p.trial_days,
        features: planMarketingBullets(p),
        limits: {
          products: p.limits?.products,
          storage: p.limits?.storage,
          api_calls_per_month: p.limits?.api_calls_per_month,
          analytics: p.limits?.analytics,
          support_level: p.limits?.support_level,
          custom_branding: p.limits?.custom_branding,
        },
      })),
    });
  } catch (e: any) {
    console.error('adminListSubscriptionPlans:', e);
    return res.status(500).json({ message: 'Failed to load plans' });
  }
}

export async function adminListSellerSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || '').trim();

    let filter: Record<string, unknown> = {};
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(esc, 'i');
      const users = await User.find({ $or: [{ email: regex }, { fullName: regex }] })
        .select('_id')
        .lean();
      const uids = users.map((u) => u._id);
      filter = { $or: [{ store_name: regex }, { user_id: { $in: uids } }] };
    }

    const total = await SellerSubscription.countDocuments(filter);
    const rows = await SellerSubscription.find(filter)
      .sort({ 'metadata.updated_at': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = rows.map((r) => r.user_id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select('email fullName role isSellerVerified')
      .lean();
    const umap = new Map(users.map((u) => [String(u._id), u]));

    const items = rows.map((r: any) => {
      const u = umap.get(String(r.user_id));
      return {
        id: String(r._id),
        userId: String(r.user_id),
        email: u?.email || '',
        fullName: u?.fullName || '',
        role: u?.role || '',
        store_name: r.store_name,
        tier_id: r.current_plan?.tier_id,
        tier_name: r.current_plan?.tier_name,
        plan_status: r.current_plan?.status,
        subscription_status: r.status,
        is_active: r.is_active,
        renewal_date: r.current_plan?.renewal_date,
        auto_renew: r.current_plan?.auto_renew,
        cancelled_at: r.current_plan?.cancelled_at,
        updated_at: r.metadata?.updated_at,
      };
    });

    return res.json({ items, total, page, limit });
  } catch (e: any) {
    console.error('adminListSellerSubscriptions:', e);
    return res.status(500).json({ message: 'Failed to list subscriptions' });
  }
}

export async function adminGetSellerSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId).select('email fullName role').lean();
    if (!user || user.role !== 'seller') {
      return res.status(404).json({ message: 'Seller user not found' });
    }

    const sub = await SellerSubscription.findOne({ user_id: new mongoose.Types.ObjectId(userId) })
      .lean();

    if (!sub) {
      return res.status(404).json({ message: 'No subscription record for this seller' });
    }

    return res.json({
      subscription: sub,
      user: { email: user.email, fullName: user.fullName, id: String(user._id) },
    });
  } catch (e: any) {
    console.error('adminGetSellerSubscription:', e);
    return res.status(500).json({ message: 'Failed to load subscription' });
  }
}

export async function adminAssignSellerTier(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const tierId = String((req.body as { tierId?: string }).tierId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (!tierId) {
      return res.status(400).json({ message: 'tierId is required' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'seller') {
      return res.status(404).json({ message: 'Seller user not found' });
    }

    const newPlan = await getPlanByTierId(tierId);
    if (!newPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    let subscription = await SellerSubscription.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
    });

    const now = new Date();
    const adminId = String(req.user!.id);

    if (!subscription) {
      return res.status(404).json({
        message:
          'No subscription document yet. Ask the seller to open Subscription once, or provision from support tools.',
      });
    }

    const oldTier = subscription.current_plan?.tier_id;
    if (oldTier === tierId) {
      return res.status(400).json({ message: 'Seller is already on this tier' });
    }

    const oldPlanId = subscription.current_plan?.plan_id;
    if (oldPlanId) {
      const hist = Array.isArray(subscription.subscription_history) ? subscription.subscription_history : [];
      hist.push({
        plan_id: oldPlanId,
        tier_id: subscription.current_plan?.tier_id,
        tier_name: subscription.current_plan?.tier_name,
        start_date: new Date(subscription.current_plan?.start_date || now),
        end_date: now,
        price: subscription.current_plan?.price || 0,
        billing_cycle: subscription.current_plan?.billing_cycle || 'monthly',
        reason: 'admin_tier_change',
        changed_at: now,
        changed_by: `admin:${adminId}`,
      });
      subscription.subscription_history = hist;
      subscription.markModified('subscription_history');
    }

    const newRenewal = calculateRenewalDate(now, newPlan.billing_cycle);
    const preserveAuto = subscription.current_plan?.auto_renew ?? true;

    subscription.current_plan = {
      ...subscription.current_plan,
      plan_id: newPlan.plan_id,
      tier_id: newPlan.tier_id,
      tier_name: newPlan.tier_name,
      name: newPlan.name,
      price: newPlan.price,
      currency: newPlan.currency,
      billing_cycle: newPlan.billing_cycle,
      status: 'active',
      start_date: now,
      renewal_date: newRenewal,
      auto_renew: preserveAuto,
      trial_days: newPlan.trial_days,
      trial_used: subscription.trial?.trial_used || false,
      effective_price: newPlan.price,
      cancelled_at: undefined,
      cancellation_reason: undefined,
    };
    subscription.markModified('current_plan');

    subscription.plan_features = planFeaturesFromPlan(newPlan);
    subscription.markModified('plan_features');

    subscription.is_active = true;
    subscription.status = 'active';

    subscription.metadata = {
      ...subscription.metadata,
      updated_at: now,
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');

    pushAudit(subscription, adminId, 'assign_tier', 'current_plan.tier_id', oldTier, tierId);

    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Your plan was updated',
      message: `An administrator changed your subscription to ${newPlan.tier_name} (${newPlan.name}). Renewal: ${subscription.current_plan?.renewal_date ? new Date(subscription.current_plan.renewal_date).toLocaleDateString() : '—'}.`,
    });
    return res.json({ message: 'Tier updated', subscriptionId: String(subscription._id) });
  } catch (e: any) {
    console.error('adminAssignSellerTier:', e);
    return res.status(500).json({ message: 'Failed to update tier' });
  }
}

export async function adminSetSellerSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    let action = String((req.body as { action?: string }).action || '').toLowerCase();
    if (action === 'pause') action = 'suspend';
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (action !== 'suspend' && action !== 'reactivate') {
      return res.status(400).json({ message: 'action must be suspend, pause, or reactivate' });
    }

    const subscription = await SellerSubscription.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
    });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const adminId = String(req.user!.id);
    const now = new Date();

    if (action === 'suspend') {
      pushAudit(subscription, adminId, 'suspend', 'is_active', subscription.is_active, false);
      subscription.is_active = false;
      subscription.current_plan = {
        ...subscription.current_plan,
        status: 'suspended',
        auto_renew: false,
      };
      subscription.markModified('current_plan');
      subscription.status = 'suspended';
    } else {
      pushAudit(subscription, adminId, 'reactivate', 'is_active', subscription.is_active, true);
      subscription.is_active = true;
      subscription.current_plan = {
        ...subscription.current_plan,
        status: 'active',
      };
      subscription.markModified('current_plan');
      subscription.status = 'active';
    }

    subscription.metadata = {
      ...subscription.metadata,
      updated_at: now,
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');

    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: action === 'suspend' ? 'Subscription paused' : 'Subscription reactivated',
      message:
        action === 'suspend'
          ? 'Your seller subscription was paused by an administrator. Auto-renew was turned off.'
          : 'Your seller subscription was reactivated by an administrator.',
    });
    return res.json({ message: action === 'suspend' ? 'Subscription suspended' : 'Subscription reactivated' });
  } catch (e: any) {
    console.error('adminSetSellerSubscriptionStatus:', e);
    return res.status(500).json({ message: 'Failed to update status' });
  }
}

export async function adminCancelSellerSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const reason = String((req.body as { reason?: string }).reason || 'Cancelled by admin').slice(0, 500);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const subscription = await SellerSubscription.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
    });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const adminId = String(req.user!.id);
    const now = new Date();

    subscription.current_plan = {
      ...subscription.current_plan,
      auto_renew: false,
      cancelled_at: now,
      cancellation_reason: reason,
      status: 'cancelled',
    };
    subscription.markModified('current_plan');
    subscription.is_active = false;
    subscription.status = 'cancelled';

    subscription.metadata = {
      ...subscription.metadata,
      updated_at: now,
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');

    pushAudit(subscription, adminId, 'cancel', 'current_plan.cancelled_at', null, now.toISOString());

    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Subscription cancelled',
      message: `Your subscription was cancelled by an administrator. Reason: ${reason}`,
    });
    return res.json({ message: 'Subscription cancelled' });
  } catch (e: any) {
    console.error('adminCancelSellerSubscription:', e);
    return res.status(500).json({ message: 'Failed to cancel' });
  }
}

export async function adminSetSellerAutoRenew(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const autoRenew = Boolean((req.body as { autoRenew?: boolean }).autoRenew);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const subscription = await SellerSubscription.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
    });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const adminId = String(req.user!.id);
    const prev = subscription.current_plan?.auto_renew;
    subscription.current_plan = {
      ...subscription.current_plan,
      auto_renew: autoRenew,
    };
    subscription.markModified('current_plan');
    subscription.metadata = {
      ...subscription.metadata,
      updated_at: new Date(),
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');
    pushAudit(subscription, adminId, 'auto_renew', 'current_plan.auto_renew', prev, autoRenew);

    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Auto-renew updated',
      message: `Auto-renew is now ${autoRenew ? 'on' : 'off'} for your subscription (set by an administrator).`,
    });
    return res.json({ message: 'Auto-renew updated', autoRenew });
  } catch (e: any) {
    console.error('adminSetSellerAutoRenew:', e);
    return res.status(500).json({ message: 'Failed to update auto-renew' });
  }
}

export async function adminExtendSellerRenewal(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const days = Math.min(366, Math.max(1, Number((req.body as { days?: number }).days) || 0));
    if (!days) return res.status(400).json({ message: 'days must be between 1 and 366' });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const subscription = await SellerSubscription.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    const adminId = String(req.user!.id);
    const base = subscription.current_plan?.renewal_date
      ? new Date(subscription.current_plan.renewal_date)
      : new Date();
    base.setDate(base.getDate() + days);
    const prev = subscription.current_plan?.renewal_date;
    subscription.current_plan = { ...subscription.current_plan, renewal_date: base };
    subscription.markModified('current_plan');
    pushAudit(subscription, adminId, 'extend_renewal', 'current_plan.renewal_date', prev, base.toISOString());
    subscription.metadata = {
      ...subscription.metadata,
      updated_at: new Date(),
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');
    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Billing date extended',
      message: `Your next renewal date was extended by ${days} day(s) by an administrator.`,
    });
    return res.json({ message: 'Renewal date extended', renewal_date: base.toISOString() });
  } catch (e: any) {
    console.error('adminExtendSellerRenewal:', e);
    return res.status(500).json({ message: 'Failed to extend renewal' });
  }
}

export async function adminExtendSellerTrial(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const days = Math.min(90, Math.max(1, Number((req.body as { days?: number }).days) || 0));
    if (!days) return res.status(400).json({ message: 'days must be between 1 and 90' });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const subscription = await SellerSubscription.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    const adminId = String(req.user!.id);
    const trial = subscription.trial || ({} as any);
    const end = trial.trial_end_date ? new Date(trial.trial_end_date) : new Date();
    end.setDate(end.getDate() + days);
    subscription.trial = {
      ...trial,
      is_trial: true,
      trial_end_date: end,
      trial_days: Math.max(Number(trial.trial_days) || 0, days),
    };
    subscription.markModified('trial');
    pushAudit(subscription, adminId, 'extend_trial', 'trial.trial_end_date', trial.trial_end_date, end.toISOString());
    subscription.metadata = {
      ...subscription.metadata,
      updated_at: new Date(),
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');
    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Trial extended',
      message: `Your trial was extended by ${days} day(s) by an administrator.`,
    });
    return res.json({ message: 'Trial extended', trial_end_date: end.toISOString() });
  } catch (e: any) {
    console.error('adminExtendSellerTrial:', e);
    return res.status(500).json({ message: 'Failed to extend trial' });
  }
}

export async function adminOverrideSellerLimits(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const body = req.body as {
      productLimit?: number | null;
      apiCallsPerMonth?: number | null;
      storageBytes?: number | null;
    };
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const subscription = await SellerSubscription.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    const adminId = String(req.user!.id);
    const prevOverrides = (subscription.metadata as { admin_limit_overrides?: Record<string, unknown> })
      ?.admin_limit_overrides || {};
    const admin_limit_overrides = { ...prevOverrides };
    if (body.productLimit !== undefined) admin_limit_overrides.product_limit = body.productLimit;
    if (body.apiCallsPerMonth !== undefined) admin_limit_overrides.api_calls_per_month = body.apiCallsPerMonth;
    if (body.storageBytes !== undefined) admin_limit_overrides.storage_bytes = body.storageBytes;
    subscription.metadata = {
      ...subscription.metadata,
      admin_limit_overrides,
      updated_at: new Date(),
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');
    pushAudit(subscription, adminId, 'override_limits', 'metadata.admin_limit_overrides', null, admin_limit_overrides);
    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Usage limits adjusted',
      message: 'An administrator updated override limits on your subscription. Check your seller dashboard for current caps.',
    });
    return res.json({ message: 'Limits updated', overrides: admin_limit_overrides });
  } catch (e: any) {
    console.error('adminOverrideSellerLimits:', e);
    return res.status(500).json({ message: 'Failed to update overrides' });
  }
}

export async function adminApplySellerCoupon(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const code = String((req.body as { code?: string }).code || '').trim().slice(0, 64);
    if (!code) return res.status(400).json({ message: 'code is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const subscription = await SellerSubscription.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    const adminId = String(req.user!.id);
    subscription.current_plan = {
      ...subscription.current_plan,
      discount_applied: { code, applied_by_admin: true, applied_at: new Date() } as any,
    };
    subscription.markModified('current_plan');
    pushAudit(subscription, adminId, 'coupon', 'current_plan.discount_applied', null, code);
    subscription.metadata = {
      ...subscription.metadata,
      updated_at: new Date(),
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');
    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Discount code applied',
      message: `Code "${code}" was applied to your subscription by an administrator.`,
    });
    return res.json({ message: 'Coupon recorded on subscription', code });
  } catch (e: any) {
    console.error('adminApplySellerCoupon:', e);
    return res.status(500).json({ message: 'Failed to apply coupon' });
  }
}

export async function adminRetrySellerPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const subscription = await SellerSubscription.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
    const adminId = String(req.user!.id);
    pushAudit(subscription, adminId, 'retry_payment', 'payment', null, 'admin_retry_requested');
    subscription.metadata = {
      ...subscription.metadata,
      updated_at: new Date(),
      last_modified_by: `admin:${adminId}`,
    };
    subscription.markModified('metadata');
    await subscription.save();
    await notifySellerAndAdmins({
      sellerUserId: userId,
      adminId,
      title: 'Payment retry requested',
      message: 'An administrator queued a payment retry for your subscription. If charges fail again, you will be notified.',
    });
    return res.json({ message: 'Retry recorded (gateway integration can hook this event)', simulated: true });
  } catch (e: any) {
    console.error('adminRetrySellerPayment:', e);
    return res.status(500).json({ message: 'Failed to record retry' });
  }
}
