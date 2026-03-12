import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plug,
  CheckCircle,
  XCircle,
  Settings,
  Activity,
} from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, staggerContainer, staggerItem } from './logisticsAnimations';

interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  errorCount: number;
}

export default function SystemIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getIntegrations();
      setIntegrations(res.integrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integrations');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const getStatusBadge = (status: Integration['status']) => {
    const styles = {
      connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      disconnected: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Integrations</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage API connections and webhook integrations. Data from backend.
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
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <Plug className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No integrations found from the database.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {integrations.map((integration, i) => (
            <motion.div
              key={integration.id}
              variants={staggerItem}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ y: -2, boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                    <Plug className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                    <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
                      {integration.type}
                    </p>
                  </div>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              <div className="mb-4 space-y-2">
                {integration.lastSync && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Sync</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {integration.lastSync}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Error Count</span>
                  <span
                    className={`font-semibold ${
                      integration.errorCount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {integration.errorCount}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Settings className="mr-1 inline h-4 w-4" />
                  Configure
                </button>
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Activity className="mr-1 inline h-4 w-4" />
                  View Logs
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        transition={pageTransition.transition}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Webhook Logs</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                {i % 2 === 0 ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Webhook Event {i}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(Date.now() - i * 3600000).toLocaleString()}
                  </p>
                </div>
              </div>
              <button className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                View
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
