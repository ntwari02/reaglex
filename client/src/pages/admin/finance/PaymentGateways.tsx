import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Copy, Edit, TestTube, ScrollText } from 'lucide-react';
import { adminFinanceAPI } from '@/lib/api';

type GatewayStatus = 'online' | 'offline' | 'issues';

type FieldMeta = { name: string; label: string; kind: 'text' | 'secret' | 'url'; hint?: string };

interface Gateway {
  id: string;
  key?: string;
  name: string;
  type: string;
  status: GatewayStatus;
  isEnabled: boolean;
  credentialProfile?: string;
  fieldMeta?: FieldMeta[];
  maskedSummary?: Record<string, string>;
  suggestedWebhookUrl?: string;
  isConfigured?: boolean;
  apiKeyMasked?: string;
  webhookUrl?: string;
  lastChecked?: string;
  issues?: string[];
  testMode?: boolean;
  healthLogs?: Array<{ at: string; level: string; message: string }>;
}

function emptyForm(meta: FieldMeta[] | undefined): Record<string, string> {
  const o: Record<string, string> = {};
  (meta || []).forEach((f) => {
    o[f.name] = '';
  });
  return o;
}

function mergeDocWebhookIntoForm(g: Gateway, values: Record<string, string>): Record<string, string> {
  if (g.key !== 'flutterwave') return values;
  const w = (g.webhookUrl || '').trim();
  if (w && !(values.webhookUrl || '').trim()) return { ...values, webhookUrl: w };
  return values;
}

