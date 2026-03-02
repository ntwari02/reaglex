import React, { useState } from 'react';
import {
  Plug,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Activity,
  ExternalLink,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  errorCount: number;
}

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'DHL API',
    type: 'api',
    status: 'connected',
    lastSync: '2 minutes ago',
    errorCount: 0,
  },
  {
    id: '2',
    name: 'FedEx API',
    type: 'api',
    status: 'connected',
    lastSync: '5 minutes ago',
    errorCount: 2,
  },
  {
    id: '3',
    name: 'UPS API',
    type: 'api',
    status: 'error',
    lastSync: '1 hour ago',
    errorCount: 15,
  },
  {
    id: '4',
    name: 'Local Courier API',
    type: 'api',
    status: 'disconnected',
    errorCount: 0,
  },
];

export default function SystemIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Integrations</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage API connections and webhook integrations
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                  <Plug className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {integration.type}
                  </p>
                </div>
              </div>
              {getStatusBadge(integration.status)}
            </div>

            {/* Status Info */}
            <div className="space-y-2 mb-4">
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

            {/* Actions */}
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
          </div>
        ))}
      </div>

      {/* Webhook Logs Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
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
      </div>
    </div>
  );
}

