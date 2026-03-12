import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
  Store,
  Calendar,
} from 'lucide-react';
import { adminFinanceAPI } from '@/lib/api';

type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Payout {
  id: string;
  sellerName: string;
  sellerId: string;
  amount: number;
  status: PayoutStatus;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  paymentMethod: string;
  referenceId?: string;
  commission: number;
  totalEarnings: number;
  pendingEarnings: number;
  availableForWithdrawal: number;
  disputeHolds: number;
}

export default function SellerPayouts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'requests' | 'history' | 'breakdown'>('requests');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFinanceAPI.getPayouts({ limit: 100 }).then((res) => {
      setPayouts(res.payouts.map((p: any) => ({
        id: p.id,
        sellerName: p.sellerName || 'Unknown',
        sellerId: p.sellerId || '',
        amount: p.amount,
        status: p.status,
        requestedDate: p.requestedDate ? new Date(p.requestedDate).toISOString().slice(0, 10) : '',
        scheduledDate: p.scheduledDate ? new Date(p.scheduledDate).toISOString().slice(0, 10) : undefined,
        completedDate: p.completedDate ? new Date(p.completedDate).toISOString().slice(0, 10) : undefined,
        paymentMethod: p.paymentMethod || '',
        referenceId: p.referenceId,
        commission: p.commission ?? 0,
        totalEarnings: p.totalEarnings ?? 0,
        pendingEarnings: p.pendingEarnings ?? 0,
        availableForWithdrawal: p.availableForWithdrawal ?? 0,
        disputeHolds: p.disputeHolds ?? 0,
      })));
    }).catch(() => setPayouts([])).finally(() => setLoading(false));
  }, [activeSection]);

  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      const matchesSearch =
        payout.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payout.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (payout.referenceId && payout.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, payouts]);

  const getStatusBadge = (status: PayoutStatus) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  const handleApprovePayout = (payoutId: string) => {
    adminFinanceAPI.approvePayout(payoutId).then(() => {
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, status: 'processing' as PayoutStatus } : p)));
    }).catch(() => {});
  };

  const handleRejectPayout = (payoutId: string) => {
    adminFinanceAPI.rejectPayout(payoutId).then(() => {
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, status: 'failed' as PayoutStatus } : p)));
    }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          {[
            { id: 'requests', label: 'Payout Requests' },
            { id: 'history', label: 'Payout History' },
            { id: 'breakdown', label: 'Earnings Breakdown' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeSection === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payout Requests */}
      {activeSection === 'requests' && (
        <div className="space-y-4">
          {loading && <div className="text-center text-gray-500 py-4">Loading...</div>}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Search by payout ID, seller, or reference"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | 'all')}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredPayouts.filter((p) => p.status === 'pending' || p.status === 'processing').length === 0 && !loading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900">No pending or processing payouts</div>
            )}
            {filteredPayouts
              .filter((p) => p.status === 'pending' || p.status === 'processing')
              .map((payout) => (
                <div
                  key={payout.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Store className="h-4 w-4 text-gray-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{payout.sellerName}</h3>
                        {getStatusBadge(payout.status)}
                      </div>
                      <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                        Payout ID: {payout.id} • Amount: ${payout.amount.toLocaleString()}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Requested: {new Date(payout.requestedDate).toLocaleDateString()}</span>
                        {payout.scheduledDate && (
                          <span>Scheduled: {new Date(payout.scheduledDate).toLocaleDateString()}</span>
                        )}
                        <span>Method: {payout.paymentMethod}</span>
                        <span>Commission: ${payout.commission.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      {payout.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprovePayout(payout.id)}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectPayout(payout.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowPayoutModal(true);
                        }}
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Payout History */}
      {activeSection === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Search payout history"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3">Payout ID</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Reference ID</th>
                    <th className="px-4 py-3">Completed Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredPayouts
                    .filter((p) => p.status === 'completed' || p.status === 'failed')
                    .map((payout) => (
                      <tr
                        key={payout.id}
                        className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white">{payout.id}</p>
                        </td>
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{payout.sellerName}</td>
                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                          ${payout.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(payout.status)}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{payout.paymentMethod}</td>
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                          {payout.referenceId || '-'}
                        </td>
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                          {payout.completedDate
                            ? new Date(payout.completedDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400">
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Breakdown */}
      {activeSection === 'breakdown' && (
        <div className="space-y-4">
          {loading ? <div className="py-8 text-center text-gray-500">Loading...</div> : payouts.length === 0 ? <div className="py-8 text-center text-gray-500">No payout data</div> : payouts.map((payout) => (
            <div
              key={payout.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{payout.sellerName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Seller ID: {payout.sellerId}</p>
                </div>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  View Details
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Earnings</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${payout.totalEarnings.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Commission Deducted</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${payout.commission.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Available for Withdrawal</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ${payout.availableForWithdrawal.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending Earnings</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    ${payout.pendingEarnings.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dispute Holds</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    ${payout.disputeHolds.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

