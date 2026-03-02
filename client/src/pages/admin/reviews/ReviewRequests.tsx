import React, { useState } from 'react';
import { Mail, Settings, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

export default function ReviewRequests() {
  const [autoRequestEnabled, setAutoRequestEnabled] = useState(true);
  const [delayDays, setDelayDays] = useState(3);
  const [conversionRate, setConversionRate] = useState(12.5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Requests</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage automated review reminder system
        </p>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Automated Review Requests
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Send review requests after product delivery
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoRequestEnabled}
              onChange={(e) => setAutoRequestEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>

        {autoRequestEnabled && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Delay After Delivery
              </label>
              <select
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Requests Sent</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">12,450</p>
            </div>
            <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reviews Received</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">1,556</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {conversionRate}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

