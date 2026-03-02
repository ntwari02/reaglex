import React, { useState } from 'react';
import {
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  DollarSign,
  Shield,
  Save,
  CheckCircle,
} from 'lucide-react';

export default function MarketingSettings() {
  const [saved, setSaved] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(10000);
  const [spamProtection, setSpamProtection] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Marketing Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure marketing system settings and integrations
        </p>
      </div>

      {/* Email Provider */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Provider (SMTP)</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              SMTP Host
            </label>
            <input
              type="text"
              placeholder="smtp.example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Port
            </label>
            <input
              type="text"
              placeholder="587"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* SMS API */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS API Keys</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              API Secret
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Push Notification Settings
          </h3>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            FCM Key
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Budget Limits */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Limits</h3>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Monthly Campaign Budget Limit
          </label>
          <input
            type="number"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Spam Protection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Spam/Abuse Protection
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prevent spam and abuse in marketing campaigns
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={spamProtection}
              onChange={(e) => setSpamProtection(e.target.checked)}
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

