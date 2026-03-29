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

function toneForMetric(v: number, warn = 70, crit = 85) {
  if (v < warn) return { bar: 'bg-emerald-500', glow: 'shadow-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-300' };
  if (v <= crit) return { bar: 'bg-amber-500', glow: 'shadow-amber-500/25', text: 'text-amber-700 dark:text-amber-200' };
  return { bar: 'bg-red-500', glow: 'shadow-red-500/30', text: 'text-red-600 dark:text-red-300' };
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
  { id: 'perf', title: 'Latency core', subtitle: 'API timing & saturation' },
  { id: 'deps', title: 'Dependencies', subtitle: 'Package intelligence (sim)' },
  { id: 'svc', title: 'Services', subtitle: 'Gateway & workers' },
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
    setGlobalStatus,
    setBuckets24h,
    setTerminals,
    setLogs,
    prependLog,
    prependActivity,
    setSettings,
    setLogFilter,
    applyBundle,
  } = useSystemAnalysisUiStore();

  const [socketConnected, setSocketConnected] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
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

  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

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
      className="relative min-w-0 max-w-[1920px] mx-auto pb-12 overflow-hidden"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
    >
      <div
        className="pointer-events-none fixed w-[420px] h-[420px] rounded-full opacity-[0.12] blur-3xl -z-10 transition-transform duration-700"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #22d3ee, transparent 55%, #a855f7)',
          left: cursor.x - 210,
          top: cursor.y - 210,
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[length:48px_48px] dark:opacity-40" />

      <AnimatePresence>
        {alerts.filter((a) => a.level === 'critical').slice(0, 2).map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0, transition: { type: 'spring', damping: 18 } }}
            className="fixed right-4 top-20 z-50 max-w-sm rounded-xl border border-red-500/50 bg-red-950/90 backdrop-blur-md px-4 py-3 text-sm text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.35)] animate-[pulse_3s_ease-in-out_infinite]"
          >
            <p className="font-bold">{a.title}</p>
            <p className="text-red-200/90 text-xs mt-1">{a.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </span>
            System Analysis
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
            Real-time API intelligence, live kernel metrics, and terminal-grade controls — cyber-ops control surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className={cn(
              'text-xs font-mono px-3 py-1.5 rounded-full border backdrop-blur-sm',
              socketConnected
                ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/10',
            )}
          >
            {socketConnected ? '● STREAM' : '○ SOCKET'}
          </span>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md text-sm font-medium hover:bg-white dark:hover:bg-slate-800"
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
            'mb-6 rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3 backdrop-blur-md',
            globalStatus.level === 'operational' && 'border-emerald-500/30 bg-emerald-500/5',
            globalStatus.level === 'degraded' && 'border-amber-500/35 bg-amber-500/10',
            globalStatus.level === 'outage' && 'border-red-500/40 bg-red-500/10',
          )}
        >
          <span className="text-xs font-mono uppercase tracking-widest text-gray-500">Global</span>
          <span className="font-semibold text-gray-900 dark:text-white">{globalStatus.label}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{globalStatus.detail}</span>
        </motion.div>
      )}

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
                'relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 p-4',
                'bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl shadow-lg',
                tone.glow,
              )}
            >
              <motion.div
                className="absolute inset-0 opacity-[0.08] bg-gradient-to-br from-cyan-500 via-transparent to-violet-600"
                animate={{ opacity: [0.06, 0.12, 0.06] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <div className="relative flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{card.label}</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">{card.hint}</p>
                </div>
                <card.icon className={cn('w-5 h-5', tone.text)} />
              </div>
              <p className={cn('relative text-3xl font-mono font-bold', tone.text)}>
                {Number(card.value).toFixed(1)}%
              </p>
              <div className="relative mt-2 h-2 rounded-full bg-gray-200/80 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', tone.bar)}
                  initial={false}
                  animate={{ width: `${Math.min(100, Number(card.value))}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>
              {isCpu && (
                <div className="relative mt-2 text-cyan-600 dark:text-cyan-400">
                  <MiniSparkline values={card.trend ?? []} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
        <div className="xl:col-span-1 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Uptime pulse (24h)</h3>
          <div className="flex items-end gap-1 h-24">
            {(buckets24h.length ? buckets24h : Array(24).fill(50)).map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(100, h)}%` }}
                className="flex-1 min-w-0 rounded-t bg-gradient-to-t from-emerald-600/80 to-cyan-400/90 opacity-90 hover:opacity-100"
                title={`Hour ${i + 1}: ${h.toFixed(0)}%`}
              />
            ))}
          </div>
        </div>
        <div className="xl:col-span-3 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-500" />
              API intelligence
            </h2>
            <span className="text-[10px] font-mono text-gray-500">
              RPS · latency · errors · codes
            </span>
          </div>
          <div className="overflow-x-auto -mx-2 px-2 max-h-[380px] overflow-y-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-gray-500 text-[10px] uppercase border-b border-gray-200 dark:border-white/10">
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
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      Send traffic to <code className="font-mono text-cyan-600">/api/*</code> — metrics appear instantly.
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
                          'border-b border-gray-100 dark:border-white/5',
                          slow === 'critical' && 'bg-red-500/10 shadow-[inset_0_0_12px_rgba(239,68,68,0.15)]',
                          slow === 'warn' && 'bg-amber-500/10',
                          row.lastStatus === 'ERROR' && 'ring-1 ring-red-500/30',
                        )}
                      >
                        <td className="py-2 pr-2 font-mono text-[11px] break-all max-w-[280px] text-gray-900 dark:text-gray-100">
                          <span className="text-cyan-600 dark:text-cyan-400 mr-1">{row.method || '—'}</span>
                          {row.endpoint}
                        </td>
                        <td className="py-2 pr-2 font-mono">{row.rps != null ? row.rps.toFixed(2) : '—'}</td>
                        <td className="py-2 pr-2 font-mono">{row.avgResponseMs}ms</td>
                        <td className="py-2 pr-2">{row.errorRatePercent?.toFixed(1) ?? 0}%</td>
                        <td className="py-2 w-32">
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
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
        <div className="rounded-2xl border border-white/10 bg-black/80 dark:bg-black/60 backdrop-blur-xl p-4 font-mono text-[11px] text-emerald-300 min-h-[220px]">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Terminal className="w-4 h-4" />
            <span className="uppercase tracking-widest">Activity stream</span>
          </div>
          <div ref={activityRef} className="max-h-[240px] overflow-y-auto space-y-1 pr-1 scroll-smooth">
            {activity.length === 0 ? (
              <p className="text-gray-600">Waiting for live requests…</p>
            ) : (
              activity.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex flex-wrap gap-x-2 border-l-2 border-transparent pl-2',
                    a.status >= 500 && 'border-red-500 text-red-300',
                    a.status < 400 && 'border-emerald-500/60',
                  )}
                >
                  <span className="text-gray-500">{a.at.slice(11, 19)}</span>
                  <span>{a.method}</span>
                  <span className="text-cyan-400">{a.path}</span>
                  <span className="text-gray-500">{a.ms}ms</span>
                  <span>{a.status}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Live alerts</h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {alerts.map((a) => (
              <motion.div
                key={a.id}
                layout
                className={cn(
                  'rounded-lg px-3 py-2 text-xs border',
                  a.level === 'critical' && 'border-red-500/40 bg-red-500/10 text-red-200',
                  a.level === 'warning' && 'border-amber-500/40 bg-amber-500/10 text-amber-100',
                  a.level === 'info' && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100',
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-violet-400" />
          Terminal intelligence
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {TERM_CARDS.map((tc) => (
            <motion.div
              key={tc.id}
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-slate-900/90 to-black/90 p-4 text-gray-200 shadow-[0_0_24px_rgba(139,92,246,0.12)]"
            >
              <div className="flex items-center gap-2 mb-2 text-violet-300 text-xs font-mono">
                <span>{'>'}</span>_
                <span className="text-gray-500 ml-auto">{tc.subtitle}</span>
              </div>
              <p className="text-sm font-semibold text-white">{tc.title}</p>
              <div className="mt-3 max-h-[140px] overflow-y-auto font-mono text-[10px] space-y-1 text-emerald-400/90">
                {(terminals[tc.id] || ['[boot] channel ready…']).map((line, i) => (
                  <div key={`${i}-${line.slice(0, 12)}`}>{line}</div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border border-white/20 hover:bg-white/10"
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_audit_packages', label: 'Run audit (sim)' })}
                >
                  Audit
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border border-white/20 hover:bg-white/10"
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_restart_monitor', label: 'Restart monitor (sim)' })}
                >
                  Restart
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => setPendingAction({ cardId: tc.id, action: 'simulate_fix_deps', label: 'Fix deps (sim)' })}
                >
                  Fix now
                </button>
                <button
                  type="button"
                  className="text-[10px] px-2 py-1 rounded border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
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
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Engine logs</h2>
            {(['all', 'error', 'warning', 'info'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLogFilter(f)}
                className={cn(
                  'min-h-[36px] px-3 rounded-lg text-xs font-mono border',
                  logFilter === f
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200'
                    : 'border-gray-200 dark:border-white/10 text-gray-600',
                )}
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
                <span className="text-gray-500">{l.at}</span> <span className="uppercase text-[9px]">{l.level}</span> {l.message}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Thresholds</h2>
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
              <label className="flex items-center gap-2 min-h-[40px] text-gray-800 dark:text-gray-200">
                <input type="checkbox" name="monitoringEnabled" defaultChecked={settings.monitoringEnabled} />
                Monitoring on
              </label>
              <label className="block text-gray-700 dark:text-gray-300">
                CPU warn
                <input type="number" name="cpuWarn" defaultValue={settings.cpuWarn} className="mt-1 w-full rounded-lg border dark:bg-slate-950 px-2 py-2" />
              </label>
              <label className="block text-gray-700 dark:text-gray-300">
                CPU critical
                <input type="number" name="cpuCritical" defaultValue={settings.cpuCritical} className="mt-1 w-full rounded-lg border dark:bg-slate-950 px-2 py-2" />
              </label>
              <label className="block text-gray-700 dark:text-gray-300">
                API slow warn (ms)
                <input type="number" name="apiSlowWarnMs" defaultValue={settings.apiSlowWarnMs ?? 1000} className="mt-1 w-full rounded-lg border dark:bg-slate-950 px-2 py-2" />
              </label>
              <label className="block text-gray-700 dark:text-gray-300">
                API slow critical (ms)
                <input type="number" name="apiSlowCriticalMs" defaultValue={settings.apiSlowCriticalMs ?? 3000} className="mt-1 w-full rounded-lg border dark:bg-slate-950 px-2 py-2" />
              </label>
              <select name="sensitivity" defaultValue={settings.sensitivity} className="w-full rounded-lg border dark:bg-slate-950 px-2 py-2">
                <option value="strict">strict</option>
                <option value="normal">normal</option>
                <option value="relaxed">relaxed</option>
              </select>
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold">
                Save
              </button>
            </form>
          )}
        </div>
      </div>

      <motion.div
        className="mt-8 rounded-2xl border border-white/10 bg-white/40 dark:bg-slate-900/30 px-4 py-3 flex flex-wrap justify-between gap-2 text-sm"
        layout
      >
        <span className="text-gray-600 dark:text-gray-400">Process uptime</span>
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          {formatUptime(health?.uptimeSeconds)}
        </span>
        <span className="text-gray-500 font-mono text-xs">
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
              className="max-w-md w-full rounded-2xl border border-white/20 bg-slate-900 p-6 text-white shadow-2xl"
            >
              <p className="text-lg font-bold">Confirm action</p>
              <p className="text-sm text-gray-400 mt-2">{pendingAction.label}</p>
              <p className="text-xs font-mono text-amber-300/90 mt-2">
                Admin-only · sandbox simulation on this deployment
              </p>
              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 rounded-lg border border-white/20" onClick={() => setPendingAction(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-emerald-600 font-semibold"
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
