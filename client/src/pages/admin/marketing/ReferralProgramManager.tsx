import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Gift,
  Ticket,
  Users,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

export default function ReferralProgramManager() {
  const [rewardType, setRewardType] = useState<'cash' | 'points' | 'coupon'>('cash');
  const [rewardAmount, setRewardAmount] = useState(10);
  const [maxReferrals, setMaxReferrals] = useState(10);
  const [fraudDetection, setFraudDetection] = useState(true);
  const [stats, setStats] = useState({ totalReferrals: 0, activeReferrers: 0, rewardsPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminMarketingAPI.getReferralSettings(),
      adminMarketingAPI.getReferralStats(),
    ])
      .then(([settingsRes, statsRes]) => {
        setRewardType((settingsRes.rewardType as 'cash' | 'points' | 'coupon') || 'cash');
        setRewardAmount(settingsRes.rewardAmount ?? 10);
        setMaxReferrals(settingsRes.maxReferralsPerUser ?? 10);
        setFraudDetection(settingsRes.fraudDetection !== false);
        setStats({
          totalReferrals: statsRes.totalReferrals ?? 0,
          activeReferrers: statsRes.activeReferrers ?? 0,
          rewardsPaid: statsRes.rewardsPaid ?? 0,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    adminMarketingAPI
      .updateReferralSettings({ rewardType, rewardAmount, maxReferralsPerUser: maxReferrals, fraudDetection })
      .then(() => {})
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to save'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Referral Program Manager
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure referral settings and track performance
        </p>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Referral Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Reward Type
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { id: 'cash', label: 'Cash', icon: DollarSign },
                { id: 'points', label: 'Points', icon: Gift },
                { id: 'coupon', label: 'Coupon', icon: Ticket },
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setRewardType(type.id as typeof rewardType)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      rewardType === type.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Reward Amount
            </label>
            <input
              type="number"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Maximum Referrals Per User
            </label>
            <input
              type="number"
              value={maxReferrals}
              onChange={(e) => setMaxReferrals(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Fraud Detection</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically detect fraudulent referrals
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={fraudDetection}
                onChange={(e) => setFraudDetection(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Referrals</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalReferrals.toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Referrers</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeReferrers.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rewards Paid</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                ${stats.rewardsPaid.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

