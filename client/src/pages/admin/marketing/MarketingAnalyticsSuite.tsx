import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, Mail, Share2, DollarSign } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminMarketingAPI } from '@/lib/api';

export default function MarketingAnalyticsSuite() {
  const [selectedChart, setSelectedChart] = useState<'traffic' | 'revenue'>('traffic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignRevenue, setCampaignRevenue] = useState(0);
  const [emailOpenRate, setEmailOpenRate] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [roas, setRoas] = useState(0);
  const [trafficSources, setTrafficSources] = useState<{ label: string; value: number }[]>([]);
  const [campaignRevenueData, setCampaignRevenueData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    adminMarketingAPI
      .getAnalytics()
      .then((res) => {
        setCampaignRevenue(res.campaignRevenue ?? 0);
        setEmailOpenRate(res.emailOpenRate ?? 0);
        setAdSpend(res.adSpend ?? 0);
        setRoas(res.roas ?? 0);
        setTrafficSources(Array.isArray(res.trafficSources) ? res.trafficSources : []);
        setCampaignRevenueData(Array.isArray(res.campaignRevenueData) ? res.campaignRevenueData : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load analytics'))
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

  const trafficData = trafficSources.length ? trafficSources : [{ label: 'No data', value: 0 }];
  const revenueData = campaignRevenueData.length ? campaignRevenueData : [{ label: 'No data', value: 0 }];

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Campaign Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${campaignRevenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Open Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{emailOpenRate}%</p>
            </div>
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ad Spend</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${adSpend.toLocaleString()}
              </p>
            </div>
            <Share2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ROAS</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{roas}x</p>
            </div>
            <TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

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
            <BarChart data={trafficData} />
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
            <BarChart data={revenueData} />
          </div>
        </div>
      </div>
    </div>
  );
}