export default function PaymentGateways() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testModeInput, setTestModeInput] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fallbackGateways: Gateway[] = [
    { id: 'flutterwave', key: 'flutterwave', name: 'Flutterwave', type: 'Payment Gateway', status: 'offline', isEnabled: false },
    { id: 'mtn_momo', key: 'mtn_momo', name: 'MTN Mobile Money', type: 'Mobile Money', status: 'offline', isEnabled: false },
    { id: 'airtel_money', key: 'airtel_money', name: 'Airtel Money', type: 'Mobile Money', status: 'offline', isEnabled: false },
    { id: 'stripe', key: 'stripe', name: 'Stripe', type: 'Card Payments', status: 'offline', isEnabled: false },
    { id: 'paypal', key: 'paypal', name: 'PayPal', type: 'Digital Wallet', status: 'offline', isEnabled: false },
  ];

  const loadGateways = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    adminFinanceAPI
      .getGateways()
      .then((res) => {
        setLoadError(null);
        setGateways(
          (res.gateways || []).map((g: any) => ({
            id: g.id,
            key: g.key,
            name: g.name,
            type: g.type,
            status: g.status,
            isEnabled: g.isEnabled,
            credentialProfile: g.credentialProfile,
            fieldMeta: g.fieldMeta,
            maskedSummary: g.maskedSummary || {},
            suggestedWebhookUrl: g.suggestedWebhookUrl,
            isConfigured: g.isConfigured,
            apiKeyMasked: g.apiKeyMasked,
            webhookUrl: g.webhookUrl,
            lastChecked: g.lastChecked ? new Date(g.lastChecked).toLocaleString() : undefined,
            issues: g.issues || [],
            testMode: g.testMode,
            healthLogs: g.healthLogs || [],
          }))
        );
      })
      .catch((err: any) => {
        const msg = err?.message || err?.response?.data?.message || 'Failed to load payment gateways';
        setLoadError(msg);
        setGateways(fallbackGateways);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadGateways(false);
  }, [loadGateways]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadGateways(true);
    };
    const onFocus = () => loadGateways(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadGateways]);

  const openConfigure = (g: Gateway) => {
    setSelectedGateway(g);
    setTestModeInput(!!g.testMode);
    const seeded = mergeDocWebhookIntoForm(g, { ...emptyForm(g.fieldMeta), ...(g.maskedSummary || {}) });
    setFormValues(seeded);
    setTestMessage(null);
    setShowLogs(false);
    setShowConfigModal(true);
    if (g.credentialProfile === 'none') return;
    void adminFinanceAPI
      .revealGatewayCredentials(g.id, '')
      .then((res) => {
        if (res.credentials && typeof res.credentials === 'object') {
          const next: Record<string, string> = { ...emptyForm(g.fieldMeta) };
          Object.entries(res.credentials).forEach(([k, v]) => {
            if (typeof v === 'string') next[k] = v;
          });
          setFormValues(mergeDocWebhookIntoForm(g, next));
        }
      })
      .catch(() => {
        /* keep masked / seeded values */
      });
  };

  const toggleGateway = (gatewayId: string) => {
    const g = gateways.find((x) => x.id === gatewayId);
    if (!g) return;
    const newEnabled = !g.isEnabled;
    adminFinanceAPI
      .updateGateway(gatewayId, { isEnabled: newEnabled })
      .then((res) => {
        const row = res.gateway;
        const enabled = typeof row?.isEnabled === 'boolean' ? row.isEnabled : newEnabled;
        setGateways((prev) =>
          prev.map((x) =>
            x.id === gatewayId
              ? {
                  ...x,
                  isEnabled: enabled,
                  status: enabled ? (x.status === 'offline' ? 'online' : x.status) : 'offline',
                  isConfigured: row?.isConfigured ?? x.isConfigured,
                }
              : x
          )
        );
        void loadGateways(true);
        try {
          window.dispatchEvent(new CustomEvent('reaglex:payment-gateways-changed'));
          const bc = new BroadcastChannel('reaglex-payment-gateways');
          bc.postMessage({ type: 'changed', at: Date.now() });
          bc.close();
        } catch {
          /* ignore */
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message || err?.message || 'Cannot change gateway state';
        alert(msg);
      });
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

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment gateways</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure each provider with the exact keys and webhook settings required for live checkout. Values are stored
          encrypted; nothing here depends on <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">.env</code> once
          saved.
        </p>
      </div>
      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {loadError}
        </div>
      )}

      {loading && <div className="py-4 text-center text-gray-500">Loading...</div>}
      <div className="space-y-4">
        {gateways.map((gateway) => (
          <div
            key={gateway.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{gateway.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{gateway.type}</p>
              </div>
              {getStatusBadge(gateway.status)}
            </div>
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Enabled for buyers</span>
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-300">Configured</span>
                <span className={gateway.isConfigured ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {gateway.isConfigured ? 'Yes' : 'No — fill all required fields and save'}
                </span>
              </div>
              {gateway.suggestedWebhookUrl && (
                <div className="rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-800/80">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Suggested webhook / callback URL</span>
                  <p className="mt-1 break-all font-mono text-gray-600 dark:text-gray-400">{gateway.suggestedWebhookUrl}</p>
                </div>
              )}
              {gateway.maskedSummary && Object.keys(gateway.maskedSummary).length > 0 && (
                <div className="space-y-1 rounded-lg border border-gray-100 p-2 text-xs dark:border-gray-700">
                  {Object.entries(gateway.maskedSummary).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {gateway.lastChecked && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-300">Last test</span>
                  <span className="text-gray-500 dark:text-gray-400">{gateway.lastChecked}</span>
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openConfigure(gateway)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <Edit className="h-4 w-4" /> Configure
              </button>
              <button
                type="button"
                title="Health logs"
                onClick={() => {
                  setSelectedGateway(gateway);
                  setShowLogs(true);
                }}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <ScrollText className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showLogs && selectedGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Health logs — {selectedGateway.name}</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto text-xs">
              {(selectedGateway.healthLogs || []).length === 0 ? (
                <p className="text-gray-500">No log entries yet.</p>
              ) : (
                [...(selectedGateway.healthLogs || [])]
                  .slice()
                  .reverse()
                  .map((log, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 p-2 dark:border-gray-800">
                      <span className="text-gray-400">{new Date(log.at).toLocaleString()}</span>{' '}
                      <span
                        className={
                          log.level === 'error' ? 'text-red-600' : log.level === 'warn' ? 'text-amber-600' : 'text-gray-700'
                        }
                      >
                        [{log.level}]
                      </span>{' '}
                      {log.message}
                    </div>
                  ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowLogs(false)}
              className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold dark:border-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showConfigModal && selectedGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Configure {selectedGateway.name}</h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Enter the credentials your payment provider issued. Use “Test connection” before enabling the gateway for
              buyers.
            </p>

            {selectedGateway.suggestedWebhookUrl && (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">Suggested listener URL</span>
                  <button
                    type="button"
                    onClick={() => void copyText(selectedGateway.suggestedWebhookUrl || '')}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-200"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <p className="mt-2 break-all font-mono text-emerald-900/90 dark:text-emerald-100/90">
                  {selectedGateway.suggestedWebhookUrl}
                </p>
              </div>
            )}

            {selectedGateway.credentialProfile !== 'none' && (
              <div className="space-y-4">
                {(selectedGateway.fieldMeta || []).length === 0 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">No field definitions for this profile.</p>
                ) : (
                  (selectedGateway.fieldMeta || []).map((field) => (
                    <div key={field.name}>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">{field.label}</label>
                      {field.hint && <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400">{field.hint}</p>}
                      {field.kind === 'url' ? (
                        <textarea
                          rows={2}
                          value={formValues[field.name] ?? ''}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      ) : (
                        <input
                          type={field.kind === 'secret' ? 'password' : 'text'}
                          value={formValues[field.name] ?? ''}
                          onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      )}
                    </div>
                  ))
                )}

                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={testModeInput}
                    onChange={(e) => setTestModeInput(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Sandbox / test mode (gateway flag)
                </label>

                {testMessage && (
                  <p
                    className={`text-sm ${
                      testMessage.startsWith('OK') || testMessage.includes('Connected')
                        ? 'text-emerald-600'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {testMessage}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={async () => {
                      if (!selectedGateway) return;
                      setTesting(true);
                      setTestMessage(null);
                      try {
                        const r = await adminFinanceAPI.testGatewayConnection(selectedGateway.id, {
                          password: '',
                          credentials: formValues,
                        });
                        setTestMessage(r.ok ? `OK — ${r.message}` : r.message);
                      } catch (e: any) {
                        setTestMessage(e?.message || 'Test failed');
                      } finally {
                        setTesting(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-700"
                  >
                    <TestTube className="h-4 w-4" /> {testing ? 'Testing…' : 'Test connection'}
                  </button>
                </div>

                <div className="flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold dark:border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      if (!selectedGateway) return;
                      setSaving(true);
                      try {
                        await adminFinanceAPI.updateGateway(selectedGateway.id, {
                          testMode: testModeInput,
                        });
                        await adminFinanceAPI.saveGatewayCredentials(selectedGateway.id, {
                          password: '',
                          credentials: formValues,
                        });
                        setShowConfigModal(false);
                        void loadGateways(true);
                        try {
                          window.dispatchEvent(new CustomEvent('reaglex:payment-gateways-changed'));
                          const bc = new BroadcastChannel('reaglex-payment-gateways');
                          bc.postMessage({ type: 'changed', at: Date.now() });
                          bc.close();
                        } catch {
                          /* ignore */
                        }
                      } catch (e: any) {
                        alert(e?.message || 'Save failed');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-2 text-sm font-semibold text-white shadow-lg"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {selectedGateway.credentialProfile === 'none' && (
              <p className="text-sm text-gray-600 dark:text-gray-400">No API credentials are required for offline payments.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
