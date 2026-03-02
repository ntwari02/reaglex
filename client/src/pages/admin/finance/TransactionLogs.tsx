import React, { useState, useMemo } from 'react';
import { CreditCard, Search, Filter, Download, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

type PaymentStatus = 'paid' | 'failed' | 'refunded';

interface Transaction {
  id: string;
  transactionId: string;
  orderId: string;
  customerName: string;
  sellerName: string;
  paymentMethod: string;
  amount: number;
  commission: number;
  status: PaymentStatus;
  date: string;
  referenceCode: string;
  gateway: string;
  isHighRisk: boolean;
}

const mockTransactions: Transaction[] = [
  {
    id: 'TXN-001',
    transactionId: 'TXN-001',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    sellerName: 'TechHub Electronics',
    paymentMethod: 'Card',
    amount: 299.99,
    commission: 29.99,
    status: 'paid',
    date: '2024-03-15',
    referenceCode: 'REF-123456',
    gateway: 'Stripe',
    isHighRisk: false,
  },
  {
    id: 'TXN-002',
    transactionId: 'TXN-002',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    sellerName: 'Fashion Forward',
    paymentMethod: 'PayPal',
    amount: 149.99,
    commission: 14.99,
    status: 'paid',
    date: '2024-03-16',
    referenceCode: 'REF-789012',
    gateway: 'PayPal',
    isHighRisk: false,
  },
  {
    id: 'TXN-003',
    transactionId: 'TXN-003',
    orderId: 'ORD-003',
    customerName: 'Bob Johnson',
    sellerName: 'HomeStyle',
    paymentMethod: 'Mobile Money',
    amount: 89.99,
    commission: 8.99,
    status: 'failed',
    date: '2024-03-17',
    referenceCode: 'REF-345678',
    gateway: 'MTN Mobile Money',
    isHighRisk: true,
  },
];

export default function TransactionLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((txn) => {
      const matchesSearch =
        txn.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
      const matchesMethod = paymentMethodFilter === 'all' || txn.paymentMethod === paymentMethodFilter;
      const matchesDate =
        !dateRange[0] || !dateRange[1] || (txn.date >= dateRange[0] && txn.date <= dateRange[1]);
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [searchQuery, statusFilter, paymentMethodFilter, dateRange]);

  const getStatusBadge = (status: PaymentStatus) => {
    const styles = {
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Search by Transaction ID, Order ID, Customer, or Seller"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 lg:grid-cols-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Methods</option>
          <option value="Card">Card</option>
          <option value="PayPal">PayPal</option>
          <option value="Mobile Money">Mobile Money</option>
        </select>
        <input
          type="date"
          value={dateRange[0]}
          onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="From Date"
        />
        <input
          type="date"
          value={dateRange[1]}
          onChange={(e) => setDateRange([dateRange[0], e.target.value])}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          placeholder="To Date"
        />
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredTransactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{txn.transactionId}</p>
                    {txn.isHighRisk && (
                      <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                        High Risk
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{txn.orderId}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{txn.customerName}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{txn.sellerName}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{txn.paymentMethod}</td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    ${txn.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">${txn.commission.toFixed(2)}</td>
                  <td className="px-4 py-4">{getStatusBadge(txn.status)}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{txn.gateway}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400">
                        <Eye className="h-4 w-4" />
                      </button>
                      {txn.status === 'failed' && (
                        <button className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

