import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  Download,
  CheckCircle,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, metricCardHover, fadeInUp } from './logisticsAnimations';

export default function LogisticsAnalytics() {
  const [selectedChart, setSelectedChart] = useState<'zones' | 'partners'>('zones');
  const [metrics, setMetrics] = useState<Record<string, number | string> | null>(null);
  const [zoneData, setZoneData] = useState<{ label: string; value: number }[]>([]);
  const [partnerData, setPartnerData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminLogisticsAPI.getAnalytics();
        if (cancelled) return;
        setMetrics(res.metrics ?? null);
        setZoneData(res.zoneData ?? []);
        setPartnerData(res.partnerData ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load analytics');
          setMetrics(null);
          setZoneData([]);
          setPartnerData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = (selectedChart === 'zones' ? zoneData : partnerData).map((d) => ({
    date: d.label,
    value: d.value,
  }));

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics & Reporting</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View logistics insights. Data from backend.
          </p>
        </div>
        <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
          <Download className="mr-2 inline h-4 w-4" />
          Export Report
        </button>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
        >
          {error}
        </motion.p>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <motion.div
              variants={metricCardHover}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Shipments</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics?.totalShipments ?? 0}
                  </p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
                  <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {metrics?.totalChange ?? '—'}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">this month</span>
              </div>
            </motion.div>

            <motion.div
              variants={metricCardHover}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics?.onTimeDeliveryPercent ?? 0}%
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
                  <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {metrics?.onTimeChange ?? '—'}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">improvement</span>
              </div>
            </motion.div>

            <motion.div
              variants={metricCardHover}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Delivery Time</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics?.avgDeliveryTimeDays ?? '—'} days
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {metrics?.failedShipmentsChange ?? '—'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">faster</span>
              </div>
            </motion.div>

            <motion.div
              variants={metricCardHover}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed Shipments</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics?.failedShipments ?? 0}
                  </p>
                </div>
                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-red-600 dark:text-red-400">2.8%</span>
                <span className="text-gray-500 dark:text-gray-400">failure rate</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            {...fadeInUp}
          >
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
              <BarChart data={chartData.length ? chartData : [{ date: 'No data', value: 0 }]} />
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
