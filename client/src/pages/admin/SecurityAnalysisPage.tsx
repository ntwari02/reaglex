import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
import { useToastStore } from '@/stores/toastStore';
import { LiveRoleCards } from '@/components/security/LiveRoleCards';
import { ActivityStreamPanel } from '@/components/security/ActivityStreamPanel';
import { SessionViewerPanel } from '@/components/security/SessionViewerPanel';
import { RiskPanel } from '@/components/security/RiskPanel';
import { NotificationsPanel } from '@/components/security/NotificationsPanel';
import { AuditTimeline } from '@/components/security/AuditTimeline';
import type { IntelligenceBundle } from '@/components/security/securityIntelTypes';

function scoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 65) return 'text-cyan-400';
  if (score >= 45) return 'text-amber-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function buildEmptyWeekly(): IntelligenceBundle['weekly'] {
  const days: IntelligenceBundle['weekly']['days'] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), events: 0, highSeverity: 0 });
  }
  return {
    days,
    topRiskyUsers: [],
    blockedOrFlagged: 0,
    peakSuspiciousHourUtc: null,
  };
}

const emptyIntel = (): IntelligenceBundle => ({
  liveCards: [
    {
      role: 'buyer',
      onlineCount: 0,
      activeSessions: 0,
      currentActions: [],
      riskIndicator: 'low',
      avgSessionDurationSec: 0,
      topIpsSample: [],
    },
    {
      role: 'seller',
      onlineCount: 0,
      activeSessions: 0,
      currentActions: [],
      riskIndicator: 'low',
      avgSessionDurationSec: 0,
      topIpsSample: [],
    },
    {
      role: 'admin',
      onlineCount: 0,
      activeSessions: 0,
      currentActions: [],
      riskIndicator: 'low',
      avgSessionDurationSec: 0,
      topIpsSample: [],
    },
  ],
  activity: [],
  sessions: [],
  riskSamples: [],
  alerts: [],
  weekly: buildEmptyWeekly(),
  inAppUnread: 0,
});

