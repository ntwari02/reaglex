import React, { useState } from 'react';
import { BarChart3, Mail, MessageSquare, Smartphone, TrendingUp, Download } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockChannelData = [
  { label: 'Email', value: 85 },
  { label: 'SMS', value: 72 },
  { label: 'Push', value: 45 },
  { label: 'In-App', value: 38 },
];

const mockGeoData = [
  { label: 'US', value: 45 },
  { label: 'UK', value: 32 },
  { label: 'CA', value: 28 },
  { label: 'AU', value: 15 },
];

export default function NotificationAnalytics() {
  const [selectedChart, setSelectedChart] = useState<'channel' | 'geo'>('channel');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track delivery rates, engagement, and performance
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Open Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">42.5%</p>
            </div>
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">SMS Delivery</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">98.2%</p>
            </div>
            <MessageSquare className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click-Through Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">12.8%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Push Delivery</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">94.5%</p>
            </div>
            <Smartphone className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics</h3>
          <div className="flex gap-2">
            {(['channel', 'geo'] as const).map((chart) => (
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
            data={selectedChart === 'channel' ? mockChannelData : mockGeoData}
          />
        </div>
      </div>

      {/* Failed Notifications */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Failed Notifications
        </h3>
        <div className="space-y-3">
          {[
            { reason: 'SMS blocked', count: 45 },
            { reason: 'Email bounced', count: 32 },
            { reason: 'Push token expired', count: 18 },
          ].map((item) => (
            <div
              key={item.reason}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">{item.reason}</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

