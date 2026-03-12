import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Package, Download } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminReviewsAPI } from '@/lib/api';

export default function ReviewAnalytics() {
  const [selectedChart, setSelectedChart] = useState<'products' | 'sellers'>('products');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highestRated, setHighestRated] = useState(0);
  const [lowestRated, setLowestRated] = useState(0);
  const [mostReviewedCount, setMostReviewedCount] = useState(0);
  const [reviewRatio, setReviewRatio] = useState(0);
  const [productRatings, setProductRatings] = useState<{ label: string; value: number }[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    adminReviewsAPI.getAnalytics()
      .then((res) => {
        setHighestRated(res.highestRated ?? 0);
        setLowestRated(res.lowestRated ?? 0);
        setMostReviewedCount(res.mostReviewedCount ?? 0);
        setReviewRatio(res.reviewRatio ?? 0);
        setProductRatings(Array.isArray(res.productRatings) ? res.productRatings : []);
        setSellerPerformance(Array.isArray(res.sellerPerformance) ? res.sellerPerformance : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const chartData = selectedChart === 'products' ? productRatings : sellerPerformance;
  const data = chartData.length ? chartData : [{ label: 'No data', value: 0 }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Insights for data-driven review management
          </p>
        </div>
        <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
          <Download className="mr-2 inline h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Highest Rated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{highestRated}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Lowest Rated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{lowestRated}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Most Reviewed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{mostReviewedCount}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Review Ratio</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{reviewRatio}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h3>
          <div className="flex gap-2">
            {(['products', 'sellers'] as const).map((chart) => (
              <button
                key={chart}
                onClick={() => setSelectedChart(chart)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedChart === chart
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {chart.charAt(0).toUpperCase() + chart.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <BarChart data={data} />
        </div>
      </div>
    </div>
  );
}

