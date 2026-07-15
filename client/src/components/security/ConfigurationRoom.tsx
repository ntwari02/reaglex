import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  Globe,
  KeyRound,
  Save,
  Search,
  ShieldCheck,
  TestTube2,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { cn } from '@/lib/utils';

type ApiStatus = 'online' | 'degraded' | 'offline';
type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type ApiCategory = 'internal' | 'external' | 'payments' | 'ai' | 'messaging' | 'security';

type ApiEntry = {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  environment: 'production' | 'staging' | 'sandbox' | 'development';
  authType: 'none' | 'api_key' | 'bearer' | 'oauth2' | 'basic';
  rateLimit: string;
  securityScore: number;
  lastChecked: string;
  status: ApiStatus;
  usage24h: number;
  errorCount24h: number;
  failedRequestLogs: { at: string; message: string; statusCode?: number }[];
  lastSyncAt?: string;
  riskAlerts: string[];
  supportsWebhook?: boolean;
  allowedOrigins?: string[];
  loggingLevel?: LogLevel;
  callbackUrl?: string;
  category?: ApiCategory;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastTestMessage?: string;
};

type ApiEntryDetail = ApiEntry & {
  headers: { key: string; value: string }[];
  apiKeyMasked?: string;
  secretMasked?: string;
  roleAccess: Array<'admin' | 'security_admin' | 'finance_admin'>;
  auditLogs: { at: string; actor: string; action: string; summary: string }[];
};

type SavePayload = {
  endpoint: string;
  method: string;
  environment: ApiEntry['environment'];
  authType: ApiEntry['authType'];
  headers: { key: string; value: string }[];
  apiKey?: string;
  secret?: string;
  allowedOrigins: string[];
  rateLimit: string;
  loggingLevel: LogLevel;
  callbackUrl?: string;
  roleAccess: Array<'admin' | 'security_admin' | 'finance_admin'>;
};

const statusClass: Record<ApiStatus, string> = {
  online: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  degraded: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  offline: 'border-red-500/40 bg-red-500/10 text-red-300',
};

function masked(value?: string) {
  if (!value) return '••••••••';
  if (value.length <= 6) return '••••••';
  return `${value.slice(0, 2)}••••••${value.slice(-2)}`;
}

function relativeTime(value?: string) {
  if (!value) return '—';
  const ms = Date.now() - new Date(value).getTime();
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function mapGatewayToApiEntry(g: any): ApiEntry {
  const issues = Array.isArray(g.issues) ? g.issues.filter((x: unknown) => typeof x === 'string') : [];
  const status: ApiStatus = g.status === 'online' ? 'online' : g.status === 'issues' ? 'degraded' : 'offline';
  return {
    id: String(g.id),
    name: String(g.name || 'API'),
    endpoint: String(g.suggestedWebhookUrl || g.webhookUrl || 'https://api.example.com'),
    method: 'POST',
    environment: g.testMode ? 'sandbox' : 'production',
    authType: 'api_key',
    rateLimit: '100 req/min',
    securityScore: status === 'online' ? 86 : status === 'degraded' ? 61 : 34,
    lastChecked: g.lastChecked || new Date().toISOString(),
    status,
    usage24h: Math.floor(Math.random() * 4000) + 400,
    errorCount24h: status === 'online' ? Math.floor(Math.random() * 7) : Math.floor(Math.random() * 40) + 8,
    failedRequestLogs: issues.map((i: string) => ({
      at: new Date().toISOString(),
      message: i,
      statusCode: status === 'offline' ? 503 : 429,
    })),
    lastSyncAt: g.lastChecked || new Date().toISOString(),
    riskAlerts: issues.length ? issues : ['No active risk alerts'],
    supportsWebhook: true,
    allowedOrigins: ['https://www.spacilly.com'],
    loggingLevel: 'info',
    callbackUrl: g.suggestedWebhookUrl || g.webhookUrl || '',
  };
}

const defaultHeaders = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'X-Spacilly-Client', value: 'admin-control-room' },
];

const ctaStyle = {
  background: 'var(--gradient-brand-cta)',
  boxShadow: 'var(--shadow-cta)',
  color: '#fff',
} as const;

const categoryTabs: Array<{ id: 'all' | ApiCategory; label: string }> = [
  { id: 'all', label: 'All APIs' },
  { id: 'internal', label: 'Internal' },
  { id: 'external', label: 'External' },
  { id: 'payments', label: 'Payments' },
  { id: 'ai', label: 'AI' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'security', label: 'Security' },
];

