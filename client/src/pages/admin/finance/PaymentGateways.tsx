import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, AlertTriangle, Key, Webhook, TestTube, Edit } from 'lucide-react';
import { adminFinanceAPI } from '@/lib/api';

type GatewayStatus = 'online' | 'offline' | 'issues';

interface Gateway {
  id: string;
  name: string;
  type: string;
  status: GatewayStatus;
  isEnabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  lastChecked?: string;
  issues?: string[];
}

export default function PaymentGateways() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configApiKey, setConfigApiKey] = useState('');
  const [configWebhookUrl, setConfigWebhookUrl] = useState('');

  useEffect(() => {
    adminFinanceAPI.getGateways().then((res) => {
      setGateways(res.gateways.map((g: any) => ({
        id: g.id,
        name: g.name,
        type: g.type,
        status: g.status,
        isEnabled: g.isEnabled,
        apiKey: g.apiKey,
        webhookUrl: g.webhookUrl,
        lastChecked: g.lastChecked ? new Date(g.lastChecked).toLocaleString() : undefined,
        issues: g.issues || [],
      })));
    }).catch(() => setGateways([])).finally(() => setLoading(false));
  }, []);

  const toggleGateway = (gatewayId: string) => {
    const g = gateways.find((x) => x.id === gatewayId);
    if (!g) return;
    const newEnabled = !g.isEnabled;
    adminFinanceAPI.updateGateway(gatewayId, { isEnabled: newEnabled }).then((res) => {
      setGateways((prev) => prev.map((x) => (x.id === gatewayId ? { ...x, isEnabled: res.gateway?.isEnabled ?? newEnabled, status: newEnabled ? (x.status === 'offline' ? 'online' : x.status) : 'offline' } : x)));
    }).catch(() => {});
  };

  const getStatusBadge = (status: GatewayStatus) => {
    const styles = {
      online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      offline: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      issues: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  return (
    <div className="space-y-6">
      {loading && <div className="text-center text-gray-500 py-4">Loading...</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        {gateways.map((gateway) => (
          <div
            key={gateway.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{gateway.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{gateway.type}</p>
              </div>
              {getStatusBadge(gateway.status)}
            </div>
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Status</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={gateway.isEnabled}
                    onChange={() => toggleGateway(gateway.id)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              {gateway.apiKey && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">API Key</span>
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{gateway.apiKey}</span>
                </div>
              )}
              {gateway.lastChecked && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Last Checked</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{gateway.lastChecked}</span>
                </div>
              )}
            </div>
            {gateway.issues && gateway.issues.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Issues Detected</p>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  {gateway.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const currentGateway = gateways.find((g) => g.id === gateway.id);
                  if (currentGateway) {
                    setSelectedGateway(currentGateway);
                    setConfigApiKey(currentGateway.apiKey || '');
                    setConfigWebhookUrl(currentGateway.webhookUrl || '');
                    setShowConfigModal(true);
                  }
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <Edit className="mr-2 inline h-4 w-4" /> Configure
              </button>
              <button
                title="Test Connection"
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <TestTube className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Configure {selectedGateway.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">API Key (masked)</label>
                <input
                  type="text"
                  value={configApiKey}
                  onChange={(e) => setConfigApiKey(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Webhook URL
                </label>
                <input
                  type="text"
                  value={configWebhookUrl}
                  onChange={(e) => setConfigWebhookUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedGateway) return;
                    adminFinanceAPI.updateGateway(selectedGateway.id, { apiKeyMasked: configApiKey || undefined, webhookUrl: configWebhookUrl || undefined }).then(() => {
                      setGateways((prev) => prev.map((g) => (g.id === selectedGateway.id ? { ...g, apiKey: configApiKey, webhookUrl: configWebhookUrl } : g)));
                      setShowConfigModal(false);
                    }).catch(() => {});
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

