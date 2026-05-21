import React, { useState, useEffect, useMemo } from 'react';
import { Mail, MessageSquare, Smartphone, Sparkles, Clock, Pause, Play } from 'lucide-react';
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

const DEFAULT_STRATEGY = {
  enabled: true,
  autoReminderEnabled: true,
  delayValue: 1,
  delayUnit: 'hour' as string,
  cooldownPeriod: '24h',
  smartMode: true,
  mode: 'smart' as 'manual' | 'smart' | 'hybrid',
  enableSmartTiming: true,
  aiOptimizationEnabled: true,
  maxReminders: 3,
  incentives: {
    dynamicCoupon: true,
    freeShipping: false,
    urgencyBadge: true,
    loyaltyRewards: false,
  },
  globalPause: false,
  quietHours: { enabled: true, start: '22:00', end: '07:00' },
  timezoneMode: 'auto_detect' as 'auto_detect' | 'utc',
  respectBuyerPreferences: true,
  recoverySteps: [
    { step: 1, channel: 'email', delayMinutes: 15, label: 'Reminder 1' },
    { step: 2, channel: 'email', delayMinutes: 120, label: 'Reminder 2' },
    { step: 3, channel: 'email', delayMinutes: 1440, label: 'Reminder 3' },
    { step: 4, channel: 'sms', delayMinutes: 4320, label: 'Reminder 4' },
  ],
  hybridBounds: [
    { step: 1, minMinutes: 10, maxMinutes: 30 },
    { step: 2, minMinutes: 60, maxMinutes: 360 },
    { step: 3, minMinutes: 1440, maxMinutes: 2880 },
  ],
  globalRules: {
    pauseReminders: false,
    paymentProviderDown: false,
    blackFridayBoost: false,
    categoryRecoveryRules: [],
    cartValueRules: [],
  },
  journey: { nodes: [], edges: [], conditions: [] },
};

function formatAbandonedAt(date: string | Date): string {
  if (!date) return '—';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return d.toLocaleDateString();
}

