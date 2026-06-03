import React, { useCallback, useEffect, useState } from 'react';
import {
  Mail,
  Sparkles,
  RefreshCw,
  Play,
  Send,
  CheckCircle,
  AlertTriangle,
  Power,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

type FlowRow = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  pushEnabled: boolean;
  lastRunAt: string | null;
  lastRunSent: number;
  lastRunSkipped: number;
  lastRunFailed: number;
  lastError: string;
  stats7d: { sent: number; skipped: number; failed: number };
};

type EmailSettings = {
  richTemplatesEnabled: boolean;
  geminiMarketingCopy: boolean;
  geminiTransactionalPolish: boolean;
  geminiSellerNotifications: boolean;
};

export default function MarketingEmailAutomation() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [dailyEmailCap, setDailyEmailCap] = useState(4);
  const [email, setEmail] = useState<EmailSettings>({
    richTemplatesEnabled: true,
    geminiMarketingCopy: true,
    geminiTransactionalPolish: false,
    geminiSellerNotifications: true,
  });
  const [system, setSystem] = useState({
    emailProviderConfigured: false,
    geminiApiConfigured: false,
  });
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminMarketingAPI
      .getAutomationOverview()
      .then((res) => {
        setGlobalEnabled(res.globalEnabled !== false);
        setDailyEmailCap(res.dailyEmailCap ?? 4);
        setEmail({
          richTemplatesEnabled: res.email?.richTemplatesEnabled !== false,
          geminiMarketingCopy: res.email?.geminiMarketingCopy !== false,
          geminiTransactionalPolish: Boolean(res.email?.geminiTransactionalPolish),
          geminiSellerNotifications: res.email?.geminiSellerNotifications !== false,
        });
        setSystem(res.system || { emailProviderConfigured: false, geminiApiConfigured: false });
        setFlows(Array.isArray(res.flows) ? res.flows : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load email automation'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveGlobals = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminMarketingAPI.updateAutomationGlobals({
        globalEnabled,
        dailyEmailCap,
        email,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleFlow = async (flow: FlowRow, field: 'enabled' | 'pushEnabled') => {
    const body =
      field === 'enabled'
        ? { enabled: !flow.enabled }
        : { pushEnabled: !flow.pushEnabled };
    try {
      await adminMarketingAPI.updateAutomationFlow(flow.key, body);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update flow');
    }
  };

  const runFlow = async (key: string) => {
    try {
      const res = await adminMarketingAPI.runAutomationFlow(key);
      setTestStatus(`Run complete: ${res.sent} sent, ${res.skipped} skipped, ${res.failed} failed`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run flow');
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setTestStatus(null);
    try {
      const res = await adminMarketingAPI.testAutomationEmail(testEmail.trim());
      setTestStatus(`Test queued for ${res.user?.email || testEmail}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test send failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading email automation…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email automation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control marketing emails, AI copy, and per-flow delivery. Defaults are on — emails still work
            without Gemini using built-in copy variation.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${
            system.emailProviderConfigured
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <span className="font-semibold text-gray-900 dark:text-white">Email provider</span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {system.emailProviderConfigured
              ? 'Configured (Resend or SMTP). Transactional and marketing emails can send.'
              : 'Not configured. Set RESEND_API_KEY + RESEND_FROM_EMAIL or SMTP_USER + SMTP_PASS on the server.'}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            system.geminiApiConfigured
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-gray-900 dark:text-white">Gemini AI</span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {system.geminiApiConfigured
              ? 'API key detected. Marketing copy can use AI when enabled below.'
              : 'Optional. Without GEMINI_API_KEY, emails use smart rotating copy (still varied and responsive).'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Global controls</h3>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Marketing emails master switch</p>
              <p className="text-xs text-gray-500">Disables all automated marketing flows at once</p>
            </div>
            <input
              type="checkbox"
              checked={globalEnabled}
              onChange={(e) => setGlobalEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-emerald-600"
            />
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Max marketing emails per user per 24h
            </label>
            <input
              type="number"
              min={0}
              max={50}
              value={dailyEmailCap}
              onChange={(e) => setDailyEmailCap(Number(e.target.value) || 0)}
              className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500">0 = unlimited. Default is 8.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Email design &amp; copy</h3>
        <div className="space-y-4">
          {(
            [
              {
                key: 'richTemplatesEnabled' as const,
                title: 'Rich responsive templates',
                desc: 'Modern card layout, product grid, and branded notifications (recommended).',
              },
              {
                key: 'geminiMarketingCopy' as const,
                title: 'AI marketing copy (Gemini)',
                desc: 'Recommendations, cart pulse, browse abandon, winback, abandoned cart subjects and intros.',
              },
              {
                key: 'geminiTransactionalPolish' as const,
                title: 'AI polish on buyer transactional emails',
                desc: 'Optional warmth pass on buyer order/message emails. Off by default.',
              },
              {
                key: 'geminiSellerNotifications' as const,
                title: 'AI seller notifications (Gemini)',
                desc: 'Orders, shipping, returns, payouts — in-app, push, and seller emails. Fallback copy if off.',
              },
            ] as const
          ).map((row) => (
            <label key={row.key} className="flex cursor-pointer items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{row.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{row.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={email[row.key]}
                onChange={(e) => setEmail((p) => ({ ...p, [row.key]: e.target.checked }))}
                className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-600"
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Also respects Marketing → AI Tools → &quot;Auto-Generate Copy&quot; when AI marketing is disabled
          there.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveGlobals}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save global settings'}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Automation flows</h3>
        <div className="space-y-4">
          {flows.map((flow) => (
            <div
              key={flow.key}
              className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{flow.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{flow.description}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    7d: {flow.stats7d.sent} sent · {flow.stats7d.skipped} skipped ·{' '}
                    {flow.stats7d.failed} failed
                    {flow.lastError ? (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        {flow.lastError}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={flow.enabled}
                      onChange={() => toggleFlow(flow, 'enabled')}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={flow.pushEnabled}
                      onChange={() => toggleFlow(flow, 'pushEnabled')}
                    />
                    Push
                  </label>
                  <button
                    type="button"
                    onClick={() => runFlow(flow.key)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium dark:border-gray-700"
                  >
                    <Play className="h-3 w-3" />
                    Run now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Send test recommendation</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="buyer@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="min-w-[240px] flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={sendTest}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900"
          >
            <Send className="h-4 w-4" />
            Send test
          </button>
        </div>
        {testStatus && (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{testStatus}</p>
        )}
      </div>
    </div>
  );
}
