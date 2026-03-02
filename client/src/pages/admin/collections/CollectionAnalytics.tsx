import { useState } from 'react';
import { BarChart3, Eye, TrendingUp, DollarSign, Download, Monitor, Smartphone } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

export default function CollectionAnalytics() {
  const [selectedCollection, setSelectedCollection] = useState('1');

  // Generate dates for the last 7 days
  const getDateString = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const mockPerformance = [
    { date: getDateString(6), value: 1250 },
    { date: getDateString(5), value: 1890 },
    { date: getDateString(4), value: 1520 },
    { date: getDateString(3), value: 2100 },
    { date: getDateString(2), value: 1780 },
    { date: getDateString(1), value: 1650 },
    { date: getDateString(0), value: 1420 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Collection Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Insights and performance reports
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="1">Summer Sale</option>
            <option value="2">New Arrivals</option>
            <option value="3">Best Sellers</option>
          </select>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">12,450</p>
            </div>
            <Eye className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click-Through Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">8.5%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sales Generated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">$45,230</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">12.5%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Performance Over Time
          </h3>
          <div className="h-64">
            <BarChart data={mockPerformance} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Device Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Mobile</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">65%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Desktop</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">35%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Top 5 Performing Products
        </h3>
        <div className="space-y-3">
          {[
            { name: 'Premium Headphones', views: 1250, sales: 156, revenue: 31200 },
            { name: 'Smart Watch', views: 980, sales: 81, revenue: 24219 },
            { name: 'Wireless Earbuds', views: 850, sales: 68, revenue: 13600 },
          ].map((product, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {product.views} views • {product.sales} sales
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${product.revenue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

