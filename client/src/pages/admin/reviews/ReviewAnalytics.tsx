import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Star, Package, Users, Download } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockProductRatings = [
  { label: 'Premium Headphones', value: 4.8 },
  { label: 'Smart Watch', value: 4.6 },
  { label: 'Wireless Earbuds', value: 4.5 },
  { label: 'Laptop Stand', value: 4.2 },
];

const mockSellerPerformance = [
  { label: 'Tech Store', value: 4.8 },
  { label: 'Fashion Hub', value: 3.2 },
  { label: 'Electronics Plus', value: 4.5 },
];

export default function ReviewAnalytics() {
  const [selectedChart, setSelectedChart] = useState<'products' | 'sellers'>('products');

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Highest Rated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">4.8</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Lowest Rated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">2.1</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Most Reviewed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">245</p>
            </div>
            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Review Ratio</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">12.5%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
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
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {chart.charAt(0).toUpperCase() + chart.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <BarChart
            data={selectedChart === 'products' ? mockProductRatings : mockSellerPerformance}
          />
        </div>
      </div>
    </div>
  );
}

