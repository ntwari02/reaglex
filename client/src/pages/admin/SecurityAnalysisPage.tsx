import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  AlertTriangle,
  CheckCircle2,
  Radar,
  RefreshCw,
  ScanSearch,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { API_BASE_URL, SERVER_URL } from '@/lib/config';
import { useSecurityAnalysisUiStore } from '@/stores/securityAnalysisUiStore';
import { cn } from '@/lib/utils';

function scoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 65) return 'text-cyan-400';
  if (score >= 45) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

export default function SecurityAnalysisPage() {
  const { overview, findings, surfaceNodes, events, compliance, setOverview, setFindings, setSurface, setEvents, setCompliance } =
    useSecurityAnalysisUiStore();
  const [scanning, setScanning] = useState(false);
  const [socketTick, setSocketTick] = useState<number | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const load = useCallback(async () => {
    const h = authHeaders();
    const [ov, fv, sf, ev, cp] = await Promise.all([
      fetch(`${API_BASE_URL}/security-analysis/overview`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/security-analysis/vulnerabilities`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/security-analysis/surface`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/security-analysis/events`, { headers: h }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/security-analysis/compliance`, { headers: h }).then((r) => r.json()),
    ]);
    setOverview(ov);
    setFindings(fv.findings ?? []);
    setSurface(sf.nodes ?? []);
    setEvents(ev.events ?? []);
    setCompliance(cp.items ?? []);
  }, [authHeaders, setOverview, setFindings, setSurface, setEvents, setCompliance]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const base = SERVER_URL.replace(/\/$/, '');
    const s = io(`${base}/security`, { auth: { token }, transports: ['websocket', 'polling'] });
    s.emit('subscribe:security');
    s.on('security:scan:tick', (p: { score?: number }) => {
      if (typeof p?.score === 'number') setSocketTick(p.score);
    });
    return () => {
      s.disconnect();
    };
  }, []);

  const displayScore = socketTick ?? overview?.score ?? 0;

  const runScan = async () => {
    setScanning(true);
    try {
      await fetch(`${API_BASE_URL}/security-analysis/scan/run`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ mode: 'standard' }),
      });
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
