import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  DollarSign,
  TrendingUp,
  Target,
  Mail,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminMarketingAPI } from '@/lib/api';

export default function MarketingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRevenue: 0,
    conversionRate: 0,
    customerAcquisitionCost: 0,
    emailOpenRate: 0,
    emailCTR: 0,
  });
  const [campaignPerformance, setCampaignPerformance] = useState<{ label: string; value: number }[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    adminMarketingAPI
      .getDashboard()
      .then((res) => {
        setMetrics(res.metrics || ({} as typeof metrics));
        setCampaignPerformance(Array.isArray(res.campaignPerformance) ? res.campaignPerformance : []);
        setInsights(Array.isArray(res.insights) ? res.insights : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.activeCampaigns}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Megaphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {metrics.totalCampaigns} total
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Marketing Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${metrics.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+18%</span>
            <span className="text-gray-500 dark:text-gray-400">this month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.conversionRate}%
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+0.5%</span>
            <span className="text-gray-500 dark:text-gray-400">improvement</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">CAC</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${metrics.customerAcquisitionCost}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">-15%</span>
            <span className="text-gray-500 dark:text-gray-400">reduction</span>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Campaign Performance
          </h3>
          <div className="h-64">
            <BarChart data={campaignPerformance.length ? campaignPerformance : [{ label: 'No data', value: 0 }]} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Email Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Open Rate</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.emailOpenRate}%
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Click-Through Rate
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.emailCTR}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

