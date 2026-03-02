import {
  Folder,
  CheckCircle,
  Zap,
  Eye,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockStats = {
  totalCollections: 156,
  activeCollections: 142,
  draftCollections: 14,
  automatedCollections: 89,
  manualCollections: 67,
  homepageCollections: 24,
  mostViewed: 'Summer Sale',
};

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

export default function CollectionsDashboard() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Collections</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.totalCollections}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Folder className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.activeCollections}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Automated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.automatedCollections}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Homepage</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.homepageCollections}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Performance Analytics
          </h3>
          <div className="h-64">
            <BarChart data={mockPerformance} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Most Viewed Collections
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Summer Sale', views: 12500, products: 45 },
              { name: 'New Arrivals', views: 9800, products: 32 },
              { name: 'Best Sellers', views: 8700, products: 28 },
            ].map((collection, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {collection.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {collection.products} products
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {collection.views.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

