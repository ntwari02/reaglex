import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3, Eye, DollarSign, TrendingUp } from 'lucide-react';
import { adminProductsAPI } from '@/lib/api';

interface ProductAnalyticsProps {
  productId: string;
  onBack: () => void;
}

export default function ProductAnalytics({ productId, onBack }: ProductAnalyticsProps) {
  const [data, setData] = useState<{ productName: string; views: number; metrics: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminProductsAPI
      .getProductAnalytics(productId)
      .then((res) => setData({ productName: res.productName, views: res.views, metrics: res.metrics }))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const m = data?.metrics ?? {};
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.productName ? `Metrics for ${data.productName}` : 'Performance metrics from database'}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.views ?? 0}</p>
              </div>
              <Eye className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.sales ?? 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${(m.revenue ?? 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

