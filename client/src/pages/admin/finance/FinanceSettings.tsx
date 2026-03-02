import React, { useState } from 'react';
import { Settings, Save, DollarSign, Percent, CreditCard, Shield } from 'lucide-react';

export default function FinanceSettings() {
  const [settings, setSettings] = useState({
    currency: 'USD',
    globalCommissionRate: 10,
    enableVat: true,
    vatRate: 10,
    minimumWithdrawal: 50,
    automaticPayoutSchedule: 'weekly',
    enableFraudChecks: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Finance Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure financial operations and rules</p>
      </div>

      <div className="space-y-6">
        {/* Currency */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Currency</h3>
          </div>
          <select
            value={settings.currency}
            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="NGN">NGN - Nigerian Naira</option>
            <option value="KES">KES - Kenyan Shilling</option>
          </select>
        </div>

        {/* Commission Rates */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <Percent className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Commission Rates</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Global Commission Rate (%)
              </label>
              <input
                type="number"
                value={settings.globalCommissionRate}
                onChange={(e) => setSettings({ ...settings, globalCommissionRate: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
              Set Seller-Specific Commissions
            </button>
          </div>
        </div>

        {/* VAT Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">VAT Settings</h3>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.enableVat}
                onChange={(e) => setSettings({ ...settings, enableVat: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
          {settings.enableVat && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">VAT Rate (%)</label>
              <input
                type="number"
                value={settings.vatRate}
                onChange={(e) => setSettings({ ...settings, vatRate: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Payout Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payout Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Minimum Withdrawal Amount
              </label>
              <input
                type="number"
                value={settings.minimumWithdrawal}
                onChange={(e) => setSettings({ ...settings, minimumWithdrawal: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Automatic Payout Schedule
              </label>
              <select
                value={settings.automaticPayoutSchedule}
                onChange={(e) => setSettings({ ...settings, automaticPayoutSchedule: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fraud Checks */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fraud Checks</h3>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.enableFraudChecks}
                onChange={(e) => setSettings({ ...settings, enableFraudChecks: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40">
            <Save className="h-4 w-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

