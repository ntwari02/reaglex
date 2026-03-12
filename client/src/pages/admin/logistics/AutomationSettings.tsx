import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  MapPin,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Save,
} from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, scaleIn } from './logisticsAnimations';

export default function AutomationSettings() {
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [autoAssignMethod, setAutoAssignMethod] = useState('performance');
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminLogisticsAPI.getAutomationSettings();
        const s = res.settings;
        if (s) {
          setAutoAssignEnabled(s.autoAssignEnabled ?? true);
          setAutoAssignMethod(s.autoAssignMethod ?? 'performance');
          setAutoApproveEnabled(s.autoApproveEnabled ?? false);
          setAutoNotifyEnabled(s.autoNotifyEnabled ?? true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setError(null);
    try {
      await adminLogisticsAPI.updateAutomationSettings({
        autoAssignEnabled,
        autoAssignMethod,
        autoApproveEnabled,
        autoNotifyEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Automation Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure automated logistics operations. Data from backend.
        </p>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
        >
          {error}
        </motion.p>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : (
        <>
          <motion.div
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            {...scaleIn}
          >
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
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
              </label>
            </div>

            {autoAssignEnabled && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Assignment Method
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { id: 'location', icon: MapPin, label: 'By Location', desc: 'Assign based on delivery location' },
                    { id: 'weight', icon: Package, label: 'By Weight', desc: 'Assign based on package weight' },
                    { id: 'cost', icon: DollarSign, label: 'By Cost', desc: 'Assign based on lowest cost' },
                    { id: 'performance', icon: TrendingUp, label: 'By Performance', desc: 'Assign to best performing partner' },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setAutoAssignMethod(opt.id)}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                          autoAssignMethod === opt.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            {...scaleIn}
          >
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
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
              </label>
            </div>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            {...scaleIn}
          >
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
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
              </label>
            </div>
          </motion.div>

          <div className="flex justify-end">
            <motion.button
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
          </div>
        </>
      )}
    </motion.div>
  );
}
