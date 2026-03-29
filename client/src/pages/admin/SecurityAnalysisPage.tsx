import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Radar,
  RefreshCw,
  ScanSearch,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { API_BASE_URL, SERVER_URL } from '@/lib/config';
import {
  useSecurityAnalysisUiStore,
  type SecurityOverview,
  type SecurityAnalysisUiState,
} from '@/stores/securityAnalysisUiStore';
import { cn } from '@/lib/utils';

function scoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 65) return 'text-cyan-400';
  if (score >= 45) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

export default function SecurityAnalysisPage() {
  const {
    overview,
    findings,
    surfaceNodes,
    events,
    compliance,
    authEvents,
    behaviorRows,
    setOverview,
    setFindings,
    setSurface,
    setEvents,
    setCompliance,
    setAuthActivity,
  } = useSecurityAnalysisUiStore();
  const [scanning, setScanning] = useState(false);
  const [socketTick, setSocketTick] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    const h = authHeaders();
    const read = async (path: string) => {
      const r = await fetch(`${API_BASE_URL}${path}`, { headers: h });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = typeof data?.message === 'string' ? data.message : `Request failed (${r.status})`;
        throw new Error(`${path}: ${msg}`);
      }
      return data;
    };
    try {
      const [ov, fv, sf, ev, cp, au] = await Promise.all([
        read('/security-analysis/overview'),
        read('/security-analysis/vulnerabilities'),
        read('/security-analysis/surface'),
        read('/security-analysis/events'),
        read('/security-analysis/compliance'),
        read('/security-analysis/auth-activity'),
      ]);
      if (ov && typeof ov.score === 'number') setOverview(ov);
      else setOverview(null);
      setFindings(Array.isArray(fv.findings) ? fv.findings : []);
      setSurface(Array.isArray(sf.nodes) ? sf.nodes : []);
      setEvents(Array.isArray(ev.events) ? ev.events : []);
      setCompliance(Array.isArray(cp.items) ? cp.items : []);
      setAuthActivity(Array.isArray(au.events) ? au.events : [], Array.isArray(au.behavior) ? au.behavior : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load security data';
      setLoadError(msg);
      console.error('[SecurityAnalysis]', e);
    }
  }, [authHeaders, setOverview, setFindings, setSurface, setEvents, setCompliance, setAuthActivity]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const base = SERVER_URL.replace(/\/$/, '');
    const s = io(`${base}/security`, { auth: { token }, transports: ['websocket', 'polling'] });
    s.emit('subscribe:security');
    s.on('security:scan:tick', (p: { score?: number; grade?: string }) => {
      if (typeof p?.score === 'number') setSocketTick(p.score);
    });
    s.on('security:bundle', (payload: Record<string, unknown>) => {
      const ov = payload.overview as SecurityOverview | undefined;
      if (ov && typeof ov.score === 'number') {
        setOverview(ov);
        setSocketTick(ov.score);
      }
      const fv = payload.findings as { findings?: SecurityAnalysisUiState['findings'] } | undefined;
      if (fv?.findings) setFindings(fv.findings);
      const sf = payload.surface as { nodes?: SecurityAnalysisUiState['surfaceNodes'] } | undefined;
      if (sf?.nodes) setSurface(sf.nodes);
      const ev = payload.events as { events?: SecurityAnalysisUiState['events'] } | undefined;
      if (ev?.events) setEvents(ev.events);
      const cp = payload.compliance as { items?: SecurityAnalysisUiState['compliance'] } | undefined;
      if (cp?.items) setCompliance(cp.items);
    });
    s.on('connect_error', (err) => {
      console.warn('[SecurityAnalysis] socket', err.message);
    });
    return () => {
      s.disconnect();
    };
  }, [setOverview, setFindings, setSurface, setEvents, setCompliance]);

  const displayScore = socketTick ?? overview?.score ?? 0;

  const runScan = async () => {
    setScanning(true);
    try {
      const r = await fetch(`${API_BASE_URL}/security-analysis/scan/run`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ mode: 'standard' }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setLoadError(typeof data?.message === 'string' ? data.message : `Scan failed (${r.status})`);
        return;
      }
      await load();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-w-0 max-w-[1680px] mx-auto space-y-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:bg-gradient-to-r dark:from-white dark:to-cyan-400 dark:bg-clip-text dark:text-transparent flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-cyan-400 shrink-0" />
            Security Analysis
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
            Threat surface, findings, and compliance posture — wired to live security namespace
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-gray-600 bg-gray-900/80 text-sm text-gray-100 hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            disabled={scanning}
            onClick={() => void runScan()}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-cyan-500/50 bg-cyan-500/10 text-cyan-200 text-sm hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <ScanSearch className="w-4 h-4" />
            {scanning ? 'Scanning…' : 'Run scan'}
          </button>
        </div>
      </motion.div>

      {loadError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {loadError}
          </span>
          <span className="text-xs text-red-300/80">Sign in as admin and ensure the API is reachable ({API_BASE_URL})</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="xl:col-span-1 rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-black p-6 flex flex-col items-center justify-center min-h-[240px]"
        >
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                className="stroke-gray-200 dark:stroke-white/10"
                strokeWidth="14"
              />
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                strokeDasharray={`${(displayScore / 100) * 490} 490`}
                strokeLinecap="round"
                className={scoreColor(displayScore)}
                style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.35))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
              <span className={cn('text-4xl font-mono font-bold', scoreColor(displayScore))}>{Math.round(displayScore)}</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 dark:text-gray-500 mt-1">
                {overview?.grade ?? '—'}
              </span>
            </div>
          </div>
          {overview && (
            <p className="text-xs text-gray-600 dark:text-gray-500 mt-4 text-center font-mono">
              Last scan: {overview.lastScanAt ? new Date(overview.lastScanAt).toLocaleString() : '—'} · MTTD{' '}
              {overview.mttdHours}h · MTTR {overview.mttrHours}h
            </p>
          )}
        </motion.div>

        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {overview && (
            <>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/80 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Open risk</p>
                <p className="text-2xl font-mono text-red-400 mt-1">
                  {overview.findingsSummary.critical + overview.findingsSummary.high}
                </p>
                <p className="text-[11px] text-gray-500 mt-2">
                  {overview.findingsSummary.critical} critical · {overview.findingsSummary.high} high
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/80 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Medium / low</p>
                <p className="text-2xl font-mono text-amber-300 mt-1">
                  {overview.findingsSummary.medium + overview.findingsSummary.low}
                </p>
                <p className="text-[11px] text-gray-500 mt-2">Tracked in findings table</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/80 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Passing checks</p>
                <p className="text-2xl font-mono text-emerald-400 mt-1">{overview.findingsSummary.pass}</p>
                <p className="text-[11px] text-gray-500 mt-2">Automated + manual</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-500/30 dark:border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 dark:from-violet-950/40 dark:to-gray-950/50 overflow-hidden backdrop-blur-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-violet-400" />
            Identity &amp; sign-in intelligence
          </h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
            Buyer · Seller · Admin telemetry
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200 dark:divide-gray-800">
          <div className="p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Auth stream (success / failure / blocked)
            </p>
            <div className="space-y-2 max-h-[280px] overflow-y-auto font-mono text-[11px] pr-1">
              {authEvents.length === 0 && (
                <p className="text-gray-500 italic">No sign-in events recorded yet — log in as buyer, seller, or admin to populate this feed.</p>
              )}
              {authEvents.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'rounded-lg border px-2.5 py-2',
                    a.type === 'LOGIN_FAIL' && 'border-red-500/40 bg-red-500/5',
                    a.type === 'LOGIN_OK' && 'border-emerald-500/35 bg-emerald-500/5',
                    a.type === 'LOGIN_BLOCKED' && 'border-orange-500/40 bg-orange-500/5',
                    a.type === 'ROLE_SIGNIN' && 'border-cyan-500/35 bg-cyan-500/5',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={cn(
                        'uppercase tracking-wide',
                        a.type === 'LOGIN_FAIL' && 'text-red-400',
                        a.type === 'LOGIN_OK' && 'text-emerald-400',
                        a.type === 'LOGIN_BLOCKED' && 'text-amber-400',
                        a.type === 'ROLE_SIGNIN' && 'text-cyan-400',
                      )}
                    >
                      {a.type}
                    </span>
                    {a.role && <span className="text-gray-500">· {a.role}</span>}
                    <span className="text-gray-500 ml-auto tabular-nums">
                      {new Date(a.at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 break-words">{a.detail}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    IP {a.ip}
                    {a.email ? ` · ${a.email}` : ''}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="p-4 min-w-0">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              User &amp; seller signals (moved from System Analysis)
            </p>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-left text-xs min-w-[420px]">
                <thead className="text-gray-500 uppercase sticky top-0 bg-white/95 dark:bg-gray-950/95">
                  <tr>
                    <th className="py-1.5 pr-2">Role</th>
                    <th className="py-1.5 pr-2">Action</th>
                    <th className="py-1.5 pr-2">Detail</th>
                    <th className="py-1.5 pr-2">Risk</th>
                    <th className="py-1.5 pr-2">Status</th>
                    <th className="py-1.5">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {behaviorRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-gray-500 italic">
                        No behavior rows yet.
                      </td>
                    </tr>
                  )}
                  {behaviorRows.map((b) => (
                    <tr
                      key={`${b.userId}-${b.at}-${b.action}`}
                      className={cn(
                        'border-t border-gray-200 dark:border-gray-800',
                        b.risk === 'HIGH' && 'bg-red-500/5',
                        b.risk === 'MEDIUM' && 'bg-amber-500/5',
                      )}
                    >
                      <td className="py-2 pr-2 font-mono text-cyan-300">{b.role}</td>
                      <td className="py-2 pr-2 max-w-[120px] truncate" title={b.action}>
                        {b.action}
                      </td>
                      <td className="py-2 pr-2 max-w-[180px] truncate text-gray-500" title={b.detail}>
                        {b.detail || '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={cn(
                            b.risk === 'HIGH' && 'text-red-400',
                            b.risk === 'MEDIUM' && 'text-amber-400',
                            b.risk === 'LOW' && 'text-emerald-400',
                          )}
                        >
                          {b.risk}
                        </span>
                      </td>
                      <td className="py-2 pr-2">{b.status}</td>
                      <td className="py-2 whitespace-nowrap text-gray-500">{new Date(b.at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/50 p-4 min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Radar className="w-4 h-4 text-cyan-400" />
            Attack surface (seed + API)
          </h2>
          <div className="flex flex-wrap gap-2">
            {surfaceNodes.map((n) => (
              <span
                key={n.id}
                className={cn(
                  'text-[10px] font-mono px-2 py-1 rounded-lg border',
                  n.severity === 'CRITICAL' && 'border-red-500/50 text-red-300',
                  n.severity === 'HIGH' && 'border-orange-500/50 text-orange-200',
                  n.severity === 'MEDIUM' && 'border-amber-500/40 text-amber-200',
                  n.severity === 'LOW' && 'border-gray-600 text-gray-300',
                  n.severity === 'OK' && 'border-emerald-500/40 text-emerald-200',
                )}
                title={n.label}
              >
                {n.shortLabel} · {n.ring}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/50 p-4 min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            Sub-scores
          </h2>
          {overview?.subScores && (
            <div className="space-y-2 text-xs font-mono">
              {Object.entries(overview.subScores).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-gray-500 capitalize">{k}</span>
                  <span className="text-cyan-300">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Vulnerability findings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="bg-gray-100/80 dark:bg-black/40 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Component</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id} className="border-t border-gray-200 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-300 whitespace-nowrap">{f.severity}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-xs">{f.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{f.component}</td>
                  <td className="px-4 py-3 text-xs">{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/50 p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Compliance (OWASP + internal)
          </h2>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {compliance.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800/80 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
              >
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{c.title}</p>
                  <p className="text-[11px] text-gray-500">{c.description}</p>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase shrink-0',
                    c.status === 'PASS' && 'text-emerald-400',
                    c.status === 'FAIL' && 'text-red-400',
                    c.status === 'PARTIAL' && 'text-amber-300',
                    c.status === 'NEEDS_REVIEW' && 'text-gray-400',
                  )}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/50 p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Security events</h2>
          <div className="space-y-3 max-h-[360px] overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="border-l-2 border-cyan-500/50 pl-3">
                <p className="text-xs font-mono text-cyan-400">{e.type}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{e.title}</p>
                <p className="text-[11px] text-gray-500">{e.description}</p>
                <p className="text-[10px] text-gray-600 mt-1">{e.at}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
