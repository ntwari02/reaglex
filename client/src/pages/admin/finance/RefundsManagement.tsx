import React, { useState, useMemo } from 'react';
import { RefreshCw, Search, Filter, CheckCircle, XCircle, Eye, Upload, DollarSign } from 'lucide-react';

type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';
type RefundType = 'full' | 'partial';

interface Refund {
  id: string;
  orderId: string;
  customerName: string;
  sellerName: string;
  amount: number;
  type: RefundType;
  status: RefundStatus;
  reason: string;
  requestedDate: string;
  processedDate?: string;
  refundMethod: string;
  hasEvidence: boolean;
}

const mockRefunds: Refund[] = [
  {
    id: 'REF-001',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    sellerName: 'TechHub Electronics',
    amount: 299.99,
    type: 'full',
    status: 'pending',
    reason: 'Product not as described',
    requestedDate: '2024-03-15',
    refundMethod: 'Original Payment Method',
    hasEvidence: true,
  },
  {
    id: 'REF-002',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    sellerName: 'Fashion Forward',
    amount: 75.50,
    type: 'partial',
    status: 'approved',
    reason: 'Partial refund for damaged item',
    requestedDate: '2024-03-14',
    processedDate: '2024-03-15',
    refundMethod: 'PayPal',
    hasEvidence: false,
  },
];

export default function RefundsManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [activeSection, setActiveSection] = useState<'requests' | 'history'>('requests');

  const filteredRefunds = useMemo(() => {
    return mockRefunds.filter((refund) => {
      const matchesSearch =
        refund.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        refund.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        refund.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const getStatusBadge = (status: RefundStatus) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          {[
            { id: 'requests', label: 'Refund Requests' },
            { id: 'history', label: 'Refund History' },
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

      {activeSection === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Search refunds"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RefundStatus | 'all')}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredRefunds
              .filter((r) => r.status === 'pending' || r.status === 'approved')
              .map((refund) => (
                <div
                  key={refund.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Refund {refund.id}</h3>
                        {getStatusBadge(refund.status)}
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {refund.type}
                        </span>
                      </div>
                      <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                        Order: {refund.orderId} • Customer: {refund.customerName} • Seller: {refund.sellerName}
                      </div>
                      <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                        Amount: ${refund.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p className="font-semibold">Reason:</p>
                        <p>{refund.reason}</p>
                      </div>
                      {refund.hasEvidence && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Upload className="h-3 w-3" /> Evidence files attached
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      {refund.status === 'pending' && (
                        <>
                          <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                            Approve
                          </button>
                          <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                            Reject
                          </button>
                        </>
                      )}
                      <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeSection === 'history' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Refund ID</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Processed Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRefunds
                  .filter((r) => r.status === 'completed' || r.status === 'rejected')
                  .map((refund) => (
                    <tr
                      key={refund.id}
                      className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{refund.id}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{refund.orderId}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{refund.customerName}</td>
                      <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                        ${refund.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{refund.type}</td>
                      <td className="px-4 py-4">{getStatusBadge(refund.status)}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{refund.refundMethod}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                        {refund.processedDate ? new Date(refund.processedDate).toLocaleDateString() : '-'}
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
      )}
    </div>
  );
}

