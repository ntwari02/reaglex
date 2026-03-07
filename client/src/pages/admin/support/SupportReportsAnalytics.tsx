import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, TrendingUp, Clock, FileText } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminSupportAPI } from '@/lib/api';
import { pageTransition } from './supportAnimations';

export default function SupportReportsAnalytics() {
  const [selectedReport, setSelectedReport] = useState<'tickets' | 'response' | 'issues'>('tickets');
  const [dateRange, setDateRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalTickets: number;
    avgResponseTimeHours: number;
    ticketVolume: { label: string; value: number }[];
    responseTimeByWeek: { label: string; value: number }[];
    commonIssues: { label: string; value: number }[];
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminSupportAPI
      .getReportsAnalytics({ dateRange })
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [dateRange]);

  const getChartData = () => {
    if (!data) return [];
    switch (selectedReport) {
      case 'tickets':
        return data.ticketVolume?.length ? data.ticketVolume : [{ label: 'No data', value: 1 }];
      case 'response':
        return data.responseTimeByWeek?.length ? data.responseTimeByWeek : [{ label: 'No data', value: 1 }];
      case 'issues':
        return data.commonIssues?.length ? data.commonIssues : [{ label: 'No data', value: 1 }];
      default:
        return data.ticketVolume?.length ? data.ticketVolume : [];
    }
  };

  return (
    <motion.div
      className="min-h-screen space-y-6 pb-8"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View support insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
      ) : (
      <>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{data?.totalTickets ?? 0}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+12%</span>
            <span className="text-gray-500 dark:text-gray-400">from last period</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{data?.avgResponseTimeHours ?? 0}h</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Resolution Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">87%</p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+3%</span>
            <span className="text-gray-500 dark:text-gray-400">from last period</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Satisfaction Score</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">4.6</p>
            </div>
            <div className="rounded-full bg-cyan-100 p-3 dark:bg-cyan-900/40">
              <BarChart3 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+0.2</span>
            <span className="text-gray-500 dark:text-gray-400">from last period</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics</h3>
          <div className="flex gap-2">
            {(['tickets', 'response', 'issues'] as const).map((report) => (
              <button
                key={report}
                onClick={() => setSelectedReport(report)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedReport === report
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {report.charAt(0).toUpperCase() + report.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-96 min-h-[400px]">
          <BarChart data={getChartData()} />
        </div>
      </div>

      {/* Export Options */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <FileText className="mb-3 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Export Tickets</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Download all ticket data as CSV or PDF
          </p>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Export
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <FileText className="mb-3 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Export Disputes</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Download dispute resolution reports
          </p>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Export
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <FileText className="mb-3 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Performance Report</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Generate comprehensive performance analytics
          </p>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Generate
          </button>
        </div>
      </div>
      </>
      )}
    </motion.div>
  );
}

