import React from 'react';
import { ArrowLeft, TrendingUp, ShoppingCart, DollarSign, Package, XCircle, RefreshCw, BarChart3 } from 'lucide-react';

interface OrderAnalyticsProps {
  orders: any[];
  onBack: () => void;
}

export default function OrderAnalytics({ orders, onBack }: OrderAnalyticsProps) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const ordersToday = orders.filter((o) => o.orderDate === today);
  const ordersThisMonth = orders.filter((o) => {
    const orderDate = new Date(o.orderDate);
    return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear;
  });

  const revenueToday = ordersToday.reduce((sum, o) => sum + o.totalAmount, 0);
  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Performance metrics and insights</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Orders Today</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{ordersToday.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Orders This Month</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{ordersThisMonth.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Revenue Today</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${revenueToday.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Revenue This Month</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${revenueThisMonth.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">Advanced analytics charts - Component in progress</p>
      </div>
    </div>
  );
}

