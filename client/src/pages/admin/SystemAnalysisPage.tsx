import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Server,
  ShieldAlert,
  Wifi,
} from 'lucide-react';
import { API_BASE_URL, SERVER_URL } from '@/lib/config';
import { useSystemAnalysisUiStore } from '@/stores/systemAnalysisUiStore';
import { cn } from '@/lib/utils';

function toneBar(v: number) {
  if (v < 70) return 'bg-emerald-500';
  if (v <= 85) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function SystemAnalysisPage() {
  const {
    health,
    endpoints,
    behavior,
    logs,
    settings,
    logFilter,
    setHealth,
    setEndpoints,
    setBehavior,
    setLogs,
    prependLog,
    setSettings,
    setLogFilter,
  } = useSystemAnalysisUiStore();

  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const loadAll = useCallback(async () => {
    const h = authHeaders();
    const [he, api, be, lg, st] = await Promise.all([
      fetch(`${API_BASE_URL}/system/health`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/system/apis`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/system/users/behavior`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/system/logs`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/system/settings`, { headers: h }).then((r) => r.json()),
    ]);
    setHealth(he);
    setEndpoints(api.endpoints ?? []);
    setBehavior(be.rows ?? []);
    setLogs(lg.logs ?? []);
    setSettings(st.settings ?? null);
  }, [authHeaders, setHealth, setEndpoints, setBehavior, setLogs, setSettings]);

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
    socketRef.current = s;
    s.on('connect', () => setSocketConnected(true));
    s.on('disconnect', () => setSocketConnected(false));
    s.emit('subscribe:system');
    s.on('system:health:update', (payload: unknown) => setHealth(payload as never));
    s.on('system:api:update', (payload: { endpoints?: typeof endpoints }) => {
      if (payload?.endpoints) setEndpoints(payload.endpoints);
    });
    s.on('system:log:new', (entry: { id: string; level: string; message: string; at: string }) => {
      prependLog(entry);
    });
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [prependLog, setEndpoints, setHealth]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.level === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="min-w-0 max-w-[1600px] mx-auto space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-emerald-500" />
            System Analysis
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Live health, API timing, and behavior signals — real-time stream
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-xs font-mono px-2 py-1 rounded-full border',
              socketConnected
                ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                : 'border-amber-500/40 text-amber-700 dark:text-amber-200',
            )}
          >
            {socketConnected ? '● LIVE' : '○ SOCKET'}
          </span>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'CPU',
            value: health?.cpuPercent ?? 0,
            icon: Cpu,
          },
          {
            label: 'RAM',
            value: health?.ramPercent ?? 0,
            icon: Server,
          },
          {
            label: 'Disk',
            value: health?.diskPercent ?? 0,
            icon: HardDrive,
          },
          {
            label: 'Uptime',
            value: health ? formatUptime(health.uptimeSeconds) : '—',
            icon: Wifi,
            text: true,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {card.label}
              </span>
              <card.icon className="w-4 h-4 text-emerald-500" />
            </div>
            {'text' in card && card.text ? (
              <p className="text-xl font-mono text-gray-900 dark:text-white">{card.value}</p>
            ) : (
              <>
                <p className="text-2xl font-mono text-gray-900 dark:text-white">
                  {typeof card.value === 'number' ? `${card.value.toFixed(1)}%` : card.value}
                </p>
                <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', toneBar(Number(card.value)))}
                    style={{ width: `${Math.min(100, Number(card.value))}%` }}
                  />
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 p-4 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-500" />
            API monitor
          </h2>
          <div className="overflow-x-auto -mx-2 px-2 max-h-[320px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-2 pr-2">Endpoint</th>
                  <th className="pb-2 pr-2">Avg ms</th>
                  <th className="pb-2 pr-2">Req</th>
                  <th className="pb-2">Err</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      Traffic will appear as API calls are recorded.
                    </td>
                  </tr>
                ) : (
                  endpoints.map((row) => (
                    <tr
                      key={row.endpoint}
                      className={cn(
                        'border-b border-gray-100 dark:border-gray-800/80',
                        row.avgResponseMs > 2000 && 'bg-amber-500/5',
                        row.lastStatus === 'ERROR' && 'bg-red-500/5',
                      )}
                    >
                      <td className="py-2 pr-2 font-mono text-xs break-all max-w-[180px]">
                        {row.endpoint}
                      </td>
                      <td className="py-2 pr-2">{row.avgResponseMs}</td>
                      <td className="py-2 pr-2">{row.requests}</td>
                      <td className="py-2">{row.errors}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 p-4 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            User & seller signals
          </h2>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {behavior.map((row) => (
              <div
                key={`${row.userId}-${row.at}`}
                className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{row.userId}</span>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                      row.risk === 'HIGH' && 'bg-red-500/15 text-red-600',
                      row.risk === 'MEDIUM' && 'bg-amber-500/15 text-amber-700',
                      row.risk === 'LOW' && 'bg-emerald-500/15 text-emerald-700',
                    )}
                  >
                    {row.risk}
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 mt-1">{row.detail}</p>
                <p className="text-[10px] text-gray-500 mt-1">{row.at}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 p-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logs</h2>
            {(['all', 'error', 'warning', 'info'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLogFilter(f)}
                className={cn(
                  'min-h-[36px] px-3 rounded-lg text-xs font-mono border',
                  logFilter === f
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="max-h-[280px] overflow-y-auto space-y-1 font-mono text-xs">
            {filteredLogs.map((l) => (
              <div
                key={l.id}
                className={cn(
                  'rounded-lg px-2 py-1 border border-transparent',
                  l.level === 'error' && 'bg-red-500/10 border-red-500/20',
                  l.level === 'warning' && 'bg-amber-500/10 border-amber-500/20',
                )}
              >
                <span className="text-gray-500">{l.at}</span>{' '}
                <span className="uppercase text-[10px]">{l.level}</span> {l.message}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Thresholds</h2>
          {settings && (
            <form
              className="space-y-3 text-sm"
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
                    sensitivity: fd.get('sensitivity'),
                  }),
                });
                void loadAll();
              }}
            >
              <label className="flex items-center gap-2 min-h-[44px]">
                <input type="checkbox" name="monitoringEnabled" defaultChecked={settings.monitoringEnabled} />
                Monitoring enabled
              </label>
              <label className="block">
                CPU warn %
                <input
                  type="number"
                  name="cpuWarn"
                  defaultValue={settings.cpuWarn}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 min-h-[44px]"
                />
              </label>
              <label className="block">
                CPU critical %
                <input
                  type="number"
                  name="cpuCritical"
                  defaultValue={settings.cpuCritical}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 min-h-[44px]"
                />
              </label>
              <label className="block">
                Sensitivity
                <select
                  name="sensitivity"
                  defaultValue={settings.sensitivity}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 min-h-[44px]"
                >
                  <option value="strict">strict</option>
                  <option value="normal">normal</option>
                  <option value="relaxed">relaxed</option>
                </select>
              </label>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
              >
                Save settings
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
