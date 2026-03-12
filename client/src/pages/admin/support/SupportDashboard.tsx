import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { adminSupportAPI } from '@/lib/api';
import { staggerContainer, staggerItem, fadeInUp } from './supportAnimations';

const defaultDistribution = {
  ticketsByCategory: [] as { label: string; value: number }[],
  disputesByReason: [] as { label: string; value: number }[],
  frequentProductIssues: [] as { label: string; value: number }[],
  problematicSellers: [] as { label: string; value: number }[],
};

export default function SupportDashboard() {
  const [selectedChart, setSelectedChart] = useState<'tickets' | 'disputes' | 'products' | 'sellers'>('tickets');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalOpenTickets: 0,
    newTicketsToday: 0,
    averageResponseTime: '0 hours',
    pendingDisputes: 0,
    escalatedCases: 0,
    fraudAlerts: 0,
    autoClosedCases: 0,
    satisfactionScore: 0,
  });
  const [realTime, setRealTime] = useState({
    activeChats: 0,
    staffOnline: 0,
    highPriorityCases: 0,
    systemAlerts: 0,
  });
  const [distribution, setDistribution] = useState(defaultDistribution);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminSupportAPI
      .getDashboard()
      .then((res) => {
        if (cancelled) return;
        setMetrics({
          totalOpenTickets: Number(res.metrics.totalOpenTickets) ?? 0,
          newTicketsToday: Number(res.metrics.newTicketsToday) ?? 0,
          averageResponseTime: String(res.metrics.averageResponseTime ?? '0 hours'),
          pendingDisputes: Number(res.metrics.pendingDisputes) ?? 0,
          escalatedCases: Number(res.metrics.escalatedCases) ?? 0,
          fraudAlerts: Number(res.metrics.fraudAlerts) ?? 0,
          autoClosedCases: Number(res.metrics.autoClosedCases) ?? 0,
          satisfactionScore: Number(res.metrics.satisfactionScore) ?? 0,
        });
        setRealTime({
          activeChats: res.realTime?.activeChats ?? 0,
          staffOnline: res.realTime?.staffOnline ?? 0,
          highPriorityCases: res.realTime?.highPriorityCases ?? 0,
          systemAlerts: res.realTime?.systemAlerts ?? 0,
        });
        setDistribution({
          ticketsByCategory: res.distribution?.ticketsByCategory ?? [],
          disputesByReason: res.distribution?.disputesByReason ?? [],
          frequentProductIssues: res.distribution?.frequentProductIssues ?? [],
          problematicSellers: res.distribution?.problematicSellers ?? [],
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getChartData = () => {
    switch (selectedChart) {
      case 'tickets':
        return distribution.ticketsByCategory.length ? distribution.ticketsByCategory : [{ label: 'No data', value: 1 }];
      case 'disputes':
        return distribution.disputesByReason.length ? distribution.disputesByReason : [{ label: 'No data', value: 1 }];
      case 'products':
        return distribution.frequentProductIssues.length ? distribution.frequentProductIssues : [{ label: 'No data', value: 1 }];
      case 'sellers':
        return distribution.problematicSellers.length ? distribution.problematicSellers : [{ label: 'No data', value: 1 }];
      default:
        return distribution.ticketsByCategory.length ? distribution.ticketsByCategory : [{ label: 'No data', value: 1 }];
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-[200px] items-center justify-center"
      >
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-gray-500 dark:text-gray-400"
        >
          Loading dashboard...
        </motion.p>
      </motion.div>
    );
  }
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
      >
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Key Metrics */}
      <motion.div variants={staggerItem} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Open Tickets</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.totalOpenTickets}
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
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">New Tickets Today</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.newTicketsToday}
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
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.averageResponseTime}
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
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Disputes</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.pendingDisputes}
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
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Escalated Cases</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.escalatedCases}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-purple-600 dark:text-purple-400">Requires attention</span>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fraud Alerts</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.fraudAlerts}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/40">
              <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-orange-600 dark:text-orange-400">Action required</span>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto-closed Cases</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.autoClosedCases}
              </p>
            </div>
            <div className="rounded-full bg-teal-100 p-3 dark:bg-teal-900/40">
              <CheckCircle className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-teal-600 dark:text-teal-400">This week</span>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Satisfaction Score</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.satisfactionScore}
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
        </motion.div>
      </motion.div>

      {/* Real-Time Indicators */}
      <motion.div variants={staggerItem} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Live Active Chats</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {realTime.activeChats}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/40">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Staff Online</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {realTime.staffOnline}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">High Priority</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {realTime.highPriorityCases}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">System Alerts</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {realTime.systemAlerts}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Support Distribution Chart */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
      >
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
      </motion.div>
    </motion.div>
  );
}