export default function SecurityAnalysisPage() {
  const showToast = useToastStore((s) => s.showToast);
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

  const [intel, setIntel] = useState<IntelligenceBundle>(emptyIntel);
  const [intelConnected, setIntelConnected] = useState(false);
  const [postureOpen, setPostureOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [socketTick, setSocketTick] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const seenAlertIds = useRef<Set<string>>(new Set());
  const intelHydrated = useRef(false);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const applyIntelligence = useCallback(
    (data: Partial<IntelligenceBundle> & Record<string, unknown>) => {
      setIntel((prev) => ({
        ...prev,
        liveCards: Array.isArray(data.liveCards) ? data.liveCards : prev.liveCards,
        activity: Array.isArray(data.activity) ? data.activity : prev.activity,
        sessions: Array.isArray(data.sessions) ? data.sessions : prev.sessions,
        riskSamples: Array.isArray(data.riskSamples) ? data.riskSamples : prev.riskSamples,
        alerts: Array.isArray(data.alerts) ? data.alerts : prev.alerts,
        weekly: data.weekly && typeof data.weekly === 'object' ? (data.weekly as IntelligenceBundle['weekly']) : prev.weekly,
        inAppUnread: typeof data.inAppUnread === 'number' ? data.inAppUnread : prev.inAppUnread,
        ts: typeof data.ts === 'string' ? data.ts : prev.ts,
      }));

      const alerts = Array.isArray(data.alerts) ? data.alerts : [];
      if (!intelHydrated.current) {
        intelHydrated.current = true;
        for (const a of alerts) {
          if (a?.id) seenAlertIds.current.add(a.id);
        }
      } else {
        for (const a of alerts.slice(0, 8)) {
          if (a?.id && !seenAlertIds.current.has(a.id)) {
            seenAlertIds.current.add(a.id);
            while (seenAlertIds.current.size > 200) {
              const first = seenAlertIds.current.values().next().value as string | undefined;
              if (first === undefined) break;
              seenAlertIds.current.delete(first);
            }
            if (a.riskScore >= 45) {
              showToast(
                `[SOC] ${a.title}`,
                a.riskScore >= 80 ? 'error' : a.riskScore >= 50 ? 'warning' : 'info',
                4200,
              );
            }
          }
        }
      }
    },
    [showToast],
  );

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
      const [ov, fv, sf, ev, cp, au, intelData] = await Promise.all([
        read('/security-analysis/overview'),
        read('/security-analysis/vulnerabilities'),
        read('/security-analysis/surface'),
        read('/security-analysis/events'),
        read('/security-analysis/compliance'),
        read('/security-analysis/auth-activity'),
        read('/security-analysis/intelligence').catch(() => null),
      ]);
      if (ov && typeof ov.score === 'number') setOverview(ov);
      else setOverview(null);
      setFindings(Array.isArray(fv.findings) ? fv.findings : []);
      setSurface(Array.isArray(sf.nodes) ? sf.nodes : []);
      setEvents(Array.isArray(ev.events) ? ev.events : []);
      setCompliance(Array.isArray(cp.items) ? cp.items : []);
      setAuthActivity(Array.isArray(au.events) ? au.events : [], Array.isArray(au.behavior) ? au.behavior : []);
      if (intelData && typeof intelData === 'object') applyIntelligence(intelData as IntelligenceBundle);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load security data';
      setLoadError(msg);
      console.error('[SecurityAnalysis]', e);
    }
  }, [authHeaders, setOverview, setFindings, setSurface, setEvents, setCompliance, setAuthActivity, applyIntelligence]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (intelConnected) return;
      void fetch(`${API_BASE_URL}/security-analysis/intelligence`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) applyIntelligence(d);
        })
        .catch(() => {});
    }, 5000);
    return () => window.clearInterval(t);
  }, [authHeaders, applyIntelligence, intelConnected]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const base = SERVER_URL.replace(/\/$/, '');
    const s = io(`${base}/security`, { auth: { token }, transports: ['websocket', 'polling'] });
    s.emit('subscribe:security');
    s.on('connect', () => setIntelConnected(true));
    s.on('disconnect', () => setIntelConnected(false));
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
    s.on('security:intelligence', (payload: IntelligenceBundle & { ts?: string }) => {
      applyIntelligence(payload);
    });
    s.on('connect_error', (err) => {
      console.warn('[SecurityAnalysis] socket', err.message);
      setIntelConnected(false);
    });
    return () => {
      s.disconnect();
    };
  }, [setOverview, setFindings, setSurface, setEvents, setCompliance, applyIntelligence]);

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

  const pageShell = useMemo(
    () =>
      'relative min-h-full rounded-3xl border border-cyan-500/15 bg-[#050814] text-slate-200 shadow-[0_0_80px_-20px_rgba(34,211,238,0.15)] overflow-hidden',
    [],
  );

  return (
    <div className={cn('min-w-0 max-w-[1800px] mx-auto pb-12', pageShell)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.12),transparent)] pointer-events-none" />
      <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-600/30 border border-white/10 shadow-[0_0_30px_-5px_rgba(34,211,238,0.5)]">
                <ShieldCheck className="w-6 h-6 text-cyan-300" />
              </span>
              <span className="bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">
                Security Intelligence Control Room
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Live SOC-style monitoring, virtual session reconstruction, risk scoring, and automated alert routing — without exposing credentials or payment data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={intelConnected ? 'on' : 'off'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border flex items-center gap-2',
                  intelConnected
                    ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                    : 'border-amber-500/40 text-amber-200 bg-amber-500/10',
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    intelConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400',
                  )}
                />
                {intelConnected ? 'Intel stream' : 'Polling fallback'}
              </motion.span>
            </AnimatePresence>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              disabled={scanning}
              onClick={() => void runScan()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 text-sm hover:bg-cyan-500/20 disabled:opacity-50 transition-colors shadow-[0_0_20px_-5px_rgba(34,211,238,0.4)]"
            >
              <ScanSearch className="w-4 h-4" />
              {scanning ? 'Scanning…' : 'Run scan'}
            </button>
          </div>
        </motion.div>

        {loadError && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {loadError}
            </span>
          </div>
        )}

        {/* Score + live role cards */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="xl:col-span-4 rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-xl p-6 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,211,238,0.08),transparent_55%)] opacity-80" />
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                <circle cx="100" cy="100" r="78" fill="none" className="stroke-slate-800" strokeWidth="14" />
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
                  style={{ filter: 'drop-shadow(0 0 14px rgba(34,211,238,0.45))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-mono font-bold', scoreColor(displayScore))}>
                  {Math.round(displayScore)}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 mt-1">
                  {overview?.grade ?? '—'}
                </span>
              </div>
            </div>
            {overview && (
              <p className="relative text-xs text-slate-500 mt-4 text-center font-mono">
                Last scan: {overview.lastScanAt ? new Date(overview.lastScanAt).toLocaleString() : '—'} · MTTD{' '}
                {overview.mttdHours}h · MTTR {overview.mttrHours}h
              </p>
            )}
          </motion.div>

          <div className="xl:col-span-8 space-y-4">
            <LiveRoleCards cards={intel.liveCards} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {overview && (
                <>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Open risk</p>
                    <p className="text-2xl font-mono text-red-400 mt-1">
                      {overview.findingsSummary.critical + overview.findingsSummary.high}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Medium / low</p>
                    <p className="text-2xl font-mono text-amber-300 mt-1">
                      {overview.findingsSummary.medium + overview.findingsSummary.low}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Passing</p>
                    <p className="text-2xl font-mono text-emerald-400 mt-1">{overview.findingsSummary.pass}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Activity + session viewer + risk + notifications */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ActivityStreamPanel events={intel.activity} live={intelConnected} />
          <SessionViewerPanel sessions={intel.sessions} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskPanel samples={intel.riskSamples} />
          <NotificationsPanel alerts={intel.alerts} unread={intel.inAppUnread} />
        </div>

        <AuditTimeline weekly={intel.weekly} />

        {/* Identity & sign-in (existing) */}
        <div className="rounded-2xl border border-violet-500/25 bg-slate-950/40 backdrop-blur-md overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-violet-400" />
              Identity &amp; sign-in intelligence
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Buyer · Seller · Admin telemetry
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-white/10">
            <div className="p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Auth stream
              </p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto font-mono text-[11px] pr-1">
                {authEvents.length === 0 && (
                  <p className="text-slate-500 italic">No sign-in events yet.</p>
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
                      <span className="text-slate-300">{a.type}</span>
                      {a.role && <span className="text-slate-500">· {a.role}</span>}
                      <span className="text-slate-500 ml-auto tabular-nums">{new Date(a.at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 mt-1 break-words">{a.detail}</p>
                    <p className="text-[10px] text-slate-500 mt-1">IP {a.ip}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="p-4 min-w-0">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Behavior signals
              </p>
              <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                <table className="w-full text-left text-xs min-w-[400px]">
                  <thead className="text-slate-500 uppercase sticky top-0 bg-slate-950/95">
                    <tr>
                      <th className="py-1.5 pr-2">Role</th>
                      <th className="py-1.5 pr-2">Action</th>
                      <th className="py-1.5 pr-2">Risk</th>
                      <th className="py-1.5">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {behaviorRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-slate-500 italic">
                          No behavior rows yet.
                        </td>
                      </tr>
                    )}
                    {behaviorRows.map((b) => (
                      <tr key={`${b.userId}-${b.at}-${b.action}`} className="border-t border-white/5">
                        <td className="py-2 pr-2 font-mono text-cyan-300">{b.role}</td>
                        <td className="py-2 pr-2 max-w-[140px] truncate">{b.action}</td>
                        <td className="py-2 pr-2 text-slate-300">{b.risk}</td>
                        <td className="py-2 whitespace-nowrap text-slate-500">{new Date(b.at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible posture */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setPostureOpen((o) => !o)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Radar className="w-4 h-4 text-cyan-400" />
              Security posture &amp; compliance (scan results)
            </span>
            <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', postureOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {postureOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10 px-4 pb-6 space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <Radar className="w-4 h-4 text-cyan-400" />
                      Attack surface
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {surfaceNodes.map((n) => (
                        <span
                          key={n.id}
                          className={cn(
                            'text-[10px] font-mono px-2 py-1 rounded-lg border',
                            n.severity === 'CRITICAL' && 'border-red-500/50 text-red-300',
                            n.severity === 'HIGH' && 'border-orange-500/50 text-orange-200',
                            n.severity === 'MEDIUM' && 'border-amber-500/40 text-amber-200',
                            n.severity === 'LOW' && 'border-slate-600 text-slate-300',
                            n.severity === 'OK' && 'border-emerald-500/40 text-emerald-200',
                          )}
                        >
                          {n.shortLabel} · {n.ring}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">Sub-scores</h3>
                    {overview?.subScores && (
                      <div className="space-y-2 text-xs font-mono">
                        {Object.entries(overview.subScores).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-slate-500 capitalize">{k}</span>
                            <span className="text-cyan-300">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold">Vulnerability findings</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[640px]">
                      <thead className="text-slate-500 text-xs uppercase bg-black/30">
                        <tr>
                          <th className="px-4 py-2">Severity</th>
                          <th className="px-4 py-2">Title</th>
                          <th className="px-4 py-2">Component</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {findings.map((f) => (
                          <tr key={f.id} className="border-t border-white/5 hover:bg-white/5">
                            <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-300 whitespace-nowrap">
                              {f.severity}
                            </td>
                            <td className="px-4 py-3 text-slate-200 max-w-xs">{f.title}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs font-mono">{f.component}</td>
                            <td className="px-4 py-3 text-xs">{f.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 p-4 bg-black/20">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Compliance
                    </h3>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {compliance.map((c) => (
                        <div key={c.id} className="rounded-lg border border-white/5 px-3 py-2 flex justify-between gap-2">
                          <div>
                            <p className="text-sm text-slate-200">{c.title}</p>
                            <p className="text-[11px] text-slate-500">{c.description}</p>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-mono uppercase shrink-0',
                              c.status === 'PASS' && 'text-emerald-400',
                              c.status === 'FAIL' && 'text-red-400',
                              c.status === 'PARTIAL' && 'text-amber-300',
                              c.status === 'NEEDS_REVIEW' && 'text-slate-400',
                            )}
                          >
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 p-4 bg-black/20">
                    <h3 className="text-sm font-semibold mb-3">Security events</h3>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto">
                      {events.map((e) => (
                        <div key={e.id} className="border-l-2 border-cyan-500/50 pl-3">
                          <p className="text-xs font-mono text-cyan-400">{e.type}</p>
                          <p className="text-sm text-slate-200">{e.title}</p>
                          <p className="text-[11px] text-slate-500">{e.description}</p>
                          <p className="text-[10px] text-slate-600 mt-1">{e.at}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
