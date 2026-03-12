import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  items: number;
  total: number;
  abandonedAt: string;
  remindersSent: number;
  recovered: boolean;
}

function formatAbandonedAt(date: string | Date): string {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return d.toLocaleDateString();
}

export default function AbandonedCartRecovery() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(true);
  const [reminderTiming, setReminderTiming] = useState('1hr');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadCarts = () => {
    adminMarketingAPI.getAbandonedCarts().then((res) => setCarts(res.carts || [])).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminMarketingAPI.getAbandonedCarts(),
      adminMarketingAPI.getAbandonedCartSettings(),
    ])
      .then(([cartsRes, settingsRes]) => {
        setCarts(cartsRes.carts || []);
        setAutoReminderEnabled(settingsRes.autoReminderEnabled !== false);
        setReminderTiming(settingsRes.reminderTiming || '1hr');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSettingsSave = () => {
    setSavingSettings(true);
    adminMarketingAPI
      .updateAbandonedCartSettings({ autoReminderEnabled, reminderTiming })
      .then(() => {})
      .finally(() => setSavingSettings(false));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Abandoned Cart Recovery
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recover lost sales with automated reminders
        </p>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Automated Reminders
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Send automatic reminders to recover abandoned carts
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoReminderEnabled}
              onChange={(e) => setAutoReminderEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
        {autoReminderEnabled && (
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Reminder Timing
              </label>
              <select
                value={reminderTiming}
                onChange={(e) => setReminderTiming(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="15min">15 minutes</option>
                <option value="1hr">1 hour</option>
                <option value="24hr">24 hours</option>
                <option value="48hr">48 hours</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSettingsSave}
                disabled={savingSettings}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save settings'}
              </button>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Mail className="mr-1 inline h-4 w-4" />
                Email
              </button>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <MessageSquare className="mr-1 inline h-4 w-4" />
                SMS
              </button>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Smartphone className="mr-1 inline h-4 w-4" />
                Push
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {/* Abandoned Carts List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading abandoned carts...</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Abandoned
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Reminders
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {carts.map((cart) => (
                <tr
                  key={cart.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {cart.customerName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cart.customerEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cart.items}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${cart.total}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatAbandonedAt(cart.abandonedAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {cart.remindersSent}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

