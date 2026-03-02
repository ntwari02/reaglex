import React, { useState } from 'react';
import {
  Megaphone,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Mail,
  Ticket,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockMetrics = {
  totalCampaigns: 24,
  activeCampaigns: 8,
  totalRevenue: 45230,
  conversionRate: 3.2,
  customerAcquisitionCost: 12.5,
  emailOpenRate: 42.5,
  emailCTR: 12.8,
};

const mockCampaignPerformance = [
  { label: 'Flash Sale', value: 45 },
  { label: 'Black Friday', value: 38 },
  { label: 'Summer Sale', value: 32 },
  { label: 'New Year', value: 28 },
];

export default function MarketingDashboard() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.activeCampaigns}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Megaphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {mockMetrics.totalCampaigns} total
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Marketing Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${mockMetrics.totalRevenue.toLocaleString()}
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
                {mockMetrics.conversionRate}%
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
                ${mockMetrics.customerAcquisitionCost}
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
            <BarChart data={mockCampaignPerformance} />
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
                {mockMetrics.emailOpenRate}%
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
                {mockMetrics.emailCTR}%
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
          {[
            'Best time to send emails: 10 AM - 12 PM',
            'Flash sales perform 45% better on weekends',
            'Segment "High-value customers" has 3.5x conversion rate',
            'Consider running a BOGO campaign for electronics category',
          ].map((insight, index) => (
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

