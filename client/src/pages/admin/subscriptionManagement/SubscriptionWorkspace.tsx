import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ban,
  BarChart3,
  Bell,
  CheckCircle,
  CreditCard,
  Crown,
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  ToggleLeft,
  ToggleRight,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ComparePlan } from './PlanCompareModal';

export type ListRow = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  store_name: string;
  tier_id?: string;
  tier_name?: string;
  plan_status?: string;
  is_active: boolean;
  renewal_date?: string;
  auto_renew?: boolean;
};

type Props = {
  row: ListRow;
  detail: { subscription: Record<string, unknown>; user: { id: string; email: string; fullName: string } } | null;
  detailLoading: boolean;
  plans: ComparePlan[];
  busy: boolean;
  onRefreshDetail: () => void;
  onAssignTier: (tierId: string) => Promise<void>;
  onSetStatus: (action: 'suspend' | 'reactivate' | 'pause') => Promise<void>;
  onSetAutoRenew: (v: boolean) => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
  onExtendRenewal: (days: number) => Promise<void>;
  onExtendTrial: (days: number) => Promise<void>;
  onOverrideLimits: (body: {
    productLimit?: number | null;
    apiCallsPerMonth?: number | null;
    storageBytes?: number | null;
  }) => Promise<void>;
  onApplyCoupon: (code: string) => Promise<void>;
  onRetryPayment: () => Promise<void>;
  onOpenCompare: () => void;
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'team', label: 'Seats', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'actions', label: 'Actions', icon: RefreshCw },
  { id: 'super', label: 'Super admin', icon: Crown },
] as const;

type TabId = (typeof tabs)[number]['id'];

function pseudoUsage(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) >>> 0;
  return {
    apiPct: 35 + (h % 55),
    storagePct: 28 + ((h >> 3) % 52),
    projects: 1 + (h % 4),
  };
}

