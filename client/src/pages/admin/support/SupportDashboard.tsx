import React, { useState } from 'react';
import {
  Ticket,
  Clock,
  AlertTriangle,
  TrendingUp,
  Shield,
  CheckCircle,
  MessageSquare,
  Users,
  BarChart3,
  Activity,
  Bell,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

// Mock data
const mockMetrics = {
  totalOpenTickets: 142,
  newTicketsToday: 23,
  averageResponseTime: '2.5 hours',
  pendingDisputes: 18,
  escalatedCases: 7,
  fraudAlerts: 3,
  autoClosedCases: 45,
  satisfactionScore: 4.6,
};

const mockRealTime = {
  activeChats: 12,
  staffOnline: 8,
  highPriorityCases: 5,
  systemAlerts: 2,
};

const mockDistributionData = {
  ticketsByCategory: [
    { label: 'Payment', value: 45 },
    { label: 'Delivery', value: 38 },
    { label: 'Product Quality', value: 32 },
    { label: 'Refund', value: 28 },
    { label: 'Technical', value: 15 },
    { label: 'Other', value: 12 },
  ],
  disputesByReason: [
    { label: 'Item Not Received', value: 8 },
    { label: 'Wrong Item', value: 5 },
    { label: 'Not as Described', value: 3 },
    { label: 'Shipping Delay', value: 2 },
  ],
  frequentProductIssues: [
    { label: 'Defective Products', value: 15 },
    { label: 'Wrong Size', value: 12 },
    { label: 'Color Mismatch', value: 8 },
    { label: 'Missing Parts', value: 5 },
  ],
  problematicSellers: [
    { label: 'Seller A', value: 12 },
    { label: 'Seller B', value: 8 },
    { label: 'Seller C', value: 6 },
    { label: 'Seller D', value: 4 },
  ],
};

export default function SupportDashboard() {
  const [selectedChart, setSelectedChart] = useState<'tickets' | 'disputes' | 'products' | 'sellers'>('tickets');

  const getChartData = () => {
    switch (selectedChart) {
      case 'tickets':
        return mockDistributionData.ticketsByCategory;
      case 'disputes':
        return mockDistributionData.disputesByReason;
      case 'products':
        return mockDistributionData.frequentProductIssues;
      case 'sellers':
        return mockDistributionData.problematicSellers;
      default:
        return mockDistributionData.ticketsByCategory;
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Open Tickets</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.totalOpenTickets}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Ticket className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+12%</span>
            <span className="text-gray-500 dark:text-gray-400">from last week</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">New Tickets Today</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.newTicketsToday}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-blue-600 dark:text-blue-400">+5</span>
            <span className="text-gray-500 dark:text-gray-400">since yesterday</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.averageResponseTime}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">-15%</span>
            <span className="text-gray-500 dark:text-gray-400">improvement</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Disputes</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.pendingDisputes}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-red-600 dark:text-red-400">-3</span>
            <span className="text-gray-500 dark:text-gray-400">resolved today</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Escalated Cases</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.escalatedCases}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-purple-600 dark:text-purple-400">Requires attention</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fraud Alerts</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.fraudAlerts}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/40">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-orange-600 dark:text-orange-400">Action required</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto-closed Cases</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.autoClosedCases}
              </p>
            </div>
            <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/40">
              <CheckCircle className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-teal-600 dark:text-teal-400">This week</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Satisfaction Score</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockMetrics.satisfactionScore}
              </p>
            </div>
            <div className="rounded-full bg-cyan-100 p-3 dark:bg-cyan-900/40">
              <BarChart3 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+0.3</span>
            <span className="text-gray-500 dark:text-gray-400">from last month</span>
          </div>
        </div>
      </div>

      {/* Real-Time Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Live Active Chats</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {mockRealTime.activeChats}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/40">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Staff Online</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {mockRealTime.staffOnline}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">High Priority</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {mockRealTime.highPriorityCases}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">System Alerts</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {mockRealTime.systemAlerts}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Distribution Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Support Distribution
          </h3>
          <div className="flex gap-2">
            {(['tickets', 'disputes', 'products', 'sellers'] as const).map((chart) => (
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

