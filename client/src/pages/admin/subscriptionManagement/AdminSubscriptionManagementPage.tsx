import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, RefreshCw, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toastStore';
import { adminSellerSubscriptionsApi } from '@/services/adminSellerSubscriptionsApi';
import PlanCompareModal, { type ComparePlan } from './PlanCompareModal';
import SubscriptionWorkspace, { type ListRow } from './SubscriptionWorkspace';

type Row = Awaited<ReturnType<typeof adminSellerSubscriptionsApi.list>>['items'][number];

export default function AdminSubscriptionManagementPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ComparePlan[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<{
    subscription: Record<string, unknown>;
    user: { id: string; email: string; fullName: string };
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    adminSellerSubscriptionsApi
      .listPlans()
      .then((res) => {
        setPlans(
          (res.plans as ComparePlan[]).map((p) => ({
            tier_id: String(p.tier_id),
            tier_name: String(p.tier_name),
            name: String(p.name),
            price: Number(p.price) || 0,
            currency: (p.currency as string) || 'USD',
            billing_cycle: p.billing_cycle as string | undefined,
            features: Array.isArray(p.features) ? (p.features as string[]) : [],
            is_popular: Boolean(p.is_popular),
          })),
        );
      })
      .catch(() => showToast('Could not load plan catalog', 'error'));
  }, [showToast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await adminSellerSubscriptionsApi.list({ page, limit, search: search || undefined });
      setRows(listRes.items);
      setTotal(listRes.total);
      return listRes.items;
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(
    async (userId: string) => {
      setDetailLoading(true);
      setDetail(null);
      try {
        const d = await adminSellerSubscriptionsApi.getBySellerUserId(userId);
        setDetail(d as { subscription: Record<string, unknown>; user: { id: string; email: string; fullName: string } });
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : 'Failed to load detail', 'error');
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (selected) void loadDetail(selected.userId);
    else setDetail(null);
  }, [selected?.userId, loadDetail]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length;
    const trialing = rows.filter((r) => String(r.plan_status || '').toLowerCase() === 'trial').length;
    return { active, trialing, pageCount: rows.length };
  }, [rows]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    if (!selected) return;
    const uid = selected.userId;
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, 'success');
      const nextRows = await load();
      const updated = nextRows.find((x) => x.userId === uid);
      if (updated) setSelected(updated);
      await loadDetail(uid);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Request failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const listRowFrom = (r: Row): ListRow => ({
    id: r.id,
    userId: r.userId,
    email: r.email,
    fullName: r.fullName,
    store_name: r.store_name,
    tier_id: r.tier_id,
    tier_name: r.tier_name,
    plan_status: r.plan_status,
    is_active: r.is_active,
    renewal_date: r.renewal_date,
    auto_renew: r.auto_renew,
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 px-2 sm:px-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-emerald-600 shrink-0" />
            Subscription management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            SaaS-style operations: plans, billing signals, usage, invoices, super-admin overrides — wired to seller + admin
            inbox notifications.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            Compare plans
          </Button>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Active (this page)', value: stats.active, tone: 'from-emerald-500/15 to-transparent' },
          { label: 'Trial (this page)', value: stats.trialing, tone: 'from-cyan-500/15 to-transparent' },
          { label: 'Rows shown', value: stats.pageCount, tone: 'from-violet-500/15 to-transparent' },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br ${s.tone} px-5 py-4`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            placeholder="Search store, name, or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                setSearch(searchInput.trim());
              }
            }}
          />
        </div>
        <Button
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          Search
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-start">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-gray-500">No subscription records found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-left text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Store</th>
                      <th className="px-4 py-3 font-semibold">Seller</th>
                      <th className="px-4 py-3 font-semibold">Tier</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Renewal</th>
                      <th className="px-4 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className={`cursor-pointer transition-colors ${
                          selected?.userId === r.userId
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/25'
                            : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                        }`}
                        onClick={() => setSelected(r)}
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{r.store_name}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">{r.fullName || '—'}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[140px] sm:max-w-[200px]">{r.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.tier_name || r.tier_id || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              r.is_active
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                            }`}
                          >
                            {r.plan_status || (r.is_active ? 'active' : 'inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs hidden md:table-cell">
                          {r.renewal_date ? new Date(r.renewal_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant={selected?.userId === r.userId ? 'default' : 'secondary'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(r);
                            }}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
                  <span className="text-gray-500">
                    Page {page} — {total} total
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page * limit >= total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="min-h-[320px]">
          {selected ? (
            <SubscriptionWorkspace
              row={listRowFrom(selected)}
              detail={detail}
              detailLoading={detailLoading}
              plans={plans}
              busy={busy}
              onRefreshDetail={() => loadDetail(selected.userId)}
              onAssignTier={(tierId) => run(() => adminSellerSubscriptionsApi.assignTier(selected.userId, tierId), 'Plan updated')}
              onSetStatus={(action) =>
                run(() => adminSellerSubscriptionsApi.setStatus(selected.userId, action), 'Status updated')
              }
              onSetAutoRenew={(v) =>
                run(() => adminSellerSubscriptionsApi.setAutoRenew(selected.userId, v), 'Auto-renew updated')
              }
              onCancel={(reason) =>
                run(() => adminSellerSubscriptionsApi.cancel(selected.userId, reason), 'Subscription cancelled')
              }
              onExtendRenewal={(days) =>
                run(() => adminSellerSubscriptionsApi.extendRenewal(selected.userId, days), 'Renewal extended')
              }
              onExtendTrial={(days) =>
                run(() => adminSellerSubscriptionsApi.extendTrial(selected.userId, days), 'Trial extended')
              }
              onOverrideLimits={(body) =>
                run(() => adminSellerSubscriptionsApi.overrideLimits(selected.userId, body), 'Overrides saved')
              }
              onApplyCoupon={(code) =>
                run(() => adminSellerSubscriptionsApi.applyCoupon(selected.userId, code), 'Coupon applied')
              }
              onRetryPayment={() => run(() => adminSellerSubscriptionsApi.retryPayment(selected.userId), 'Retry recorded')}
              onOpenCompare={() => setCompareOpen(true)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-10 text-center text-gray-500 dark:text-gray-400">
              Select a seller from the list to open the full subscription workspace.
            </div>
          )}
        </div>
      </div>

      <PlanCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        plans={plans}
        currentTierId={selected?.tier_id}
        onSelectTier={(tierId) => {
          if (selected) {
            void run(() => adminSellerSubscriptionsApi.assignTier(selected.userId, tierId), 'Plan updated');
          } else {
            showToast('Select a seller first, then pick a plan.', 'error');
          }
        }}
      />
    </div>
  );
}
