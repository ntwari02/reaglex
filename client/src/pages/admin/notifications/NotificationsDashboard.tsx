import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const mockStats = {
  totalSent: 45230,
  emailSent: 28450,
  smsSent: 12340,
  pushSent: 3840,
  inAppSent: 600,
  deliveryRate: 96.5,
  failedCount: 1580,
};

const mockRecentNotifications = [
  {
    id: '1',
    type: 'email',
    recipient: 'john@example.com',
    subject: 'Order Confirmation',
    status: 'sent',
    sentAt: '2 minutes ago',
  },
  {
    id: '2',
    type: 'sms',
    recipient: '+1234567890',
    subject: 'Order Shipped',
    status: 'sent',
    sentAt: '5 minutes ago',
  },
  {
    id: '3',
    type: 'push',
    recipient: 'User Device',
    subject: 'Flash Sale Alert',
    status: 'failed',
    sentAt: '10 minutes ago',
  },
];

export default function NotificationsDashboard() {
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'sms' | 'push' | 'inapp'>(
    'all'
  );

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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.totalSent.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Bell className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+12%</span>
            <span className="text-gray-500 dark:text-gray-400">this month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Delivery Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.deliveryRate}%
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">+2.3%</span>
            <span className="text-gray-500 dark:text-gray-400">improvement</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.failedCount}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-red-600 dark:text-red-400">3.5%</span>
            <span className="text-gray-500 dark:text-gray-400">failure rate</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">24</p>
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

      {/* Notifications by Type */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Notifications by Type
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {mockStats.emailSent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">SMS</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {mockStats.smsSent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Push</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {mockStats.pushSent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">In-App</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {mockStats.inAppSent.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
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
          {mockRecentNotifications
            .filter((n) => selectedType === 'all' || n.type === selectedType)
            .map((notification) => (
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
            ))}
        </div>
      </div>
    </div>
  );
}

