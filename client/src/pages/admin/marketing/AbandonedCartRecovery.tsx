import React, { useState } from 'react';
import {
  ShoppingCart,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  DollarSign,
  TrendingUp,
  Settings,
} from 'lucide-react';

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

const mockCarts: AbandonedCart[] = [
  {
    id: '1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    items: 3,
    total: 149.99,
    abandonedAt: '2 hours ago',
    remindersSent: 0,
    recovered: false,
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    items: 2,
    total: 89.99,
    abandonedAt: '5 hours ago',
    remindersSent: 1,
    recovered: false,
  },
];

export default function AbandonedCartRecovery() {
  const [carts, setCarts] = useState<AbandonedCart[]>(mockCarts);
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(true);
  const [reminderTiming, setReminderTiming] = useState('1hr');

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

      {/* Abandoned Carts List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
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
                      {cart.abandonedAt}
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
      </div>
    </div>
  );
}

