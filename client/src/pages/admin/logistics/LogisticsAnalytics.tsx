import React, { useState } from 'react';
import { BarChart3, TrendingUp, Clock, Package, Truck, AlertTriangle, Download, CheckCircle } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockZoneData = [
  { label: 'Local', value: 45 },
  { label: 'National', value: 38 },
  { label: 'International', value: 22 },
];

const mockPartnerData = [
  { label: 'FedEx', value: 35 },
  { label: 'DHL', value: 28 },
  { label: 'In-House', value: 20 },
  { label: 'Local Courier', value: 17 },
];

export default function LogisticsAnalytics() {
  const [selectedChart, setSelectedChart] = useState<'zones' | 'partners'>('zones');

  const getChartData = () => {
    return selectedChart === 'zones' ? mockZoneData : mockPartnerData;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics & Reporting</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View logistics insights and performance metrics
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Shipments</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">3,127</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+15%</span>
            <span className="text-gray-500 dark:text-gray-400">this month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">91.2%</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+2.3%</span>
            <span className="text-gray-500 dark:text-gray-400">improvement</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Delivery Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">2.1 days</p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">-0.3 days</span>
            <span className="text-gray-500 dark:text-gray-400">faster</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed Shipments</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">87</p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-red-600 dark:text-red-400">2.8%</span>
            <span className="text-gray-500 dark:text-gray-400">failure rate</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribution</h3>
          <div className="flex gap-2">
            {(['zones', 'partners'] as const).map((chart) => (
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
          <BarChart data={getChartData()} />
        </div>
      </div>
    </div>
  );
}

