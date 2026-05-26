import React, { useEffect, useState } from 'react';
import { TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface SellerPerformanceProps {
  sellerId: string;
}

export default function SellerPerformance({ sellerId }: SellerPerformanceProps) {
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalProducts: 0,
    earnings: 0,
    disputes: 0,
    tickets: 0,
    warningCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sellerId) return;
      setLoading(true);
      try {
        const res = await adminAPI.getSellerDetails(sellerId);
        if (!cancelled) {
          setMetrics({
            totalOrders: res.seller.totalOrders ?? 0,
            totalProducts: res.seller.totalProducts ?? 0,
            earnings: res.seller.earnings ?? 0,
            disputes: res.seller.disputes ?? 0,
            tickets: res.seller.tickets ?? 0,
            warningCount: res.seller.warningCount ?? 0,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : 'Failed to load performance', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, showToast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const avgOrderValue = metrics.totalOrders > 0 ? metrics.earnings / metrics.totalOrders : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Performance</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Live metrics from orders, products, and support</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <ShoppingCart className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total orders</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <DollarSign className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Lifetime earnings</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${metrics.earnings.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg. order value</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${avgOrderValue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-emerald-600">
            <Package className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Active products</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalProducts}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Open disputes</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.disputes}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Warnings on file</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.warningCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        Detailed sales trends and product-level analytics are available under Admin → Orders and Admin → Products with
        seller filters.
      </div>
    </div>
  );
}
