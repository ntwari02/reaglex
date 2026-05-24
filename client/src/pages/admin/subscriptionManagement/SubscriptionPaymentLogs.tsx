import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Receipt, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminSellerSubscriptionsApi } from '@/services/adminSellerSubscriptionsApi';
import { useToastStore } from '@/stores/toastStore';
import '@/styles/admin-subscription.css';

type LogRow = Awaited<ReturnType<typeof adminSellerSubscriptionsApi.listPaymentLogs>>['items'][number];

export default function SubscriptionPaymentLogs() {
  const showToast = useToastStore((s) => s.showToast);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [summary, setSummary] = useState({ totalAmount: 0, paidCount: 0, failedCount: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminSellerSubscriptionsApi.listPaymentLogs({
        page,
        limit,
        status: status || undefined,
        search: search || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
      setSummary(res.summary);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load payment logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, search, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="adm-sub-panel space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            Subscription payment log
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            All seller subscription charges from billing history and financial events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="adm-sub-stat-pill adm-sub-stat-pill--ok">
            Paid: {summary.paidCount}
          </span>
          <span className="adm-sub-stat-pill adm-sub-stat-pill--warn">
            Failed: {summary.failedCount}
          </span>
          <span className="adm-sub-stat-pill">
            Volume: ${summary.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            placeholder="Seller, store, invoice, transaction…"
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
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          Filter
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900/40">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-14 text-center text-gray-500">No subscription payments match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm adm-sub-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Seller</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {new Date(r.occurredAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="font-medium text-gray-900 dark:text-white">{r.storeName || r.sellerName}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]">{r.sellerEmail}</div>
                    </td>
                    <td>{r.planName || '—'}</td>
                    <td className="font-semibold">
                      {r.currency} {r.amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={`adm-sub-status adm-sub-status--${r.status}`}>{r.status}</span>
                    </td>
                    <td className="text-xs text-gray-500 font-mono">
                      {r.invoiceNumber || r.transactionId || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > limit && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              Page {page} · {total} entries
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
