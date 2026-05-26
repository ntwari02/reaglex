import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  Activity,
  Cpu,
  Gauge,
  HardDrive,
  Network,
  RefreshCw,
  Server,
  Terminal,
  Zap,
} from 'lucide-react';
import { API_BASE_URL, SERVER_URL } from '@/lib/config';
import { useSystemAnalysisUiStore } from '@/stores/systemAnalysisUiStore';
import { cn } from '@/lib/utils';
import SystemOpsCenterPanel from '@/components/admin/SystemOpsCenterPanel';

function toneForMetric(v: number, warn = 70, crit = 85) {
  // Semantic tones are fine to keep; avoid decorative gradients/glows on cards.
  if (v < warn) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300' };
  if (v <= crit) return { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-200' };
  return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-300' };
}

function formatUptime(sec: unknown) {
  const s = typeof sec === 'number' ? sec : Number(sec);
  if (!Number.isFinite(s) || s < 0) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  const v = values.length ? values : [0];
  const max = Math.max(5, ...v);
  const pts = v
    .map((val, i) => {
      const x = (i / Math.max(1, v.length - 1)) * 100;
      const y = 100 - (val / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" className={cn('h-10 w-full opacity-90', className)} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

const TERM_CARDS = [
  { id: 'perf', title: 'API intelligence', subtitle: 'Live routes from monitor' },
  { id: 'deps', title: 'Dependencies', subtitle: 'package.json + npm ls + audit' },
  { id: 'svc', title: 'System banner', subtitle: 'Host · OS · Node · memory' },
] as const;

export default function SystemAnalysisPage() {
  const {
    health,
    endpoints,
    activity,
    alerts,
    globalStatus,
    buckets24h,
    terminals,
    logs,
    settings,
    logFilter,
    setHealth,
    setEndpoints,
    setActivity,
    setAlerts,
    setTerminals,
    prependLog,
    prependActivity,
    setSettings,
    setLogFilter,
    applyBundle,
  } = useSystemAnalysisUiStore();

  const [socketConnected, setSocketConnected] = useState(false);
  const activityRef = useRef<HTMLDivElement | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    cardId: string;
    action: string;
    label: string;
  } | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const loadAll = useCallback(async () => {
    const h = authHeaders();
    const [bundle, st] = await Promise.all([
      fetch(`${API_BASE_URL}/system/bundle`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/system/settings`, { headers: h }).then((r) => r.json()),
    ]);
    if (bundle.health) {
      applyBundle({
        health: bundle.health,
        endpoints: bundle.endpoints ?? [],
        activity: bundle.activity ?? [],
        alerts: bundle.alerts ?? [],
        status: bundle.status,
        buckets24h: bundle.buckets24h ?? [],
        terminals: bundle.terminals ?? {},
        logs: bundle.logs,
      });
    }
    setSettings(st.settings ?? null);
  }, [authHeaders, applyBundle, setSettings]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const base = SERVER_URL.replace(/\/$/, '');
    const s = io(`${base}/system`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    s.on('connect', () => setSocketConnected(true));
    s.on('disconnect', () => setSocketConnected(false));
    s.emit('subscribe:system');
    s.on(
      'system:bundle',
      (payload: {
        health: typeof health;
        endpoints: typeof endpoints;
        activity: typeof activity;
        alerts: typeof alerts;
        status: typeof globalStatus;
        buckets24h: number[];
        terminals: Record<string, string[]>;
      }) => {
        if (payload?.health && payload.status) {
          applyBundle({
            health: payload.health as NonNullable<typeof health>,
            endpoints: payload.endpoints ?? [],
            activity: payload.activity ?? [],
            alerts: payload.alerts ?? [],
            status: payload.status,
            buckets24h: payload.buckets24h ?? [],
            terminals: payload.terminals ?? {},
          });
        }
      },
    );
    s.on('system:health:update', (payload: unknown) => setHealth(payload as NonNullable<typeof health>));
    s.on('system:api:update', (payload: { endpoints?: typeof endpoints }) => {
      if (payload?.endpoints) setEndpoints(payload.endpoints);
    });
    s.on('system:activity', (rows: typeof activity) => setActivity(rows ?? []));
    s.on('system:log:new', (entry: { id: string; level: string; message: string; at: string }) => {
      prependLog(entry);
    });
    s.on('system_metrics_update', (payload: { health?: NonNullable<typeof health>; ts?: string }) => {
      if (payload?.health) setHealth(payload.health);
    });
    s.on(
      'api_request_event',
      (row: { method: string; path: string; ms: number; status: number; at: string; clientIp?: string }) => {
        prependActivity({
          id: `evt-${row.at}-${row.path}-${row.method}-${Math.random().toString(36).slice(2, 7)}`,
          method: row.method,
          path: row.path,
          ms: row.ms,
          status: row.status,
          at: row.at,
          clientIp: row.clientIp,
        });
      },
    );
    s.on('system_alert_event', (payload: { alerts?: typeof alerts }) => {
      if (payload?.alerts?.length) setAlerts(payload.alerts as NonNullable<typeof alerts>);
    });
    s.on('terminal_event_stream', (payload: { terminals?: Record<string, string[]> }) => {
      if (payload?.terminals) setTerminals(payload.terminals);
    });
    return () => {
      s.disconnect();
    };
  }, [applyBundle, prependActivity, prependLog, setActivity, setAlerts, setEndpoints, setHealth, setTerminals]);

  useEffect(() => {
    const el = activityRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [activity]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.level === logFilter);
  }, [logs, logFilter]);

  const warn = settings?.cpuWarn ?? 70;
  const crit = settings?.cpuCritical ?? 85;
  const apiWarn = settings?.apiSlowWarnMs ?? 1000;
  const apiCrit = settings?.apiSlowCriticalMs ?? 3000;

  const metricCards = useMemo(() => {
    const h = health;
    const cpu = h?.cpuPercent ?? 0;
    const ram = h?.ramPercent ?? 0;
    const disk = h?.diskPercent ?? 0;
    const net = h?.networkLoadPercent ?? 0;
    const memPr = h?.memoryPressurePercent ?? 0;
    const dio = h?.diskIoActivityPercent ?? 0;
    const trend = h?.cpuTrend ?? [];
    return [
      { label: 'CPU', value: cpu, icon: Cpu, trend, hint: 'Live process + core sampling' },
      { label: 'RAM', value: ram, icon: Server, hint: 'System memory used' },
      { label: 'Disk', value: disk, icon: HardDrive, hint: 'Primary volume utilization' },
      { label: 'Network load', value: net, icon: Network, hint: 'Synthetic from request pressure' },
      { label: 'Memory pressure', value: memPr, icon: Gauge, hint: 'RSS + system mix' },
      { label: 'Disk I/O pulse', value: dio, icon: Zap, hint: 'Activity proxy' },
    ];
  }, [health]);

  const runTerminalAction = async (cardId: string, action: string) => {
    const r = await fetch(`${API_BASE_URL}/system/terminal/action`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ cardId, action, confirm: true }),
    });
    const data = await r.json();
    void loadAll();
    const t = await fetch(`${API_BASE_URL}/system/terminal`, { headers: authHeaders() }).then((x) => x.json());
    setTerminals(t.buffers ?? {});
    if (!data.ok) {
      // eslint-disable-next-line no-alert
      window.alert(data.lines?.join('\n') || 'Action failed');
    }
  };

  return (
    <div
      className="relative min-w-0 max-w-[1920px] mx-auto pb-12"
    >
      {/* Decorative backgrounds removed: keep surfaces clean like main dashboard. */}

      <AnimatePresence>
        {alerts.filter((a) => a.level === 'critical').slice(0, 2).map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0, transition: { type: 'spring', damping: 18 } }}
            className="fixed right-4 top-20 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-[var(--shadow-lg)]"
            style={{
              borderColor: 'var(--badge-error-border)',
              background: 'var(--badge-error-bg)',
              color: 'var(--badge-error-text)',
            }}
          >
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{a.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-card)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Activity className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </span>
            System Analysis
          </h1>
          <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Real-time API intelligence, live kernel metrics, and terminal-grade controls — cyber-ops control surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className="text-xs font-mono px-3 py-1.5 rounded-full border"
            style={
              socketConnected
                ? {
                    borderColor: 'var(--badge-success-border)',
                    background: 'var(--badge-success-bg)',
                    color: 'var(--badge-success-text)',
                  }
                : {
                    borderColor: 'var(--badge-warning-border)',
                    background: 'var(--badge-warning-bg)',
                    color: 'var(--badge-warning-text)',
                  }
            }
          >
            {socketConnected ? '● STREAM' : '○ SOCKET'}
          </span>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border text-sm font-medium transition-colors"
            style={{
              borderColor: 'var(--border-card)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
        </div>
      </motion.div>

      {globalStatus && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'mb-6 rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3',
            globalStatus.level === 'operational' && 'border-emerald-500/30 bg-emerald-500/5',
            globalStatus.level === 'degraded' && 'border-amber-500/35 bg-amber-500/10',
            globalStatus.level === 'outage' && 'border-red-500/40 bg-red-500/10',
          )}
        >
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Global</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{globalStatus.label}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{globalStatus.detail}</span>
        </motion.div>
      )}

      <SystemOpsCenterPanel
        settings={settings}
        alerts={alerts}
        authHeaders={authHeaders}
        onSettingsSaved={() => void loadAll()}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {metricCards.map((card, i) => {
          const tone = toneForMetric(Number(card.value), warn, crit);
          const isCpu = card.label === 'CPU';
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className={cn(
                'relative overflow-hidden rounded-2xl border p-4',
              )}
              style={{
                borderColor: 'var(--border-card)',
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="relative flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {card.label}
                  </span>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {card.hint}
                  </p>
                </div>
                <card.icon className={cn('w-5 h-5', tone.text)} />
              </div>
              <p className={cn('relative text-3xl font-mono font-bold', tone.text)}>
                {Number(card.value).toFixed(1)}%
              </p>
              <div className="relative mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--text-muted) 22%, transparent)' }}>
                <motion.div
                  className={cn('h-full rounded-full', tone.bar)}
                  initial={false}
                  animate={{ width: `${Math.min(100, Number(card.value))}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>
              {isCpu && (
                <div className="relative mt-2" style={{ color: 'var(--brand-primary)' }}>
                  <MiniSparkline values={card.trend ?? []} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
        <div
          className="xl:col-span-1 rounded-2xl border p-4"
          style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Uptime pulse (24h)
          </h3>
          <div className="flex items-end gap-1 h-24">
            {(buckets24h.length ? buckets24h : Array(24).fill(50)).map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(100, h)}%` }}
                className="flex-1 min-w-0 rounded-t opacity-90 hover:opacity-100"
                style={{ background: 'color-mix(in srgb, var(--brand-primary) 55%, transparent)' }}
                title={`Hour ${i + 1}: ${h.toFixed(0)}%`}
              />
            ))}
          </div>
        </div>
        <div
          className="xl:col-span-3 rounded-2xl border p-4"
          style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Server className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              API intelligence
            </h2>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              RPS · latency · errors · codes
            </span>
          </div>
          <div className="overflow-x-auto -mx-2 px-2 max-h-[380px] overflow-y-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr
                  className="text-left text-[10px] uppercase border-b"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--divider)' }}
                >
                  <th className="pb-2 pr-2">Route</th>
                  <th className="pb-2 pr-2">RPS</th>
                  <th className="pb-2 pr-2">Avg</th>
                  <th className="pb-2 pr-2">Err%</th>
                  <th className="pb-2">Bar</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                      Send traffic to <code className="font-mono" style={{ color: 'var(--brand-primary)' }}>/api/*</code> — metrics appear instantly.
                    </td>
                  </tr>
                ) : (
                  endpoints.map((row) => {
                    const slow =
                      (row.lastMs ?? row.avgResponseMs) >= apiCrit
                        ? 'critical'
                        : (row.lastMs ?? row.avgResponseMs) >= apiWarn
                          ? 'warn'
                          : 'ok';
                    return (
                      <tr
                        key={row.endpoint}
                        title={`IP: ${row.lastClientIp || '—'}\nUA: ${row.lastUserAgent || '—'}\nPayload: ${row.lastPayloadBytes ?? 0}b\nCodes: ${JSON.stringify(row.statusCodes || {})}`}
                        className={cn(
                          'border-b',
                          slow === 'critical' && 'bg-red-500/10 shadow-[inset_0_0_12px_rgba(239,68,68,0.15)]',
                          slow === 'warn' && 'bg-amber-500/10',
                          row.lastStatus === 'ERROR' && 'ring-1 ring-red-500/30',
                        )}
                        style={{ borderColor: 'var(--divider)' }}
                      >
                        <td className="py-2 pr-2 font-mono text-[11px] break-all max-w-[280px]" style={{ color: 'var(--text-primary)' }}>
                          <span className="mr-1" style={{ color: 'var(--brand-primary)' }}>{row.method || '—'}</span>
                          {row.endpoint}
                        </td>
                        <td className="py-2 pr-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {row.rps != null ? row.rps.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 pr-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {row.avgResponseMs}ms
                        </td>
                        <td className="py-2 pr-2" style={{ color: 'var(--text-secondary)' }}>
                          {row.errorRatePercent?.toFixed(1) ?? 0}%
                        </td>
                        <td className="py-2 w-32">
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--text-muted) 22%, transparent)' }}>
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                slow === 'critical' ? 'bg-red-500' : slow === 'warn' ? 'bg-amber-500' : 'bg-emerald-500',
                              )}
                              style={{ width: `${Math.min(100, (row.avgResponseMs / Math.max(apiCrit, 1)) * 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-2xl border p-4 font-mono text-[11px] min-h-[220px]"
          style={{
            borderColor: 'var(--border-card)',
            background: 'var(--card-bg)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-muted)' }}>
            <Terminal className="w-4 h-4" />
            <span className="uppercase tracking-widest">Activity stream</span>
          </div>
          <div ref={activityRef} className="max-h-[240px] overflow-y-auto space-y-1 pr-1 scroll-smooth">
            {activity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Waiting for live requests…</p>
            ) : (
              activity.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex flex-wrap gap-x-2 border-l-2 border-transparent pl-2',
                    a.status >= 500 && 'border-red-500 text-red-700 dark:text-red-300',
                    a.status < 400 && 'border-emerald-500/60',
                  )}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{a.at.slice(11, 19)}</span>
                  <span>{a.method}</span>
                  <span style={{ color: 'var(--brand-primary)' }}>{a.path}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{a.ms}ms</span>
                  <span>{a.status}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Live alerts
          </h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {alerts.map((a) => (
              <motion.div
                key={a.id}
                layout
                className={cn(
                  'rounded-lg px-3 py-2 text-xs border',
                  a.level === 'critical' &&
                    'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200',
                  a.level === 'warning' &&
                    'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100',
                  a.level === 'info' &&
                    'border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100',
                )}
              >
                <span className="font-bold">{a.title}</span>
                <p className="opacity-90 mt-0.5">{a.message}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Terminal className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          Terminal intelligence
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {TERM_CARDS.map((tc) => (
            <motion.div
              key={tc.id}
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl border p-4"
              style={{
                borderColor: 'var(--border-card)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--brand-primary)' }}>{'>'}</span>_
                <span className="ml-auto">{tc.subtitle}</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tc.title}</p>
              <div className="mt-3 max-h-[140px] overflow-y-auto font-mono text-[10px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
                {(terminals[tc.id] || ['Fetching live intel from server…']).map((line, i) => (
                  <div key={`${i}-${line.slice(0, 12)}`}>{line}</div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border transition-colors"
                  style={{
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                  }}
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_audit_packages', label: 'Run audit (sim)' })}
                >
                  Audit
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border transition-colors"
                  style={{
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                  }}
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_restart_monitor', label: 'Restart monitor (sim)' })}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_fix_deps', label: 'Fix deps (sim)' })}
                >
                  Fix now
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border transition-colors"
                  style={{
                    borderColor: 'var(--brand-border-subtle)',
                    color: 'var(--brand-primary)',
                    background: 'transparent',
                  }}
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_clear_cache', label: 'Clear API windows' })}
                >
                  Clear cache
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Engine logs</h2>
            {(['all', 'error', 'warning', 'info'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLogFilter(f)}
                className={cn(
                  'min-h-[36px] px-3 rounded-lg text-xs font-mono border',
                  logFilter === f
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200'
                    : '',
                )}
                style={
                  logFilter === f
                    ? undefined
                    : { borderColor: 'var(--border-card)', color: 'var(--text-secondary)', background: 'transparent' }
                }
              >
                {f}
              </button>
            ))}
          </div>
          <div className="max-h-[260px] overflow-y-auto space-y-1 font-mono text-[11px]">
            {filteredLogs.map((l) => (
              <div
                key={l.id}
                className={cn(
                  'rounded px-2 py-1',
                  l.level === 'error' && 'bg-red-500/10',
                  l.level === 'warning' && 'bg-amber-500/10',
                )}
              >
                <span style={{ color: 'var(--text-muted)' }}>{l.at}</span>{' '}
                <span className="uppercase text-[9px]" style={{ color: 'var(--text-muted)' }}>{l.level}</span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{l.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Thresholds</h2>
          {settings && (
            <form
              className="space-y-2 text-sm"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await fetch(`${API_BASE_URL}/system/settings`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({
                    monitoringEnabled: fd.get('monitoringEnabled') === 'on',
                    cpuWarn: Number(fd.get('cpuWarn')),
                    cpuCritical: Number(fd.get('cpuCritical')),
                    apiSlowWarnMs: Number(fd.get('apiSlowWarnMs')),
                    apiSlowCriticalMs: Number(fd.get('apiSlowCriticalMs')),
                    sensitivity: fd.get('sensitivity'),
                  }),
                });
                void loadAll();
              }}
            >
              <label className="flex items-center gap-2 min-h-[40px]" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" name="monitoringEnabled" defaultChecked={settings.monitoringEnabled} />
                Monitoring on
              </label>
              <label className="block" style={{ color: 'var(--text-secondary)' }}>
                CPU warn
                <input
                  type="number"
                  name="cpuWarn"
                  defaultValue={settings.cpuWarn}
                  className="mt-1 w-full rounded-lg border px-2 py-2"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
              </label>
              <label className="block" style={{ color: 'var(--text-secondary)' }}>
                CPU critical
                <input
                  type="number"
                  name="cpuCritical"
                  defaultValue={settings.cpuCritical}
                  className="mt-1 w-full rounded-lg border px-2 py-2"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
              </label>
              <label className="block" style={{ color: 'var(--text-secondary)' }}>
                API slow warn (ms)
                <input
                  type="number"
                  name="apiSlowWarnMs"
                  defaultValue={settings.apiSlowWarnMs ?? 1000}
                  className="mt-1 w-full rounded-lg border px-2 py-2"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
              </label>
              <label className="block" style={{ color: 'var(--text-secondary)' }}>
                API slow critical (ms)
                <input
                  type="number"
                  name="apiSlowCriticalMs"
                  defaultValue={settings.apiSlowCriticalMs ?? 3000}
                  className="mt-1 w-full rounded-lg border px-2 py-2"
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--input-text)',
                    borderColor: 'var(--border-input)',
                  }}
                />
              </label>
              <select
                name="sensitivity"
                defaultValue={settings.sensitivity}
                className="w-full rounded-lg border px-2 py-2"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--input-text)',
                  borderColor: 'var(--border-input)',
                }}
              >
                <option value="strict">strict</option>
                <option value="normal">normal</option>
                <option value="relaxed">relaxed</option>
              </select>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl font-semibold"
                style={{ background: 'var(--gradient-brand-cta)', color: 'var(--text-on-accent)' }}
              >
                Save
              </button>
            </form>
          )}
        </div>
      </div>

      <motion.div
        className="mt-8 rounded-2xl border px-4 py-3 flex flex-wrap justify-between gap-2 text-sm"
        layout
        style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Process uptime</span>
        <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
          {formatUptime(health?.uptimeSeconds)}
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          Global RPS ~ {health?.globalRequestsPerSecond?.toFixed(2) ?? '—'}
        </span>
      </motion.div>

      <AnimatePresence>
        {pendingAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="max-w-md w-full rounded-2xl border p-6 shadow-2xl"
              style={{
                background: 'var(--modal-bg)',
                borderColor: 'var(--modal-border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              <p className="text-lg font-bold">Confirm action</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{pendingAction.label}</p>
              <p className="text-xs font-mono mt-2" style={{ color: 'var(--badge-warning-text)' }}>
                Admin-only · sandbox simulation on this deployment
              </p>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)', background: 'transparent' }}
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{ background: 'var(--gradient-brand-cta)', color: 'var(--text-on-accent)' }}
                  onClick={() => {
                    const p = pendingAction;
                    setPendingAction(null);
                    if (p) void runTerminalAction(p.cardId, p.action);
                  }}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
