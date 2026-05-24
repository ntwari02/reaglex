import React, { useCallback, useEffect, useState } from 'react';
import { Layers, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminSellerSubscriptionsApi } from '@/services/adminSellerSubscriptionsApi';
import { useToastStore } from '@/stores/toastStore';
import '@/styles/admin-subscription.css';

type PlanRow = Record<string, any>;

const emptyDraft = (): PlanRow => ({
  tier_name: '',
  name: '',
  price: 0,
  currency: 'USD',
  billing_cycles: { monthly: 0, annual: 0 },
  is_active: true,
  is_visible: true,
  is_popular: false,
  sort_order: 0,
  features: [],
  limits: {
    products: { limit: 50, display: '50', is_unlimited: false },
    product_boost: { enabled: false, monthly_limit: 0, is_unlimited: false },
    analytics: { enabled: false, level: 'basic' },
    api_calls_per_month: 0,
    support_level: 'email',
    custom_branding: false,
    white_label: false,
  },
  discount_rules: [],
});

export default function SubscriptionPlanCatalog() {
  const showToast = useToastStore((s) => s.showToast);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanRow>(emptyDraft());
  const [featuresText, setFeaturesText] = useState('');
  const [promoPercent, setPromoPercent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSellerSubscriptionsApi.listPlanCatalog();
      setPlans(res.plans as PlanRow[]);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPlan = (p: PlanRow) => {
    setSelectedTier(String(p.tier_id));
    setDraft({ ...p });
    setFeaturesText((p.features || []).join('\n'));
    const firstPromo = (p.discount_rules || [])[0];
    setPromoPercent(firstPromo?.value != null ? String(firstPromo.value) : '');
  };

  const startNew = () => {
    setSelectedTier(null);
    setDraft(emptyDraft());
    setFeaturesText('');
    setPromoPercent('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const features = featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const body = {
        ...draft,
        features,
        billing_cycles: {
          monthly: Number(draft.billing_cycles?.monthly ?? draft.price ?? 0),
          annual: Number(draft.billing_cycles?.annual ?? 0),
        },
        discount_rules:
          promoPercent && Number(promoPercent) > 0
            ? [
                {
                  discount_id: `promo_${Date.now()}`,
                  type: 'percent',
                  value: Number(promoPercent),
                  applies_to: 'all',
                  min_commitment_months: 0,
                  valid_from: new Date().toISOString(),
                  valid_until: null,
                },
              ]
            : draft.discount_rules || [],
      };

      if (selectedTier) {
        await adminSellerSubscriptionsApi.updatePlan(selectedTier, body);
        showToast('Plan updated', 'success');
      } else {
        if (!body.tier_name?.trim()) {
          showToast('Tier name is required', 'error');
          return;
        }
        await adminSellerSubscriptionsApi.createPlan(body);
        showToast('Plan created', 'success');
      }
      await load();
      startNew();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tierId: string) => {
    if (!window.confirm('Deactivate this plan? Sellers on it keep access until changed.')) return;
    try {
      await adminSellerSubscriptionsApi.deletePlan(tierId, false);
      showToast('Plan deactivated', 'success');
      if (selectedTier === tierId) startNew();
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  return (
    <div className="adm-sub-panel grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-600" />
            Plan catalog
          </h2>
          <Button size="sm" variant="outline" onClick={startNew}>
            <Plus className="h-4 w-4 mr-1" />
            New plan
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
          </div>
        ) : (
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={String(p.tier_id)}>
                <button
                  type="button"
                  onClick={() => selectPlan(p)}
                  className={`adm-sub-plan-card w-full text-left ${selectedTier === p.tier_id ? 'is-selected' : ''}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{p.tier_name}</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      ${Number(p.billing_cycles?.monthly ?? p.price ?? 0).toFixed(2)}/mo
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.is_active ? 'Active' : 'Inactive'} · {p.is_visible ? 'Visible' : 'Hidden'}
                    {p.is_popular ? ' · Popular' : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {selectedTier ? `Edit ${draft.tier_name}` : 'Create plan'}
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="adm-sub-field">
            <span>Tier name</span>
            <input
              value={draft.tier_name || ''}
              onChange={(e) => setDraft({ ...draft, tier_name: e.target.value })}
              disabled={Boolean(selectedTier)}
            />
          </label>
          <label className="adm-sub-field">
            <span>Display name</span>
            <input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="adm-sub-field">
            <span>Monthly price (USD)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.billing_cycles?.monthly ?? draft.price ?? 0}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  price: Number(e.target.value),
                  billing_cycles: {
                    ...draft.billing_cycles,
                    monthly: Number(e.target.value),
                    annual: Number(draft.billing_cycles?.annual ?? Number(e.target.value) * 0.8 * 12),
                  },
                })
              }
            />
          </label>
          <label className="adm-sub-field">
            <span>Annual price (USD)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.billing_cycles?.annual ?? 0}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  billing_cycles: { ...draft.billing_cycles, annual: Number(e.target.value) },
                })
              }
            />
          </label>
          <label className="adm-sub-field">
            <span>Product limit</span>
            <input
              type="number"
              min={0}
              value={draft.limits?.products?.limit ?? 50}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  limits: {
                    ...draft.limits,
                    products: {
                      ...draft.limits?.products,
                      limit: Number(e.target.value),
                      display: String(e.target.value),
                      is_unlimited: false,
                    },
                  },
                })
              }
            />
          </label>
          <label className="adm-sub-field">
            <span>Boosts / month</span>
            <input
              type="number"
              min={0}
              value={draft.limits?.product_boost?.monthly_limit ?? 0}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  limits: {
                    ...draft.limits,
                    product_boost: {
                      enabled: Number(e.target.value) > 0,
                      monthly_limit: Number(e.target.value),
                      is_unlimited: false,
                    },
                  },
                })
              }
            />
          </label>
          <label className="adm-sub-field sm:col-span-2">
            <span>Promotion (% off all cycles)</span>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 20 for 20% off"
              value={promoPercent}
              onChange={(e) => setPromoPercent(e.target.value)}
            />
          </label>
        </div>

        <label className="adm-sub-field">
          <span>Features (one per line)</span>
          <textarea
            rows={6}
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
            className="font-mono text-xs"
          />
        </label>

        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ['is_active', 'Active'],
            ['is_visible', 'Visible to sellers'],
            ['is_popular', 'Mark popular'],
            ['limits.analytics.enabled', 'Analytics'],
            ['limits.custom_branding', 'Custom branding'],
            ['limits.product_boost.enabled', 'Product boost'],
          ].map(([key, label]) => {
            const checked =
              key === 'limits.analytics.enabled'
                ? Boolean(draft.limits?.analytics?.enabled)
                : key === 'limits.custom_branding'
                  ? Boolean(draft.limits?.custom_branding)
                  : key === 'limits.product_boost.enabled'
                    ? Boolean(draft.limits?.product_boost?.enabled)
                    : Boolean((draft as any)[key]);
            return (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (key.startsWith('limits.')) {
                      const next = { ...draft.limits };
                      if (key === 'limits.analytics.enabled') {
                        next.analytics = { ...next.analytics, enabled: e.target.checked };
                      } else if (key === 'limits.custom_branding') {
                        next.custom_branding = e.target.checked;
                      } else if (key === 'limits.product_boost.enabled') {
                        next.product_boost = {
                          ...next.product_boost,
                          enabled: e.target.checked,
                          monthly_limit: next.product_boost?.monthly_limit ?? 10,
                        };
                      }
                      setDraft({ ...draft, limits: next });
                    } else {
                      setDraft({ ...draft, [key]: e.target.checked });
                    }
                  }}
                />
                {label}
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save plan
          </Button>
          {selectedTier && (
            <Button variant="outline" onClick={() => remove(selectedTier)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
