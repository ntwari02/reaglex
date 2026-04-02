import React, { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  Ban,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToastStore } from '@/stores/toastStore';
import { adminSellerSubscriptionsApi } from '@/services/adminSellerSubscriptionsApi';

type Row = Awaited<ReturnType<typeof adminSellerSubscriptionsApi.list>>['items'][number];

export default function SellerSubscriptionsAdmin() {
  const showToast = useToastStore((s) => s.showToast);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<
    Array<{ tier_id: string; tier_name: string; name: string; price: number; currency: string }>
  >([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [tierPick, setTierPick] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminSellerSubscriptionsApi
      .listPlans()
      .then((res) => {
        setPlans(
          (res.plans as Array<{ tier_id: string; tier_name: string; name: string; price: number; currency: string }>).map(
            (p) => ({
              tier_id: p.tier_id,
              tier_name: p.tier_name,
              name: p.name,
              price: p.price,
              currency: p.currency || 'USD',
            }),
          ),
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

  const openDetail = (r: Row) => {
    setSelected(r);
    setTierPick(r.tier_id || '');
    setCancelReason('');
  };

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    if (!selected) return;
    const uid = selected.userId;
    setBusy(true);
    try {
      await fn();
      showToast(okMsg, 'success');
      const nextRows = await load();
      const updated = nextRows.find((x) => x.userId === uid);
      if (updated) {
        setSelected(updated);
        setTierPick(updated.tier_id || '');
      } else {
        setSelected(null);
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Request failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-emerald-600" />
            Seller subscriptions
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View tiers, suspend or reactivate, change plan, cancel, and toggle auto-renew (admin override).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
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

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-gray-500">No subscription records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-left text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Store</th>
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Tier</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Renewal</th>
                  <th className="px-4 py-3 font-semibold w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{r.store_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white">{r.fullName || '—'}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
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
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {r.renewal_date
                        ? new Date(r.renewal_date).toLocaleDateString()
                        : '—'}
                      {r.auto_renew === false && (
                        <span className="block text-amber-600 dark:text-amber-400">Auto-renew off</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => openDetail(r)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage subscription</DialogTitle>
            <DialogDescription>
              {selected?.store_name} — {selected?.email}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Tier:</span>{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selected.tier_name || selected.tier_id}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Account flag:</span>{' '}
                  <span className="font-medium">{selected.is_active ? 'Active' : 'Inactive'}</span>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Change tier</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  value={tierPick}
                  onChange={(e) => setTierPick(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.tier_id} value={p.tier_id}>
                      {p.tier_name} ({p.name}) — {p.price === 0 ? 'Free' : `${p.price} ${p.currency || 'USD'}`}
                    </option>
                  ))}
                </select>
                <Button
                  className="mt-2 w-full"
                  disabled={busy || !tierPick || tierPick === selected.tier_id}
                  onClick={() =>
                    run(
                      () => adminSellerSubscriptionsApi.assignTier(selected.userId, tierPick),
                      'Tier updated',
                    )
                  }
                >
                  Apply tier
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy || !selected.is_active}
                  onClick={() =>
                    run(() => adminSellerSubscriptionsApi.setStatus(selected.userId, 'suspend'), 'Suspended')
                  }
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy || selected.is_active}
                  onClick={() =>
                    run(
                      () => adminSellerSubscriptionsApi.setStatus(selected.userId, 'reactivate'),
                      'Reactivated',
                    )
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Reactivate
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => adminSellerSubscriptionsApi.setAutoRenew(selected.userId, !selected.auto_renew),
                      'Auto-renew updated',
                    )
                  }
                >
                  {selected.auto_renew ? (
                    <>
                      <ToggleLeft className="h-4 w-4 mr-1" />
                      Turn off auto-renew
                    </>
                  ) : (
                    <>
                      <ToggleRight className="h-4 w-4 mr-1" />
                      Turn on auto-renew
                    </>
                  )}
                </Button>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Cancel subscription
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Reason (shown on record)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  className="mt-2 w-full"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        adminSellerSubscriptionsApi.cancel(
                          selected.userId,
                          cancelReason.trim() || 'Cancelled by admin',
                        ),
                      'Cancelled',
                    )
                  }
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel subscription
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
