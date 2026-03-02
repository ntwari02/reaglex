import React, { useState } from 'react';
import {
  DollarSign,
  Wallet,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  Download,
  FileText,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface SellerFinanceProps {
  sellerId: string;
}

type PayoutStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'failed';

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  requestedDate: string;
  processedDate?: string;
  method: string;
  notes?: string;
  commission: number;
  platformFees: number;
}

const mockPayouts: Payout[] = [
  {
    id: 'PAY-001',
    amount: 12500,
    status: 'pending',
    requestedDate: '2024-03-15',
    method: 'Bank Transfer',
    commission: 1500,
    platformFees: 250,
  },
  {
    id: 'PAY-002',
    amount: 9800,
    status: 'completed',
    requestedDate: '2024-03-01',
    processedDate: '2024-03-03',
    method: 'Bank Transfer',
    commission: 1176,
    platformFees: 196,
  },
  {
    id: 'PAY-003',
    amount: 15200,
    status: 'completed',
    requestedDate: '2024-02-15',
    processedDate: '2024-02-17',
    method: 'PayPal',
    commission: 1824,
    platformFees: 304,
  },
  {
    id: 'PAY-004',
    amount: 8500,
    status: 'rejected',
    requestedDate: '2024-02-01',
    method: 'Bank Transfer',
    notes: 'Insufficient documentation',
    commission: 1020,
    platformFees: 170,
  },
];

export default function SellerFinance({ sellerId }: SellerFinanceProps) {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const totalEarnings = 125000;
  const withdrawableBalance = 25000;
  const pendingPayouts = mockPayouts.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const completedPayouts = mockPayouts.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const totalCommission = mockPayouts.reduce((sum, p) => sum + p.commission, 0);
  const totalPlatformFees = mockPayouts.reduce((sum, p) => sum + p.platformFees, 0);

  const getStatusBadge = (status: PayoutStatus) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      failed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  const handleApprovePayout = (payoutId: string) => {
    console.log('Approve payout:', payoutId);
  };

  const handleRejectPayout = (payoutId: string) => {
    console.log('Reject payout:', payoutId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Finance</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Earnings, payouts, and financial records</p>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Earnings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalEarnings.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Withdrawable Balance</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${withdrawableBalance.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
            <Clock className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending Payouts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${pendingPayouts.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <CheckCircle className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Completed Payouts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${completedPayouts.toLocaleString()}</p>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Commission & Fees</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Commission Paid</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${totalCommission.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Platform Fees</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${totalPlatformFees.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Net Earnings</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ${(totalEarnings - totalCommission - totalPlatformFees).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Payout Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Pending</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {mockPayouts.filter((p) => p.status === 'pending').length} payouts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Approved</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {mockPayouts.filter((p) => p.status === 'approved').length} payouts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Completed</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {mockPayouts.filter((p) => p.status === 'completed').length} payouts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Failed/Rejected</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {mockPayouts.filter((p) => p.status === 'failed' || p.status === 'rejected').length} payouts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payout History</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">All payout requests and transactions</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Payout ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Platform Fees</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Processed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {mockPayouts.map((payout) => (
                <tr key={payout.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{payout.id}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    ${payout.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(payout.status)}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{payout.method}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">${payout.commission.toLocaleString()}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    ${payout.platformFees.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(payout.requestedDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {payout.processedDate ? new Date(payout.processedDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {payout.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprovePayout(payout.id)}
                            className="rounded-full border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                            title="Approve payout"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRejectPayout(payout.id)}
                            className="rounded-full border border-red-200 bg-red-50 p-2 text-xs text-red-700 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                            title="Reject payout"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowPayoutModal(true);
                        }}
                        className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
                        title="View details"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Logs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Recent Payment Logs</h3>
        <div className="space-y-3">
          {mockPayouts.slice(0, 5).map((payout) => (
            <div
              key={payout.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{payout.id}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {payout.method} • {new Date(payout.requestedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${payout.amount.toLocaleString()}
                </p>
                {getStatusBadge(payout.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Details Modal */}
      {showPayoutModal && selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowPayoutModal(false);
                setSelectedPayout(null);
              }}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Payout Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Payout ID</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPayout.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Amount</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${selectedPayout.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                {getStatusBadge(selectedPayout.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Method</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPayout.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Commission</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${selectedPayout.commission.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Platform Fees</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${selectedPayout.platformFees.toLocaleString()}
                </span>
              </div>
              {selectedPayout.notes && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Notes</span>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPayout.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                Add Notes
              </button>
              {selectedPayout.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprovePayout(selectedPayout.id)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectPayout(selectedPayout.id)}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