function ProgressBar({ label, pct, danger }: { label: string; pct: number; danger?: boolean }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span>{Math.round(w)}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${danger || w >= 90 ? 'bg-red-500' : w >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renewalCountdown(renewal?: string) {
  if (!renewal) return '—';
  const t = new Date(renewal).getTime() - Date.now();
  if (t <= 0) return 'Past due';
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  return `${d}d ${h}h`;
}

export default function SubscriptionWorkspace({
  row,
  detail,
  detailLoading,
  plans,
  busy,
  onRefreshDetail,
  onAssignTier,
  onSetStatus,
  onSetAutoRenew,
  onCancel,
  onExtendRenewal,
  onExtendTrial,
  onOverrideLimits,
  onApplyCoupon,
  onRetryPayment,
  onOpenCompare,
}: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const [tierPick, setTierPick] = useState(row.tier_id || '');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [extendDays, setExtendDays] = useState(30);
  const [trialDays, setTrialDays] = useState(14);
  const [coupon, setCoupon] = useState('');
  const [ovProd, setOvProd] = useState('');
  const [ovApi, setOvApi] = useState('');
  const [ovStorage, setOvStorage] = useState('');

  useEffect(() => {
    setTierPick(row.tier_id || '');
  }, [row.tier_id, row.userId]);

  const sub = detail?.subscription as Record<string, any> | undefined;
  const cp = sub?.current_plan as Record<string, any> | undefined;
  const pf = sub?.plan_features as Record<string, any> | undefined;
  const meta = sub?.metadata as Record<string, any> | undefined;
  const risk = sub?.risk_and_defense as Record<string, any> | undefined;
  const trial = sub?.trial as Record<string, any> | undefined;
  const billingHistory = (sub?.billing_history as any[]) || [];
  const paymentMethods = (sub?.payment_methods as any[]) || [];
  const financialEvents = (sub?.financial_events as any[]) || [];
  const auditLogs = (sub?.audit_logs as any[]) || [];

  const usage = useMemo(() => pseudoUsage(row.userId), [row.userId]);
  const isEnterprise = String(cp?.tier_name || row.tier_name || '')
    .toLowerCase()
    .includes('enterprise');
  const seatsAllowed = isEnterprise ? 5 : 1;
  const autoRenew = cp?.auto_renew !== false;

  const lastPay = financialEvents[0];
  const statusLine = cp?.status || row.plan_status || (row.is_active ? 'active' : 'inactive');

  if (detailLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-2/3" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800/80 rounded-xl" />
        <div className="h-24 bg-gray-100 dark:bg-gray-800/80 rounded-xl" />
      </div>
    );
  }

  if (!detail || !sub) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500">
        Could not load subscription detail.
        <Button className="mt-4" variant="outline" size="sm" onClick={onRefreshDetail}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{row.store_name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {row.fullName} · {row.email}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefreshDetail} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Alerts */}
      <div className="grid gap-2 sm:grid-cols-2">
        {(risk?.failed_payments_last_30_days > 0 || lastPay?.status === 'failed') && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-sm text-red-800 dark:text-red-200 flex gap-2 items-start">
            <Bell className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Payment failure or risk flag on file — review billing and retry if needed.</span>
          </div>
        )}
        {usage.apiPct >= 85 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/25 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 flex gap-2">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            API usage trending high (illustrative until live metrics are wired).
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-emerald-500 text-white shadow'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Subscription overview</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Plan</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">{cp?.name || cp?.tier_name || row.tier_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="font-semibold capitalize">{statusLine}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Billing</dt>
                <dd className="font-semibold capitalize">{cp?.billing_cycle || 'monthly'}</dd>
              </div>
              {trial?.is_trial && (
                <div className="col-span-2">
                  <dt className="text-gray-500 dark:text-gray-400">Trial ends</dt>
                  <dd className="font-semibold">{fmtDate(trial?.trial_end_date)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Next renewal</dt>
                <dd className="font-semibold">{fmtDate(cp?.renewal_date)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500 dark:text-gray-400">Countdown</dt>
                <dd className="font-mono text-emerald-600 dark:text-emerald-400">{renewalCountdown(cp?.renewal_date)}</dd>
              </div>
            </dl>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Auto-renew</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSetAutoRenew(!autoRenew)}
                className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
              >
                {autoRenew ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                {autoRenew ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Plan & features</h3>
              <Button size="sm" variant="secondary" onClick={onOpenCompare}>
                Compare plans
              </Button>
            </div>
            <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
              <li>Products: {pf?.product_limit ?? '—'}</li>
              <li>Storage: {pf?.storage_limit ?? '—'}</li>
              <li>Analytics: {pf?.analytics_enabled ? 'Yes' : 'No'}</li>
              <li>API: {pf?.api_access ? 'Included' : '—'}</li>
              <li>Priority support: {pf?.priority_support ? 'Yes' : 'Standard'}</li>
              <li>Custom branding: {pf?.custom_branding ? 'Yes' : 'No'}</li>
            </ul>
            <div className="space-y-3 pt-2">
              <ProgressBar label="API (illustrative)" pct={usage.apiPct} danger={usage.apiPct >= 90} />
              <ProgressBar label="Storage (illustrative)" pct={usage.storagePct} danger={usage.storagePct >= 90} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Change tier</label>
              <select
                className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={tierPick}
                onChange={(e) => setTierPick(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.tier_id} value={p.tier_id}>
                    {p.tier_name} — {p.price === 0 ? 'Free' : `${p.price} ${p.currency || 'USD'}/mo`}
                  </option>
                ))}
              </select>
              <Button
                className="mt-2 w-full"
                disabled={busy || !tierPick || tierPick === cp?.tier_id}
                onClick={() => onAssignTier(tierPick)}
              >
                Upgrade / change plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Payment methods</h3>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-gray-500">No saved methods on file.</p>
            ) : (
              <ul className="space-y-2">
                {paymentMethods.map((pm: any) => (
                  <li
                    key={pm.payment_method_id || pm.last4}
                    className="flex justify-between rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 text-sm"
                  >
                    <span>
                      {pm.brand} ·••• {pm.last4}
                      {pm.is_default ? <span className="ml-2 text-emerald-600 text-xs">Default</span> : null}
                    </span>
                    <span className="text-gray-500">{pm.type}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500 mt-3">Add/remove flows use the seller billing portal in production.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Last payment</h3>
            {lastPay ? (
              <p className="text-sm">
                <span className="capitalize font-medium">{lastPay.status}</span> — {lastPay.description || lastPay.type} —{' '}
                {fmtDate(lastPay.created_at || lastPay.processed_at)}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No recent events.</p>
            )}
            <Button className="mt-3" variant="outline" size="sm" disabled={busy} onClick={() => onRetryPayment()}>
              Retry failed payment (ops)
            </Button>
          </div>
        </div>
      )}

      {tab === 'usage' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Usage analytics</h3>
          <p className="text-xs text-gray-500">
            Charts blend stored limits with illustrative usage until your metrics pipeline feeds this view.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {['Jan', 'Feb', 'Mar'].map((m, i) => (
              <div key={m} className="rounded-xl bg-gradient-to-t from-emerald-500/20 to-transparent border border-emerald-500/20 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{40 + i * 12 + (usage.apiPct % 20)}%</div>
                <div className="text-xs text-gray-500">{m} API load</div>
              </div>
            ))}
          </div>
          <ProgressBar label="Peak API (30d est.)" pct={usage.apiPct} />
          <ProgressBar label="Storage" pct={usage.storagePct} />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Active projects (illustrative): <strong>{usage.projects}</strong>
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Seats</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            1 <span className="text-lg font-normal text-gray-500">/ {seatsAllowed}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled>
              Invite user
            </Button>
            <Button size="sm" variant="outline" disabled>
              Remove user
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {isEnterprise
              ? 'Enterprise seat provisioning hooks to your team directory when enabled.'
              : 'Team seats apply to enterprise-style plans.'}
          </p>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-sm">
            <span className="font-semibold">Owner</span> — Admin (implicit){' '}
            <span className="text-gray-500">· Role assignment UI connects to your RBAC service.</span>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Invoices & tax</h3>
          <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
            <p>
              <span className="text-gray-500">Billing address:</span>{' '}
              {paymentMethods[0]?.billing_address
                ? `${paymentMethods[0].billing_address.city}, ${paymentMethods[0].billing_address.country}`
                : '—'}
            </p>
            <p>
              <span className="text-gray-500">Tax ID (seller profile):</span>{' '}
              {(sub?.identity_and_trust as any)?.tax_id || '—'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {billingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  billingHistory.slice(0, 12).map((inv: any) => (
                    <tr key={inv.invoice_id || inv.invoice_number}>
                      <td className="py-2 pr-4">{fmtDate(inv.date)}</td>
                      <td className="py-2 pr-4">
                        {inv.subscription_amount} {inv.currency}
                      </td>
                      <td className="py-2 pr-4 capitalize">{inv.status}</td>
                      <td className="py-2">
                        {inv.invoice_url ? (
                          <a href={inv.invoice_url} className="text-emerald-600 font-medium" target="_blank" rel="noreferrer">
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Subscription actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy || !row.is_active} onClick={() => onSetStatus('pause')}>
              <Ban className="h-4 w-4 mr-1" />
              Pause
            </Button>
            <Button variant="outline" size="sm" disabled={busy || row.is_active} onClick={() => onSetStatus('reactivate')}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Reactivate
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
            <label className="text-xs font-semibold text-gray-500">Coupon / discount code</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="SAVE20"
              />
              <Button size="sm" disabled={busy || !coupon.trim()} onClick={() => onApplyCoupon(coupon.trim())}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'super' && (
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Super admin controls
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Extend renewal (days)</label>
              <input
                type="number"
                min={1}
                max={366}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
              />
              <Button size="sm" disabled={busy} onClick={() => onExtendRenewal(extendDays)}>
                Extend renewal
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Extend trial (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
              />
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onExtendTrial(trialDays)}>
                Extend trial
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-2">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Override limits (metadata)</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                placeholder="Product cap"
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-sm"
                value={ovProd}
                onChange={(e) => setOvProd(e.target.value)}
              />
              <input
                placeholder="API / mo"
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-sm"
                value={ovApi}
                onChange={(e) => setOvApi(e.target.value)}
              />
              <input
                placeholder="Storage bytes"
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-sm"
                value={ovStorage}
                onChange={(e) => setOvStorage(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onOverrideLimits({
                  productLimit: ovProd === '' ? undefined : Number(ovProd),
                  apiCallsPerMonth: ovApi === '' ? undefined : Number(ovApi),
                  storageBytes: ovStorage === '' ? undefined : Number(ovStorage),
                })
              }
            >
              Save overrides
            </Button>
            {meta?.admin_limit_overrides && (
              <pre className="text-[10px] bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                {JSON.stringify(meta.admin_limit_overrides, null, 2)}
              </pre>
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Audit log</h4>
            <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-1">
              {auditLogs.length === 0 ? (
                <p className="text-gray-500">No entries.</p>
              ) : (
                [...auditLogs]
                  .reverse()
                  .slice(0, 40)
                  .map((log: any) => (
                    <div key={log.log_id} className="border-b border-gray-100 dark:border-gray-800 pb-1">
                      {fmtDate(log.timestamp)} — {log.action} · {log.field}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>This notifies the seller and records the reason.</DialogDescription>
          </DialogHeader>
          <input
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
            placeholder="Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await onCancel(cancelReason.trim() || 'Cancelled by admin');
                setCancelOpen(false);
              }}
            >
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
