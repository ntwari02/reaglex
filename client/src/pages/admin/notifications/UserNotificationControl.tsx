import React, { useState, useEffect } from 'react';
import { Users, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

export default function UserNotificationControl() {
  const [customerSettings, setCustomerSettings] = useState<Record<string, boolean>>({});
  const [sellerSettings, setSellerSettings] = useState<Record<string, boolean>>({});
  const [channelPreferences, setChannelPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getUserControlSettings();
      setCustomerSettings(res.customerSettings ?? {});
      setSellerSettings(res.sellerSettings ?? {});
      setChannelPreferences(res.channelPreferences ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setError(null);
    try {
      await adminNotificationsAPI.updateUserControlSettings({
        customerSettings,
        sellerSettings,
        channelPreferences,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Notification Control</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage notification preferences for customers and sellers. Data from backend.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Settings</h3>
        </div>
        <div className="space-y-4">
          {(['orderUpdates', 'promotions', 'feedbackReminders'] as const).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={customerSettings[key] ?? false}
                  onChange={(e) =>
                    setCustomerSettings((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seller Settings</h3>
        </div>
        <div className="space-y-4">
          {(['newOrderAlerts', 'paymentAlerts', 'accountStatusUpdates'] as const).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sellerSettings[key] ?? false}
                  onChange={(e) =>
                    setSellerSettings((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Channel Preferences
        </h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email', icon: Mail },
            { key: 'sms', label: 'SMS', icon: MessageSquare },
            { key: 'push', label: 'Push Notifications', icon: Smartphone },
          ].map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.key}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {channel.label}
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={channelPreferences[channel.key] ?? false}
                    onChange={(e) =>
                      setChannelPreferences((prev) => ({
                        ...prev,
                        [channel.key]: e.target.checked,
                      }))
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`rounded-xl px-8 py-3 text-sm font-semibold shadow-lg ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:shadow-xl'
          }`}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
