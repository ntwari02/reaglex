import React, { useState } from 'react';
import { Settings, MapPin, Package, DollarSign, TrendingUp, CheckCircle, Save, Zap } from 'lucide-react';

export default function AutomationSettings() {
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [autoAssignMethod, setAutoAssignMethod] = useState('performance');
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Automation Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure automated logistics operations
        </p>
      </div>

      {/* Auto-Assign Courier */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto-Assign Courier
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically assign delivery partner based on rules
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoAssignEnabled}
              onChange={(e) => setAutoAssignEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>

        {autoAssignEnabled && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Assignment Method
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => setAutoAssignMethod('location')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  autoAssignMethod === 'location'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">By Location</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Assign based on delivery location
                  </p>
                </div>
              </button>

              <button
                onClick={() => setAutoAssignMethod('weight')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  autoAssignMethod === 'weight'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">By Weight</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Assign based on package weight
                  </p>
                </div>
              </button>

              <button
                onClick={() => setAutoAssignMethod('cost')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  autoAssignMethod === 'cost'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">By Cost</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Assign based on lowest cost
                  </p>
                </div>
              </button>

              <button
                onClick={() => setAutoAssignMethod('performance')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  autoAssignMethod === 'performance'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">By Performance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Assign to best performing partner
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-Approve Orders */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto-Approve Ready-to-Ship Orders
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically approve orders that are ready for shipment
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoApproveEnabled}
              onChange={(e) => setAutoApproveEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* Auto-Notify Customers */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Auto-Notify Customers
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically send shipment updates to customers
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoNotifyEnabled}
              onChange={(e) => setAutoNotifyEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          {saved ? (
            <>
              <CheckCircle className="mr-2 inline h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 inline h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

