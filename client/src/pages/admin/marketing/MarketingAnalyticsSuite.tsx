import React, { useState } from 'react';
import { BarChart3, TrendingUp, Download, Mail, Share2, Ticket, Users } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockTrafficSources = [
  { label: 'Organic', value: 45 },
  { label: 'Social Media', value: 28 },
  { label: 'Email', value: 15 },
  { label: 'Direct', value: 12 },
];

const mockCampaignRevenue = [
  { label: 'Flash Sale', value: 12500 },
  { label: 'Black Friday', value: 18900 },
  { label: 'Summer Sale', value: 8200 },
  { label: 'New Year', value: 5600 },
];

export default function MarketingAnalyticsSuite() {
  const [selectedChart, setSelectedChart] = useState<'traffic' | 'revenue'>('traffic');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Marketing Analytics Suite
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete analytics for all marketing efforts
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Campaign Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">$45,230</p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Open Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">42.5%</p>
            </div>
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ad Spend</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">$8,200</p>
            </div>
            <Share2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ROAS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">5.5x</p>
            </div>
            <TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Traffic Sources</h3>
            <button
              onClick={() => setSelectedChart('traffic')}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                selectedChart === 'traffic'
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Traffic
            </button>
          </div>
          <div className="h-64">
            <BarChart data={mockTrafficSources} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Campaign Revenue
            </h3>
            <button
              onClick={() => setSelectedChart('revenue')}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                selectedChart === 'revenue'
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Revenue
            </button>
          </div>
          <div className="h-64">
            <BarChart data={mockCampaignRevenue} />
          </div>
        </div>
      </div>
    </div>
  );
}

