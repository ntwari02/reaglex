import React, { useState } from 'react';
import { Settings, CheckCircle, XCircle, AlertTriangle, Key, Webhook, TestTube, Edit } from 'lucide-react';

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

const mockGateways: Gateway[] = [
  {
    id: 'GW-001',
    name: 'Stripe',
    type: 'Card Payments',
    status: 'online',
    isEnabled: true,
    apiKey: 'sk_live_***',
    webhookUrl: 'https://api.example.com/webhooks/stripe',
    lastChecked: '2024-03-17 10:30:00',
  },
  {
    id: 'GW-002',
    name: 'PayPal',
    type: 'Digital Wallet',
    status: 'online',
    isEnabled: true,
    apiKey: 'paypal_***',
    webhookUrl: 'https://api.example.com/webhooks/paypal',
    lastChecked: '2024-03-17 10:25:00',
  },
  {
    id: 'GW-003',
    name: 'MTN Mobile Money',
    type: 'Mobile Money',
    status: 'online',
    isEnabled: true,
    apiKey: 'mtn_***',
    webhookUrl: 'https://api.example.com/webhooks/mtn',
    lastChecked: '2024-03-17 10:20:00',
  },
  {
    id: 'GW-004',
    name: 'Airtel Money',
    type: 'Mobile Money',
    status: 'issues',
    isEnabled: true,
    apiKey: 'airtel_***',
    webhookUrl: 'https://api.example.com/webhooks/airtel',
    lastChecked: '2024-03-17 09:15:00',
    issues: ['Webhook delivery failures detected'],
  },
  {
    id: 'GW-005',
    name: 'Flutterwave',
    type: 'Payment Gateway',
    status: 'offline',
    isEnabled: false,
  },
];

export default function PaymentGateways() {
  const [gateways, setGateways] = useState<Gateway[]>(mockGateways);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const toggleGateway = (gatewayId: string) => {
    setGateways((prevGateways) =>
      prevGateways.map((gateway) => {
        if (gateway.id === gatewayId) {
          const newEnabled = !gateway.isEnabled;
          return {
            ...gateway,
            isEnabled: newEnabled,
            // Update status based on enabled state
            status: newEnabled ? (gateway.status === 'offline' ? 'online' : gateway.status) : 'offline',
          };
        }
        return gateway;
      })
    );
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
                  // Use current gateway state
                  const currentGateway = gateways.find((g) => g.id === gateway.id);
                  if (currentGateway) {
                    setSelectedGateway(currentGateway);
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
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">API Key</label>
                <input
                  type="text"
                  defaultValue={selectedGateway.apiKey}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Webhook URL
                </label>
                <input
                  type="text"
                  defaultValue={selectedGateway.webhookUrl}
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
                <button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40">
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