function minutesLabel(m: number) {
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

export default function AbandonedCartRecovery() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [strategy, setStrategy] = useState<any>(DEFAULT_STRATEGY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [simDelay, setSimDelay] = useState(60);
  const [prediction, setPrediction] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState(0);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminMarketingAPI.getAbandonedCarts(),
      adminMarketingAPI.getCartRecoverySettings(),
      adminMarketingAPI.getCartRecoveryAnalytics(30),
    ])
      .then(([cartsRes, settingsRes, analyticsRes]) => {
        setCarts(cartsRes.carts || []);
        const s = settingsRes.settings || {};
        setStrategy({
          ...DEFAULT_STRATEGY,
          ...s,
          autoReminderEnabled: s.enabled !== false,
          mode: s.smartMode ? 'smart' : 'manual',
          enableSmartTiming: s.aiOptimizationEnabled !== false,
        });
        setPendingQueue(settingsRes.pendingQueueJobs ?? 0);
        setAnalytics(analyticsRes.analytics || null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSaveMessage(null);
    const payload = {
      enabled: strategy.enabled !== false && strategy.autoReminderEnabled !== false,
      delayValue: strategy.delayValue ?? 1,
      delayUnit: strategy.delayUnit ?? 'hour',
      maxReminders: strategy.maxReminders ?? 3,
      cooldownPeriod: strategy.cooldownPeriod ?? '24h',
      smartMode: strategy.mode === 'smart' || strategy.mode === 'hybrid' || strategy.smartMode,
      aiOptimizationEnabled: strategy.enableSmartTiming !== false,
      recoverySteps: (strategy.recoverySteps || []).map((step: any, idx: number) => ({
        step: step.step || idx + 1,
        delayValue: step.delayValue ?? Math.max(1, Math.round((step.delayMinutes || 60) / 60)),
        delayUnit: step.delayUnit || (step.delayMinutes >= 1440 ? 'days' : step.delayMinutes >= 60 ? 'hours' : 'minutes'),
        label: step.label,
        template: step.template || (idx === 0 ? 'waiting' : idx === 1 ? 'low_stock' : 'discount'),
        channel: step.channel || 'email',
      })),
      quietHours: strategy.quietHours,
      respectBuyerPreferences: strategy.respectBuyerPreferences,
      incentives: strategy.incentives,
      globalPause: Boolean(strategy.globalRules?.pauseReminders || strategy.globalPause),
    };
    adminMarketingAPI
      .updateCartRecoverySettings(payload)
      .then((res) => {
        setStrategy({ ...DEFAULT_STRATEGY, ...(res.settings || {}) });
        setSaveMessage(res.message || 'Settings saved. Queue rescheduled.');
        setPendingQueue(0);
        return adminMarketingAPI.getCartRecoveryAnalytics(30);
      })
      .then((res) => setAnalytics(res.analytics))
      .catch((e) => setError(e instanceof Error ? e.message : 'Save failed'))
      .finally(() => setSaving(false));
  };

  const runSimulate = () => {
    adminMarketingAPI
      .simulateCartRecovery({
        delayMinutes: simDelay,
        cartTotalUsd: 120,
        strategyOverrides: { mode: strategy.mode, maxReminders: strategy.maxReminders },
      })
      .then((res) => {
        setPrediction(res.prediction);
        setEstimate(res.estimate);
      })
      .catch(() => {
        setPrediction(null);
        setEstimate(null);
      });
  };

  useEffect(() => {
    const t = setTimeout(runSimulate, 400);
    return () => clearTimeout(t);
  }, [simDelay, strategy.mode, strategy.maxReminders]);

  const journeyNodes = useMemo(
    () => (Array.isArray(strategy.journey?.nodes) ? strategy.journey.nodes : []),
    [strategy.journey]
  );

  const updateStep = (index: number, patch: Record<string, unknown>) => {
    const steps = [...(strategy.recoverySteps || [])];
    steps[index] = { ...steps[index], ...patch };
    setStrategy({ ...strategy, recoverySteps: steps });
  };

  const addStep = () => {
    const steps = [...(strategy.recoverySteps || [])];
    steps.push({
      step: steps.length + 1,
      channel: 'email',
      delayMinutes: 1440,
      label: `Reminder ${steps.length + 1}`,
    });
    setStrategy({ ...strategy, recoverySteps: steps, maxReminders: Math.max(strategy.maxReminders, steps.length) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Abandoned Cart Recovery</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Queue-based recovery — admin settings are the single source of truth. Worker runs every minute.
        </p>
        {pendingQueue > 0 && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            {pendingQueue} reminder(s) scheduled in queue
          </p>
        )}
      </div>

      {saveMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {saveMessage}
        </div>
      )}

      {analytics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Recovered Revenue', value: `$${analytics.recoveredRevenue?.toLocaleString() || 0}` },
            { label: 'Recovery Rate', value: `${analytics.recoveryRate || 0}%` },
            { label: 'Emails Sent', value: analytics.emailsSent ?? 0 },
            { label: 'Open Rate', value: `${analytics.openRate || 0}%` },
            { label: 'Cart Value', value: `$${analytics.cartValue?.toLocaleString() || 0}` },
            { label: 'AI Suggested Time', value: analytics.aiSuggestedTime || '—' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Recovery Strategy */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recovery Strategy</h3>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={strategy.autoReminderEnabled !== false}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  enabled: e.target.checked,
                  autoReminderEnabled: e.target.checked,
                })
              }
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full dark:bg-gray-700" />
          </label>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              First reminder delay
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={strategy.delayValue ?? 1}
                onChange={(e) => setStrategy({ ...strategy, delayValue: Number(e.target.value) })}
                className="w-20 rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <select
                value={strategy.delayUnit ?? 'hour'}
                onChange={(e) => setStrategy({ ...strategy, delayUnit: e.target.value })}
                className="flex-1 rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Cooldown between reminders
            </label>
            <input
              type="text"
              value={strategy.cooldownPeriod ?? '24h'}
              onChange={(e) => setStrategy({ ...strategy, cooldownPeriod: e.target.value })}
              placeholder="24h"
              className="w-full rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Mode</p>
            <div className="space-y-1 text-sm">
              {(['manual', 'smart', 'hybrid'] as const).map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={strategy.mode === m}
                    onChange={() => setStrategy({ ...strategy, mode: m })}
                  />
                  <span className="capitalize text-gray-800 dark:text-gray-200">
                    {m === 'smart' ? 'Smart AI' : m}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Max reminders
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={strategy.maxReminders ?? 5}
              onChange={(e) => setStrategy({ ...strategy, maxReminders: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {strategy.mode === 'smart' && (
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={strategy.enableSmartTiming !== false}
                  onChange={(e) => setStrategy({ ...strategy, enableSmartTiming: e.target.checked })}
                />
                <Sparkles className="h-3 w-3" /> Enable Smart Timing
              </label>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Quiet hours</p>
            <label className="mb-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={strategy.quietHours?.enabled !== false}
                onChange={(e) =>
                  setStrategy({
                    ...strategy,
                    quietHours: { ...strategy.quietHours, enabled: e.target.checked },
                  })
                }
              />
              Never send during quiet hours
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={strategy.quietHours?.start || '22:00'}
                onChange={(e) =>
                  setStrategy({
                    ...strategy,
                    quietHours: { ...strategy.quietHours, start: e.target.value },
                  })
                }
                className="flex-1 rounded-lg border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="time"
                value={strategy.quietHours?.end || '07:00'}
                onChange={(e) =>
                  setStrategy({
                    ...strategy,
                    quietHours: { ...strategy.quietHours, end: e.target.value },
                  })
                }
                className="flex-1 rounded-lg border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">Timezone: Auto-detect (buyer locale)</p>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={strategy.respectBuyerPreferences !== false}
                onChange={(e) => setStrategy({ ...strategy, respectBuyerPreferences: e.target.checked })}
              />
              Respect buyer notification preferences
            </label>
          </div>
        </div>

        {/* Manual / hybrid steps */}
        {strategy.mode !== 'smart' && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {strategy.mode === 'hybrid' ? 'Hybrid bounds & manual steps' : 'Manual reminder schedule'}
              </p>
              <button type="button" onClick={addStep} className="text-xs font-semibold text-emerald-600">
                + Add step
              </button>
            </div>
            <div className="space-y-2">
              {(strategy.recoverySteps || []).map((step: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <span className="text-xs font-bold text-gray-500">#{step.step || idx + 1}</span>
                  <input
                    type="number"
                    value={step.delayMinutes}
                    onChange={(e) => updateStep(idx, { delayMinutes: Number(e.target.value) })}
                    className="w-20 rounded-lg border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                    title="Delay minutes"
                  />
                  <span className="text-xs text-gray-400">{minutesLabel(step.delayMinutes)}</span>
                  {strategy.mode === 'hybrid' && (
                    <>
                      <input
                        type="number"
                        placeholder="min"
                        value={strategy.hybridBounds?.[idx]?.minMinutes ?? ''}
                        onChange={(e) => {
                          const bounds = [...(strategy.hybridBounds || [])];
                          bounds[idx] = {
                            step: idx + 1,
                            minMinutes: Number(e.target.value),
                            maxMinutes: bounds[idx]?.maxMinutes ?? 60,
                          };
                          setStrategy({ ...strategy, hybridBounds: bounds });
                        }}
                        className="w-16 rounded-lg border px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="max"
                        value={strategy.hybridBounds?.[idx]?.maxMinutes ?? ''}
                        onChange={(e) => {
                          const bounds = [...(strategy.hybridBounds || [])];
                          bounds[idx] = {
                            step: idx + 1,
                            minMinutes: bounds[idx]?.minMinutes ?? 10,
                            maxMinutes: Number(e.target.value),
                          };
                          setStrategy({ ...strategy, hybridBounds: bounds });
                        }}
                        className="w-16 rounded-lg border px-2 py-1 text-xs"
                      />
                    </>
                  )}
                  <select
                    value={step.channel || 'email'}
                    onChange={(e) => updateStep(idx, { channel: e.target.value })}
                    className="rounded-lg border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency pause */}
        <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <input
              type="checkbox"
              checked={Boolean(strategy.globalRules?.pauseReminders)}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  globalRules: { ...strategy.globalRules, pauseReminders: e.target.checked },
                })
              }
            />
            <Pause className="h-3 w-3" /> Pause all cart reminders
          </label>
          <label className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <input
              type="checkbox"
              checked={Boolean(strategy.globalRules?.paymentProviderDown)}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  globalRules: { ...strategy.globalRules, paymentProviderDown: e.target.checked },
                })
              }
            />
            Payment provider down
          </label>
          <label className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <input
              type="checkbox"
              checked={Boolean(strategy.globalRules?.blackFridayBoost)}
              onChange={(e) =>
                setStrategy({
                  ...strategy,
                  globalRules: { ...strategy.globalRules, blackFridayBoost: e.target.checked },
                })
              }
            />
            Black Friday boost
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save strategy'}
          </button>
        </div>
      </div>

      {/* Simulator */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Clock className="h-4 w-4 text-emerald-500" />
          Send-Time Simulator
        </h3>
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs text-gray-500">Test delay (minutes)</label>
          <input
            type="range"
            min={15}
            max={2880}
            step={15}
            value={simDelay}
            onChange={(e) => setSimDelay(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-bold text-gray-900 dark:text-white">{minutesLabel(simDelay)}</span>
        </div>
        {estimate?.message && (
          <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {estimate.message}
          </p>
        )}
        {prediction && (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">Expected open</p>
              <p className="text-xl font-bold text-emerald-600">{prediction.expectedOpenPercent}%</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">Expected recovery</p>
              <p className="text-xl font-bold">{prediction.expectedRecoveryPercent}%</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">Spam risk</p>
              <p className="text-xl font-bold capitalize">{prediction.spamRisk}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">Quiet hours</p>
              <p className="text-sm font-semibold">{prediction.quietHoursActive ? 'Protected' : 'Off'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Journey builder (visual list) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Recovery Journey</h3>
        <p className="mb-4 text-xs text-gray-500">
          Cart Abandoned → waits → conditions → email/SMS → coupon. Saved with strategy.
        </p>
        <div className="space-y-2">
          {journeyNodes.length === 0 ? (
            <p className="text-sm text-gray-500">Default journey loads from server on first save.</p>
          ) : (
            journeyNodes.map((n: any) => (
              <div
                key={n.id}
                className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800"
              >
                <Play className="h-3 w-3 text-emerald-500" />
                <span className="font-medium capitalize">{n.type}</span>
                <span className="text-gray-500">{n.label}</span>
                {n.waitMinutes != null && (
                  <span className="text-xs text-gray-400">wait {minutesLabel(n.waitMinutes)}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Carts table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading abandoned carts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Abandoned</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Reminders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {carts.map((cart) => (
                  <tr key={cart.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{cart.customerName}</p>
                      <p className="text-xs text-gray-500">{cart.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{cart.items}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${cart.total}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatAbandonedAt(cart.abandonedAt)}</td>
                    <td className="px-6 py-4 text-sm">{cart.remindersSent}</td>
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