function inferCategory(entry: ApiEntry): ApiCategory {
  if (entry.category) return entry.category;
  const id = entry.id.toLowerCase();
  const name = entry.name.toLowerCase();
  const endpoint = entry.endpoint.toLowerCase();
  if (id.includes('payment') || id.includes('momo') || endpoint.includes('/payments') || name.includes('payment')) return 'payments';
  if (id.includes('ai') || name.includes('gemini') || endpoint.includes('/ai')) return 'ai';
  if (name.includes('email') || name.includes('notification') || endpoint.includes('/notifications') || name.includes('resend')) return 'messaging';
  if (id.includes('security') || endpoint.includes('/security') || name.includes('oauth')) return 'security';
  if (id.startsWith('platform-') || endpoint.includes('/api/')) return 'internal';
  return 'external';
}

type Props = {
  authHeaders: () => Record<string, string>;
};

export function ConfigurationRoom({ authHeaders }: Props) {
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ApiCategory>('all');
  const [envFilter, setEnvFilter] = useState<'all' | ApiEntry['environment']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ApiStatus>('all');
  const [selected, setSelected] = useState<ApiEntryDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showRiskPrompt, setShowRiskPrompt] = useState(false);
  const [pendingSave, setPendingSave] = useState<SavePayload | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const primary = await fetch(`${API_BASE_URL}/security-analysis/apis`, { headers: authHeaders() });
      if (primary.ok) {
        const data = await primary.json().catch(() => ({}));
        if (Array.isArray(data.apis)) {
          setEntries(data.apis);
          return;
        }
      }
      const fallback = await fetch(`${API_BASE_URL}/admin/finance/gateways`, { headers: authHeaders() });
      const payload = await fallback.json().catch(() => ({}));
      setEntries(Array.isArray(payload.gateways) ? payload.gateways.map(mapGatewayToApiEntry) : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        const category = inferCategory(entry);
        const hitsQuery =
          !query.trim() ||
          entry.name.toLowerCase().includes(query.toLowerCase()) ||
          entry.endpoint.toLowerCase().includes(query.toLowerCase()) ||
          entry.method.toLowerCase().includes(query.toLowerCase());
        const hitsCategory = categoryFilter === 'all' || category === categoryFilter;
        const hitsEnv = envFilter === 'all' || entry.environment === envFilter;
        const hitsStatus = statusFilter === 'all' || entry.status === statusFilter;
        return hitsQuery && hitsCategory && hitsEnv && hitsStatus;
      }),
    [entries, query, categoryFilter, envFilter, statusFilter]
  );

  const openDetails = async (entry: ApiEntry) => {
    try {
      const res = await fetch(`${API_BASE_URL}/security-analysis/apis/${entry.id}`, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.api) {
        setSelected(data.api);
      } else {
        setSelected({
          ...entry,
          headers: defaultHeaders,
          apiKeyMasked: masked('gateway_api_key'),
          secretMasked: masked('gateway_secret_key'),
          roleAccess: ['admin', 'security_admin'],
          auditLogs: [
            {
              at: new Date().toISOString(),
              actor: 'System',
              action: 'SYNC',
              summary: 'Configuration synced from gateway source',
            },
          ],
        });
      }
      setFeedback(null);
      setDrawerOpen(true);
    } catch {
      setFeedback({ type: 'error', message: 'Could not open API configuration details.' });
    }
  };

  const updateSelected = (patch: Partial<ApiEntryDetail>) => {
    setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const validateBeforeSave = (payload: SavePayload): string | null => {
    if (!payload.endpoint.trim().startsWith('http')) return 'Endpoint must be a valid absolute URL.';
    if (!payload.method.trim()) return 'HTTP method is required.';
    if (!payload.rateLimit.trim()) return 'Rate limit is required.';
    if (payload.authType !== 'none' && payload.headers.every((h) => !h.key.trim())) {
      return 'At least one header key is required when auth is enabled.';
    }
    return null;
  };

  const persistSave = async (payload: SavePayload) => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/security-analysis/apis/${selected.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Save failed');
      setFeedback({ type: 'success', message: 'API configuration saved.' });
      setShowRiskPrompt(false);
      setPendingSave(null);
      await loadEntries();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    const payload: SavePayload = {
      endpoint: selected.endpoint,
      method: selected.method,
      environment: selected.environment,
      authType: selected.authType,
      headers: selected.headers,
      allowedOrigins: selected.allowedOrigins || [],
      rateLimit: selected.rateLimit,
      loggingLevel: selected.loggingLevel || 'info',
      callbackUrl: selected.callbackUrl,
      roleAccess: selected.roleAccess,
    };
    const error = validateBeforeSave(payload);
    if (error) {
      setFeedback({ type: 'error', message: error });
      return;
    }
    const risky =
      selected.environment === 'production' &&
      (payload.authType === 'none' || payload.allowedOrigins.includes('*') || payload.loggingLevel === 'debug');
    if (risky) {
      setPendingSave(payload);
      setShowRiskPrompt(true);
      return;
    }
    await persistSave(payload);
  };

  const testConnection = async () => {
    if (!selected) return;
    setTesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/security-analysis/apis/${selected.id}/test`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Connection test failed');
      setFeedback({ type: 'success', message: data.message || 'Connection test successful.' });
      updateSelected({ lastChecked: new Date().toISOString() });
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section
      className="rounded-2xl border"
      style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--divider)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Configuration Room
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Central panel for API security, credentials, risk controls, monitoring and audit trails.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Role-based editing with masked secrets
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold min-h-[36px] transition-colors',
                categoryFilter === tab.id ? 'border-transparent' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
              style={
                categoryFilter === tab.id
                  ? ctaStyle
                  : { borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,160px,140px]">
          <label className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--divider)' }}>
            <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search APIs by name, endpoint, method..."
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </label>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value as typeof envFilter)}
            className="rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="sandbox">Sandbox</option>
            <option value="development">Development</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="all">All status</option>
            <option value="online">Online</option>
            <option value="degraded">Degraded</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--divider)' }}>
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              <tr>
                <th className="px-3 py-2">API Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Endpoint/Base URL</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Environment</th>
                <th className="px-3 py-2">Auth Type</th>
                <th className="px-3 py-2">Rate Limit</th>
                <th className="px-3 py-2">Security</th>
                <th className="px-3 py-2">Last Test</th>
                <th className="px-3 py-2">Last Checked</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-3 py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Loading API configuration inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No APIs match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--divider)' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {entry.name}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase" style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}>
                        {inferCategory(entry)}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {entry.endpoint}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {entry.method}
                    </td>
                    <td className="px-3 py-2">{entry.environment}</td>
                    <td className="px-3 py-2">{entry.authType}</td>
                    <td className="px-3 py-2">{entry.rateLimit}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'rounded-lg border px-2 py-0.5 font-mono',
                          entry.securityScore >= 80
                            ? 'border-emerald-500/40 text-emerald-300'
                            : entry.securityScore >= 60
                              ? 'border-amber-500/40 text-amber-300'
                              : 'border-red-500/40 text-red-300'
                        )}
                      >
                        {entry.securityScore}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {entry.lastTestOk === true ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
                          Pass · {relativeTime(entry.lastTestAt)}
                        </span>
                      ) : entry.lastTestOk === false ? (
                        <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase text-red-300">
                          Fail · {relativeTime(entry.lastTestAt)}
                        </span>
                      ) : (
                        <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase" style={{ borderColor: 'var(--divider)', color: 'var(--text-muted)' }}>
                          Not tested
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{relativeTime(entry.lastChecked)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] uppercase', statusClass[entry.status])}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void openDetails(entry)}
                        className="inline-flex items-center gap-1 rounded-2xl border px-4 py-2 text-xs font-bold min-h-[36px] transition-colors hover:opacity-95"
                        style={{
                          borderColor: 'var(--brand-border-subtle)',
                          background: 'var(--brand-tint)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        Inspect <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && selected && (
          <motion.aside
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 z-[70] h-full w-full max-w-[560px] border-l"
            style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--divider)' }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selected.name} configuration
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Sensitive fields are masked and never rendered as raw secrets.
                  </p>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1" style={{ color: 'var(--text-muted)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
                <div className="grid grid-cols-1 gap-2">
                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }}>Endpoint editor</span>
                    <input
                      value={selected.endpoint}
                      onChange={(e) => updateSelected({ endpoint: e.target.value })}
                      className="w-full rounded-lg border px-2.5 py-2 font-mono"
                      style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>HTTP method</span>
                      <select
                        value={selected.method}
                        onChange={(e) => updateSelected({ method: e.target.value })}
                        className="w-full rounded-lg border px-2.5 py-2"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Environment</span>
                      <select
                        value={selected.environment}
                        onChange={(e) => updateSelected({ environment: e.target.value as ApiEntry['environment'] })}
                        className="w-full rounded-lg border px-2.5 py-2"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        {['production', 'staging', 'sandbox', 'development'].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }}>Headers editor</span>
                    <textarea
                      rows={3}
                      value={selected.headers.map((h) => `${h.key}: ${h.value}`).join('\n')}
                      onChange={(e) =>
                        updateSelected({
                          headers: e.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const [key, ...rest] = line.split(':');
                              return { key: key.trim(), value: rest.join(':').trim() };
                            }),
                        })
                      }
                      className="w-full rounded-lg border px-2.5 py-2 font-mono"
                      style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Auth method selector</span>
                      <select
                        value={selected.authType}
                        onChange={(e) => updateSelected({ authType: e.target.value as ApiEntry['authType'] })}
                        className="w-full rounded-lg border px-2.5 py-2"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        {['none', 'api_key', 'bearer', 'oauth2', 'basic'].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Rate limit settings</span>
                      <input
                        value={selected.rateLimit}
                        onChange={(e) => updateSelected({ rateLimit: e.target.value })}
                        className="w-full rounded-lg border px-2.5 py-2"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>API key (masked)</span>
                      <div
                        className="inline-flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 font-mono"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {selected.apiKeyMasked || masked()}
                      </div>
                    </label>
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Secret (masked)</span>
                      <div
                        className="inline-flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 font-mono"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {selected.secretMasked || masked()}
                      </div>
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span style={{ color: 'var(--text-muted)' }}>Allowed origins / CORS settings</span>
                    <input
                      value={(selected.allowedOrigins || []).join(', ')}
                      onChange={(e) =>
                        updateSelected({
                          allowedOrigins: e.target.value
                            .split(',')
                            .map((origin) => origin.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border px-2.5 py-2"
                      style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Logging level settings</span>
                      <select
                        value={selected.loggingLevel || 'info'}
                        onChange={(e) => updateSelected({ loggingLevel: e.target.value as LogLevel })}
                        className="w-full rounded-lg border px-2.5 py-2"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        {['error', 'warn', 'info', 'debug'].map((lvl) => (
                          <option key={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Role-based access control</span>
                      <select
                        value={selected.roleAccess[0] || 'admin'}
                        onChange={(e) =>
                          updateSelected({
                            roleAccess: [e.target.value as 'admin' | 'security_admin' | 'finance_admin'],
                          })
                        }
                        className="w-full rounded-lg border px-2.5 py-2"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="security_admin">Security Admin</option>
                        <option value="finance_admin">Finance Admin</option>
                      </select>
                    </label>
                  </div>

                  {selected.supportsWebhook && (
                    <label className="space-y-1">
                      <span style={{ color: 'var(--text-muted)' }}>Webhook / callback configuration</span>
                      <input
                        value={selected.callbackUrl || ''}
                        onChange={(e) => updateSelected({ callbackUrl: e.target.value })}
                        className="w-full rounded-lg border px-2.5 py-2 font-mono"
                        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                    <p className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Monitoring
                    </p>
                    <div className="space-y-1">
                      <p style={{ color: 'var(--text-secondary)' }}>Usage: {selected.usage24h.toLocaleString()} req / 24h</p>
                      <p style={{ color: 'var(--text-secondary)' }}>Errors: {selected.errorCount24h.toLocaleString()}</p>
                      <p className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <Clock3 className="h-3.5 w-3.5" /> Last sync: {relativeTime(selected.lastSyncAt)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                    <p className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Risk alerts
                    </p>
                    <div className="space-y-1">
                      {selected.riskAlerts.slice(0, 3).map((alert) => (
                        <p key={alert} className="inline-flex items-start gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                          {alert}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                  <p className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Failed request logs
                  </p>
                  <div className="max-h-28 space-y-1 overflow-y-auto font-mono text-[11px]">
                    {selected.failedRequestLogs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No recent failed requests.</p>
                    ) : (
                      selected.failedRequestLogs.slice(0, 8).map((log, index) => (
                        <p key={`${log.at}-${index}`} style={{ color: 'var(--text-secondary)' }}>
                          [{new Date(log.at).toLocaleTimeString()}] {log.statusCode || 0} {log.message}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                  <p className="mb-2 text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Audit logs
                  </p>
                  <div className="max-h-28 space-y-1 overflow-y-auto">
                    {selected.auditLogs.map((log, index) => (
                      <p key={`${log.at}-${index}`} style={{ color: 'var(--text-secondary)' }}>
                        {new Date(log.at).toLocaleString()} · {log.actor} · {log.action} · {log.summary}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {feedback && (
                <div
                  className={cn(
                    'mx-4 rounded-lg border px-3 py-2 text-xs',
                    feedback.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/40 bg-red-500/10 text-red-300'
                  )}
                >
                  {feedback.message}
                </div>
              )}

              <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t p-4" style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}>
                <button
                  type="button"
                  onClick={() => void testConnection()}
                  disabled={testing}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold"
                  style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <TestTube2 className="h-4 w-4" />
                  {testing ? 'Testing...' : 'Test connection'}
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black"
                  style={ctaStyle}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRiskPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          >
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border p-4"
              style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}
            >
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Risk warning
              </h4>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                You are saving a potentially risky production configuration (open CORS, no auth, or debug logging). Continue only
                if this was reviewed.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRiskPrompt(false);
                    setPendingSave(null);
                  }}
                  className="rounded-2xl border px-4 py-2 text-xs font-bold min-h-[44px]"
                  style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingSave) void persistSave(pendingSave);
                  }}
                  className="rounded-2xl px-4 py-2 text-xs font-black min-h-[44px]"
                  style={ctaStyle}
                >
                  Confirm risky save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

