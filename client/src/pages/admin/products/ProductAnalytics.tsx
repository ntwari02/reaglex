import React from 'react';
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, ShoppingCart, Eye, Star, RefreshCw } from 'lucide-react';

interface ProductAnalyticsProps {
  productId: string;
  onBack: () => void;
}

export default function ProductAnalytics({ productId, onBack }: ProductAnalyticsProps) {
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Performance metrics and insights</p>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">Product Analytics - Component in progress</p>
      </div>
    </div>
  );
}

