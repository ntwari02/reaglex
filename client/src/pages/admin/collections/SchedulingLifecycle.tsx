import { useState } from 'react';
import { Calendar, Clock, EyeOff, Save } from 'lucide-react';

export default function SchedulingLifecycle() {
  const [selectedCollection, setSelectedCollection] = useState('1');
  const [scheduledActivation, setScheduledActivation] = useState(false);
  const [activationDate, setActivationDate] = useState('');
  const [activationTime, setActivationTime] = useState('');
  const [scheduledExpiration, setScheduledExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationTime, setExpirationTime] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Scheduling & Lifecycle
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Schedule when collections appear and disappear
        </p>
      </div>

      {/* Collection Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
          Select Collection
        </label>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="1">Summer Sale</option>
          <option value="2">New Arrivals</option>
          <option value="3">Best Sellers</option>
        </select>
      </div>

      {/* Schedule Activation */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Schedule Activation
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Set when this collection becomes active
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={scheduledActivation}
              onChange={(e) => setScheduledActivation(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
        {scheduledActivation && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Activation Date
              </label>
              <input
                type="date"
                value={activationDate}
                onChange={(e) => setActivationDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Activation Time
              </label>
              <input
                type="time"
                value={activationTime}
                onChange={(e) => setActivationTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Schedule Expiration */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Schedule Expiration
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Set when this collection expires
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={scheduledExpiration}
              onChange={(e) => setScheduledExpiration(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
        {scheduledExpiration && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Expiration Time
              </label>
              <input
                type="time"
                value={expirationTime}
                onChange={(e) => setExpirationTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Auto-Hide Rules */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Auto-Hide Rules</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Hide When No Products Match
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically hide collection if no products match rules
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Hide When All Products Out of Stock
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hide collection if all products have zero stock
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
          <Save className="mr-2 inline h-4 w-4" />
          Save Schedule
        </button>
      </div>
    </div>
  );
}

