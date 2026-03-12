import React, { useState, useEffect } from 'react';
import { BarChart3, Mail, MessageSquare, Smartphone, TrendingUp, Download } from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminNotificationsAPI } from '@/lib/api';

export default function NotificationAnalytics() {
  const [selectedChart, setSelectedChart] = useState<'channel' | 'geo'>('channel');
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [channelData, setChannelData] = useState<{ label: string; value: number }[]>([]);
  const [geoData, setGeoData] = useState<{ label: string; value: number }[]>([]);
  const [failedNotifications, setFailedNotifications] = useState<{ reason: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminNotificationsAPI.getAnalytics();
        setMetrics(res.metrics ?? null);
        setChannelData(res.channelData ?? []);
        setGeoData(res.geoData ?? []);
        setFailedNotifications(res.failedNotifications ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics');
        setMetrics(null);
        setChannelData([]);
        setGeoData([]);
        setFailedNotifications([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = (selectedChart === 'channel' ? channelData : geoData).map((d) => ({
    date: d.label,
    value: d.value,
  }));

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const m = metrics || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track delivery rates, engagement, and performance. Data from backend.
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Open Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{m.emailOpenRate ?? 0}%</p>
            </div>
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">SMS Delivery</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{m.smsDelivery ?? 0}%</p>
            </div>
            <MessageSquare className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click-Through Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{m.clickThroughRate ?? 0}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Push Delivery</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{m.pushDelivery ?? 0}%</p>
            </div>
            <Smartphone className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

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
          <BarChart data={chartData.length ? chartData : [{ date: 'No data', value: 0 }]} />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Failed Notifications
        </h3>
        <div className="space-y-3">
          {failedNotifications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No failed notifications from the database.</p>
          ) : (
            failedNotifications.map((item) => (
              <div
                key={item.reason}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.reason}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{item.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
