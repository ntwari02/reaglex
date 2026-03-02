import React from 'react';
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, RefreshCw, Truck, Star, X } from 'lucide-react';
import { TrendLineChart } from '@/components/charts/TrendLineChart';

interface SellerPerformanceProps {
  sellerId: string;
}

// Mock data
const salesData = [
  { date: '2024-01-01', value: 12000 },
  { date: '2024-01-08', value: 15000 },
  { date: '2024-01-15', value: 18000 },
  { date: '2024-01-22', value: 22000 },
  { date: '2024-01-29', value: 25000 },
  { date: '2024-02-05', value: 28000 },
  { date: '2024-02-12', value: 32000 },
  { date: '2024-02-19', value: 35000 },
  { date: '2024-02-26', value: 38000 },
  { date: '2024-03-05', value: 42000 },
  { date: '2024-03-12', value: 45000 },
];

const forecastData = [
  { date: '2024-03-19', value: 48000, isForecast: true },
  { date: '2024-03-26', value: 50000, isForecast: true },
  { date: '2024-04-02', value: 52000, isForecast: true },
];

const topProducts = [
  { name: 'Wireless Bluetooth Headphones', sales: 1234, revenue: 98720, growth: 12.5 },
  { name: 'Smart Watch Pro', sales: 892, revenue: 178392, growth: 8.3 },
  { name: 'USB-C Cable 2m', sales: 567, revenue: 7356, growth: -2.1 },
  { name: 'Laptop Stand Adjustable', sales: 456, revenue: 22794, growth: 5.7 },
];

const returnReasons = [
  { reason: 'Defective product', count: 45, percentage: 35 },
  { reason: 'Wrong item received', count: 28, percentage: 22 },
  { reason: 'Not as described', count: 25, percentage: 19 },
  { reason: 'Changed mind', count: 18, percentage: 14 },
  { reason: 'Other', count: 12, percentage: 10 },
];

export default function SellerPerformance({ sellerId }: SellerPerformanceProps) {
  const metrics = {
    totalOrders: 1234,
    monthlySales: 45000,
    earnings: 125000,
    returnRate: 3.2,
    cancellationRate: 1.8,
    onTimeDelivery: 96.5,
    productRating: 4.8,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Performance</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Metrics and analytics dashboard</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          icon={ShoppingCart}
          label="Total Orders"
          value={metrics.totalOrders.toLocaleString()}
          change="+12.5%"
          trend="up"
        />
        <MetricCard
          icon={DollarSign}
          label="Monthly Sales"
          value={`$${metrics.monthlySales.toLocaleString()}`}
          change="+8.3%"
          trend="up"
        />
        <MetricCard
          icon={TrendingUp}
          label="Total Earnings"
          value={`$${metrics.earnings.toLocaleString()}`}
          change="+15.2%"
          trend="up"
        />
        <MetricCard
          icon={Star}
          label="Product Rating"
          value={metrics.productRating.toFixed(1)}
          change="+0.2"
          trend="up"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          icon={RefreshCw}
          label="Return Rate"
          value={`${metrics.returnRate}%`}
          change={metrics.returnRate <= 4 ? 'Good' : 'High'}
          trend={metrics.returnRate <= 4 ? 'up' : 'down'}
        />
        <MetricCard
          icon={X}
          label="Cancellation Rate"
          value={`${metrics.cancellationRate}%`}
          change={metrics.cancellationRate <= 3 ? 'Good' : 'High'}
          trend={metrics.cancellationRate <= 3 ? 'up' : 'down'}
        />
        <MetricCard
          icon={Truck}
          label="On-Time Delivery"
          value={`${metrics.onTimeDelivery}%`}
          change={metrics.onTimeDelivery >= 95 ? 'Excellent' : 'Needs improvement'}
          trend={metrics.onTimeDelivery >= 95 ? 'up' : 'down'}
        />
      </div>

      {/* Sales Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sales Over Time</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Monthly sales trend with forecast</p>
        </div>
        <div className="h-[300px]">
          <TrendLineChart
            data={salesData}
            forecastData={forecastData}
            height={300}
            color="from-emerald-500 via-teal-500 to-cyan-500"
            yAxisLabel="Sales ($)"
          />
        </div>
      </div>

      {/* Top Products & Return Reasons */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Top Products</h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</p>
                  </div>
                  <div className="ml-8 mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{product.sales} sales</span>
                    <span>${product.revenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${product.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {product.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(product.growth)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Reasons */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Return Reasons</h3>
          <div className="space-y-3">
            {returnReasons.map((item, index) => (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300">{item.reason}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <div className={`mt-1 flex items-center gap-1 text-xs ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{change}</span>
      </div>
    </div>
  );
}
