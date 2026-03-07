import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

export default function NotificationsDashboard() {
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'sms' | 'push' | 'inapp'>('all');
  const [stats, setStats] = useState<Record<string, number | string> | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getDashboard();
      setStats(res.stats ?? null);
      setRecentNotifications(res.recentNotifications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      setStats(null);
      setRecentNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'sent' ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        Sent
      </span>
    ) : (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
        Failed
      </span>
    );
  };

  const filteredRecent =
    selectedType === 'all'
      ? recentNotifications
      : recentNotifications.filter((n) => n.type === selectedType);

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Number(s.totalSent ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Bell className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">{String(s.totalChange ?? '—')}%</span>
            <span className="text-gray-500 dark:text-gray-400">this month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Number(s.deliveryRate ?? 0)}%
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">{String(s.deliveryChange ?? '—')}%</span>
            <span className="text-gray-500 dark:text-gray-400">improvement</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Number(s.failedCount ?? 0)}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-red-600 dark:text-red-400">
              {s.totalSent
                ? (Number(s.failedCount || 0) / Number(s.totalSent) * 100).toFixed(1)
                : '0'}%
            </span>
            <span className="text-gray-500 dark:text-gray-400">failure rate</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {Number(s.scheduledCount ?? 0)}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Pending</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Notifications by Type
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { key: 'emailSent', label: 'Email', icon: Mail },
            { key: 'smsSent', label: 'SMS', icon: MessageSquare },
            { key: 'pushSent', label: 'Push', icon: Smartphone },
            { key: 'inAppSent', label: 'In-App', icon: Bell },
          ].map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Number(s[key as keyof typeof s] ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Notifications
          </h3>
          <div className="flex gap-2">
            {(['all', 'email', 'sms', 'push', 'inapp'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-xl px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedType === type
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filteredRecent.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No notifications from the database. Data from backend.
            </p>
          ) : (
            filteredRecent.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  {getTypeIcon(notification.type)}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {notification.subject}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {notification.recipient} • {notification.sentAt}
                    </p>
                  </div>
                </div>
                {getStatusBadge(notification.status)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
