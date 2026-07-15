import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  Download,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { subscriptionApi } from '@/services/subscriptionApi';
import { useToastStore } from '@/stores/toastStore';
import { useSystemFeatures } from '@/hooks/useSystemFeatures';
import BoostAnalyticsMiniPanel from '@/components/seller/BoostAnalyticsMiniPanel';
import SubscriptionPaymentFlow from '@/components/seller/SubscriptionPaymentFlow';
import '@/styles/seller-subscription.css';

type TabId = 'plan' | 'billing' | 'payment';
type Cycle = 'monthly' | 'annual';

interface ApiPlan {
  id: string;
  tierId?: string;
  name: string;
  displayName?: string;
  price: number;
  billingCycles?: { monthly: number; annual: number };
  currency?: string;
  features?: string[];
  marketingFeatures?: string[];
  popular?: boolean;
  current?: boolean;
  limits?: {
    products?: string;
    productBoost?: { enabled: boolean; monthlyLimit: number | null; unlimited: boolean };
  };
}

interface ApiInvoice {
  id: string;
  invoiceNumber?: string;
  date?: string;
  amount: number;
  currency?: string;
  status: 'paid' | 'pending' | 'failed';
  plan?: string;
}

const SubscriptionTiers: React.FC = () => {
  const { showToast } = useToastStore();
  const { isEnabled, loading: featuresLoading } = useSystemFeatures();
  const subscriptionsOn = featuresLoading || isEnabled('seller_subscriptions');
  const [activeTab, setActiveTab] = useState<TabId>('plan');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedUpgradePaymentMethodId, setSelectedUpgradePaymentMethodId] = useState('');
  const [upgradingPlanKey, setUpgradingPlanKey] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'visa' | 'mtn' | 'airtel' | 'paypal'>('visa');
  const [billingStatusFilter, setBillingStatusFilter] = useState('');
  const [billingSort, setBillingSort] = useState<'newest' | 'oldest'>('newest');
  const [cardData, setCardData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    phoneNumber: '',
    accountName: '',
    paypalEmail: '',
  });

  const fetchPlansAndSubscription = async () => {
    try {
      setLoadingPlans(true);
      setLoadingSubscription(true);
      const [plansRes, subRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrentSubscription().catch(() => ({ subscription: null })),
      ]);
      setPlans(plansRes.plans || []);
      setCurrentSubscription(subRes.subscription || null);
      const pmRes = await subscriptionApi.getPaymentMethods().catch(() => ({ paymentMethods: [] as any[] }));
      const list = pmRes.paymentMethods || [];
      setPaymentMethods(list);
      const defaultPm = list.find((m: any) => m?.isDefault) || list[0];
      setSelectedUpgradePaymentMethodId(defaultPm?.id || '');
    } catch (error: any) {
      showToast(error.message || 'Failed to load subscription data', 'error');
    } finally {
      setLoadingPlans(false);
      setLoadingSubscription(false);
    }
  };

  useEffect(() => {
    fetchPlansAndSubscription();
  }, []);

  useEffect(() => {
    if (activeTab !== 'billing') return;
    const fetchInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const response = await subscriptionApi.getBillingHistory({
          status: billingStatusFilter || undefined,
        });
        setInvoices(response.invoices || []);
      } catch (error: any) {
        showToast(error.message || 'Failed to load billing history', 'error');
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchInvoices();
  }, [activeTab, billingStatusFilter, showToast]);

  useEffect(() => {
    if (activeTab !== 'payment') return;
    const fetchMethods = async () => {
      try {
        setLoadingPaymentMethods(true);
        const response = await subscriptionApi.getPaymentMethods();
        setPaymentMethods(response.paymentMethods || []);
      } catch (error: any) {
        showToast(error.message || 'Failed to load payment methods', 'error');
      } finally {
        setLoadingPaymentMethods(false);
      }
    };
    fetchMethods();
  }, [activeTab, showToast]);

  const currentTierId =
    currentSubscription?.tierId ||
    plans.find((p) => p.current)?.id ||
    plans.find((p) => p.current)?.tierId ||
    '';

  const currentPlan = plans.find((p) => p.id === currentTierId || p.tierId === currentTierId);

  const boostLimit = currentSubscription?.limits?.productBoost?.unlimited
    ? Number.POSITIVE_INFINITY
    : currentSubscription?.limits?.productBoost?.monthlyLimit ??
      currentSubscription?.entitlements?.productBoostMonthlyLimit ??
      currentPlan?.limits?.productBoost?.monthlyLimit ??
      0;

  const boostUsed = Number(
    currentSubscription?.boostUsage?.used ?? 0,
  );
  const boostLimitDisplay = Number.isFinite(boostLimit) ? boostLimit : Math.max(boostUsed, 1);
  const boostPercent = Math.max(
    0,
    Math.min(100, Math.round((boostUsed / boostLimitDisplay) * 100))
  );

  const renewalDate =
    currentSubscription?.nextBillingDate || currentSubscription?.renewalDate
      ? new Date(
          currentSubscription?.nextBillingDate || currentSubscription?.renewalDate
        ).toLocaleDateString()
      : 'N/A';
  const currentPrice = Number(
    cycle === 'monthly'
      ? currentSubscription?.price ?? currentPlan?.billingCycles?.monthly ?? currentPlan?.price ?? 0
      : currentPlan?.billingCycles?.annual ?? currentSubscription?.price ?? 0,
  );

  const visibleInvoices = useMemo(() => {
    const list = [...invoices];
    list.sort((a, b) => {
      const ta = new Date(a.date || '').getTime();
      const tb = new Date(b.date || '').getTime();
      return billingSort === 'newest' ? tb - ta : ta - tb;
    });
    return list;
  }, [invoices, billingSort]);

  const handleUpgrade = async (tierId: string, planName: string, planPrice: number) => {
    if (!subscriptionsOn) {
      showToast('New subscription purchases are temporarily disabled by the platform.', 'error');
      return;
    }
    if (planPrice <= 0 && currentTierId === tierId) {
      showToast('You are already on this plan.', 'info');
      return;
    }
    if (!tierId) {
      showToast('Plan is not available right now. Please refresh and try again.', 'error');
      return;
    }
    try {
      setUpgradingPlanKey(tierId);
      let methodId = selectedUpgradePaymentMethodId;
      if (!methodId && paymentMethods.length > 0) {
        methodId = paymentMethods.find((m: any) => m?.isDefault)?.id || paymentMethods[0]?.id || '';
      }
      const result = await subscriptionApi.upgradeSubscription(tierId, methodId || undefined, cycle);
      if (!result.success) {
        if (result.error?.requiresPaymentMethod) {
          showToast('Add a payment method first to upgrade to a paid plan.', 'info');
          setActiveTab('payment');
          setShowAddCard(true);
          return;
        }
        showToast(result.error?.message || 'Failed to upgrade', 'error');
        return;
      }
      showToast(`Successfully upgraded to ${planName}.`, 'success');
      await fetchPlansAndSubscription();
    } catch (error: any) {
      showToast(error.message || 'Failed to upgrade subscription', 'error');
    } finally {
      setUpgradingPlanKey(null);
    }
  };

  const handleAddCard = async () => {
    if (newMethodType === 'visa') {
      if (
        !cardData.cardholderName ||
        !cardData.cardNumber ||
        !cardData.expiryMonth ||
        !cardData.expiryYear ||
        !cardData.cvv
      ) {
        showToast('Fill in all card fields.', 'error');
        return;
      }
    } else if (newMethodType === 'paypal') {
      if (!cardData.paypalEmail || !cardData.paypalEmail.includes('@')) {
        showToast('Enter a valid PayPal email.', 'error');
        return;
      }
    } else {
      if (!cardData.phoneNumber || !cardData.accountName) {
        showToast('Enter mobile money number and account name.', 'error');
        return;
      }
    }
    try {
      setAddingCard(true);
      if (newMethodType === 'visa') {
        await subscriptionApi.addPaymentMethod({
          type: 'visa',
          cardholderName: cardData.cardholderName,
          cardNumber: cardData.cardNumber,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          cvv: cardData.cvv,
        });
      } else if (newMethodType === 'paypal') {
        await subscriptionApi.addPaymentMethod({
          type: 'paypal',
          paypalEmail: cardData.paypalEmail,
        });
      } else {
        await subscriptionApi.addPaymentMethod({
          type: newMethodType,
          phoneNumber: cardData.phoneNumber,
          accountName: cardData.accountName,
          provider: newMethodType === 'mtn' ? 'mtn' : 'airtel',
        });
      }
      showToast('Payment method added successfully.', 'success');
      setShowAddCard(false);
      setCardData({
        cardholderName: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        phoneNumber: '',
        accountName: '',
        paypalEmail: '',
      });
      const response = await subscriptionApi.getPaymentMethods();
      setPaymentMethods(response.paymentMethods || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to add payment method', 'error');
    } finally {
      setAddingCard(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    const password = window.prompt('Enter your password to remove this payment method:');
    if (!password) return;
    const result = await subscriptionApi.deletePaymentMethod(id, password);
    if (!result.success) {
      showToast(result.error?.message || 'Failed to remove payment method', 'error');
      return;
    }
    showToast('Payment method removed.', 'success');
    const response = await subscriptionApi.getPaymentMethods();
    setPaymentMethods(response.paymentMethods || []);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await subscriptionApi.setDefaultPaymentMethod(id);
      showToast('Default payment method updated.', 'success');
      const response = await subscriptionApi.getPaymentMethods();
      setPaymentMethods(response.paymentMethods || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to set default method', 'error');
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await subscriptionApi.downloadInvoice(invoiceId);
      if (response?.invoiceUrl) {
        window.open(response.invoiceUrl, '_blank');
        return;
      }
      const text = response?.receipt || `Invoice ${invoiceNumber}`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Invoice downloaded.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to download invoice', 'error');
    }
  };

  return (
    <div className="slx-sub-root space-y-6">
      <div className="slx-sub-header">
        <h1 className="slx-sub-title flex items-center gap-2">
          <Crown className="w-8 h-8 text-red-500" />
          Subscription & Billing
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
          Plans, invoices, and payment methods are managed by Spacilly. Contact support if you need help with billing.
        </p>
        {!subscriptionsOn && (
          <p className="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-300 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 max-w-2xl">
            New plan purchases are paused platform-wide. Your current plan stays active until it expires.
          </p>
        )}
      </div>

      <SubscriptionPaymentFlow activeStep={activeTab === 'payment' ? 2 : activeTab === 'billing' ? 4 : 1} />

      <div className="slx-sub-tabs">
        {[
          { id: 'plan', label: 'Current Plan' },
          { id: 'billing', label: 'Billing History' },
          { id: 'payment', label: 'Payment Methods' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`slx-sub-tab${activeTab === tab.id ? ' is-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'plan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Active Plan
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {currentPlan?.displayName || currentPlan?.name || currentSubscription?.name || '—'}
              </p>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>Renewal date: {renewalDate}</p>
                <p>Monthly price: ${currentPrice.toFixed(2)}</p>
                <p>
                  Boost usage: {boostUsed} /{' '}
                  {Number.isFinite(boostLimit) ? boostLimit : 'Unlimited'} products boosted
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-[var(--brand-primary)]" style={{ width: `${boostPercent}%` }} />
              </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Choose billing cycle</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Annual billing saves 20%</p>
                </div>
                <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-700 p-1">
                  <button
                    onClick={() => setCycle('monthly')}
                    className={`px-3 py-1.5 rounded-full text-sm ${cycle === 'monthly' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setCycle('annual')}
                    className={`px-3 py-1.5 rounded-full text-sm ${cycle === 'annual' ? 'bg-gradient-to-r from-red-500 to-[var(--brand-primary)] text-white' : 'text-gray-600 dark:text-gray-400'}`}
                  >
                    Annual (Save 20%)
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment method for upgrade</p>
                <select
                  value={selectedUpgradePaymentMethodId}
                  onChange={(e) => setSelectedUpgradePaymentMethodId(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {paymentMethods.length === 0 ? (
                    <option value="">No payment method available</option>
                  ) : (
                    paymentMethods.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {(m.brand || m.type || 'method').toUpperCase()} •••• {m.last4 || '----'} {m.isDefault ? '(default)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          <BoostAnalyticsMiniPanel
            boostUsed={boostUsed}
            boostLimit={boostLimitDisplay}
            planKey={currentTierId || 'default'}
          />

          {(loadingPlans || loadingSubscription) ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const tierId = plan.id || plan.tierId || '';
                const isCurrent = plan.current || tierId === currentTierId;
                const isPopular = Boolean(plan.popular);
                const price =
                  cycle === 'monthly'
                    ? Number(plan.billingCycles?.monthly ?? plan.price ?? 0)
                    : Number(plan.billingCycles?.annual ?? plan.price ?? 0);
                const featureList = plan.marketingFeatures?.length
                  ? plan.marketingFeatures
                  : plan.features || [];
                return (
                  <div
                    key={tierId}
                    className={`rounded-2xl border p-5 bg-white dark:bg-gray-900 ${
                      isPopular
                        ? 'border-red-400 dark:border-red-500 shadow-lg shadow-red-500/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {plan.displayName || plan.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Current Plan
                        </span>
                      )}
                    </div>
                    {isPopular && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-[var(--brand-primary)] px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Sparkles className="w-3 h-3" />
                        Most Popular
                      </div>
                    )}
                    <div className="mt-3">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${price.toFixed(2)}
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          /{cycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </p>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      {featureList.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() =>
                        handleUpgrade(tierId, plan.displayName || plan.name, price)
                      }
                      disabled={!subscriptionsOn || isCurrent || upgradingPlanKey === tierId}
                      className={`mt-5 w-full ${
                        isCurrent
                          ? 'bg-gray-600 hover:bg-gray-600'
                          : 'bg-gradient-to-r from-red-500 to-[var(--brand-primary)] hover:from-red-600 hover:to-[var(--brand-primary-hover)]'
                      }`}
                    >
                      {upgradingPlanKey === tierId ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing
                        </>
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : price === 0 ? (
                        'Get Started'
                      ) : (
                        <>
                          Upgrade
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">How Product Boosting Works</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                ['1', 'Select products', 'Pick which listings to boost from inventory.'],
                ['2', 'Rise to the top', 'Boosted products appear first on search and category pages.'],
                ['3', 'Sell faster', 'More visibility drives more clicks and faster conversions.'],
              ].map(([n, title, text]) => (
                <div key={title} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 text-xs font-bold">
                    {n}
                  </span>
                  <p className="mt-2 font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Billing log</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Every subscription charge is recorded as an invoice below. Paid rows match your default payment method and admin gateway config.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={billingStatusFilter}
                  onChange={(e) => setBillingStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">All status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  value={billingSort}
                  onChange={(e) => setBillingSort(e.target.value as 'newest' | 'oldest')}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
          </div>

          {loadingInvoices ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            </div>
          ) : visibleInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">No billing history yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Invoices will appear here after your first billing event.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Invoice</th>
                      <th className="text-left px-4 py-3">Plan</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {visibleInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inv.date || '—'}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{inv.invoiceNumber || inv.id}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inv.plan || 'Subscription'}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{inv.currency || 'USD'} {Number(inv.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            inv.status === 'paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : inv.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-300 dark:border-gray-700"
                            onClick={() => handleDownloadInvoice(inv.id, inv.invoiceNumber || inv.id)}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Invoice
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {visibleInvoices.map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{inv.invoiceNumber || inv.id}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{inv.date || '—'} • {inv.plan || 'Subscription'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        inv.status === 'paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : inv.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      {inv.currency || 'USD'} {Number(inv.amount || 0).toFixed(2)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-gray-300 dark:border-gray-700"
                      onClick={() => handleDownloadInvoice(inv.id, inv.invoiceNumber || inv.id)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download Invoice
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage default card and billing sources.</p>
            </div>
            <Button
              className="bg-gradient-to-r from-red-500 to-[var(--brand-primary)] hover:from-red-600 hover:to-[var(--brand-primary-hover)]"
              onClick={() => setShowAddCard(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Payment Method
            </Button>
          </div>

          {loadingPaymentMethods ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
              <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">No payment methods</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a card to enable paid plans and uninterrupted billing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`rounded-xl border p-4 bg-white dark:bg-gray-900 ${
                    method.isDefault ? 'border-green-400 dark:border-green-600' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {(method.brand || 'Card').toUpperCase()} •••• {method.last4 || '0000'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Expires {method.expiry || 'MM/YY'}
                        </p>
                      </div>
                      {method.isDefault && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 dark:border-gray-700"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteCard(method.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              value={newMethodType}
              onChange={(e) => setNewMethodType(e.target.value as 'visa' | 'mtn' | 'airtel' | 'paypal')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="visa">Card (Stripe)</option>
              <option value="mtn">MTN MoMo</option>
              <option value="airtel">Airtel Money</option>
              <option value="paypal">PayPal</option>
            </select>
            {newMethodType === 'visa' ? (
              <>
                <input
              value={cardData.cardholderName}
              onChange={(e) => setCardData((p) => ({ ...p, cardholderName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Cardholder Name"
            />
            <input
              value={cardData.cardNumber}
              onChange={(e) => setCardData((p) => ({ ...p, cardNumber: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              placeholder="Card Number"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                value={cardData.expiryMonth}
                onChange={(e) => setCardData((p) => ({ ...p, expiryMonth: e.target.value }))}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="MM"
              />
              <input
                value={cardData.expiryYear}
                onChange={(e) => setCardData((p) => ({ ...p, expiryYear: e.target.value }))}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="YY"
              />
              <input
                value={cardData.cvv}
                onChange={(e) => setCardData((p) => ({ ...p, cvv: e.target.value }))}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="CVV"
              />
            </div>
              </>
            ) : newMethodType === 'paypal' ? (
              <input
                value={cardData.paypalEmail}
                onChange={(e) => setCardData((p) => ({ ...p, paypalEmail: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="PayPal Email"
              />
            ) : (
              <>
                <input
                  value={cardData.phoneNumber}
                  onChange={(e) => setCardData((p) => ({ ...p, phoneNumber: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Mobile Money Number"
                />
                <input
                  value={cardData.accountName}
                  onChange={(e) => setCardData((p) => ({ ...p, accountName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Account Holder Name"
                />
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddCard(false)}>Cancel</Button>
              <Button
                className="bg-gradient-to-r from-red-500 to-[var(--brand-primary)] hover:from-red-600 hover:to-[var(--brand-primary-hover)]"
                onClick={handleAddCard}
                disabled={addingCard}
              >
                {addingCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Card
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionTiers;
