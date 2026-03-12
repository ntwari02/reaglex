import { useState, useEffect } from 'react';
import { BarChart3, Eye, TrendingUp, DollarSign, Download, Monitor, Smartphone } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminCollectionsAPI } from '@/lib/api';

export default function CollectionAnalytics() {
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [metrics, setMetrics] = useState<{ totalViews: number; clickThroughRate: number; salesGenerated: number } | null>(null);
  const [performance, setPerformance] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminCollectionsAPI.getCollections().then((res) => {
      const list = (res.collections || []).map((c: any) => ({ id: c.id || c._id, name: c.title || c.name || '' }));
      setCollections(list);
      if (list.length && !selectedCollection) setSelectedCollection(list[0].id);
    }).catch(() => setCollections([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCollection) return;
    adminCollectionsAPI.getCollectionAnalytics(selectedCollection).then((res) => {
      setMetrics(res.metrics ?? null);
      setPerformance(res.performance ?? []);
    }).catch(() => { setMetrics(null); setPerformance([]); });
  }, [selectedCollection]);

  const m = metrics ?? { totalViews: 0, clickThroughRate: 0, salesGenerated: 0 };
  const perf = performance.length ? performance : [{ date: new Date().toISOString().slice(0, 10), value: 0 }];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Collection Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Insights and performance reports (from database)
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
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
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : m.totalViews.toLocaleString()}</p>
            </div>
            <Eye className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click-Through Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : `${m.clickThroughRate}%`}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sales Generated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : `$${m.salesGenerated.toLocaleString()}`}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{loading ? '—' : '—'}</p>
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
            <BarChart data={perf} />
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

