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
import { useTheme } from '@/contexts/ThemeContext';
import { LiveRoleCards } from '@/components/security/LiveRoleCards';
import { ActivityStreamPanel } from '@/components/security/ActivityStreamPanel';
import { SessionViewerPanel } from '@/components/security/SessionViewerPanel';
import { RiskPanel } from '@/components/security/RiskPanel';
import { NotificationsPanel } from '@/components/security/NotificationsPanel';
import { AuditTimeline } from '@/components/security/AuditTimeline';
import { ConfigurationRoom } from '@/components/security/ConfigurationRoom';
import type { IntelligenceBundle } from '@/components/security/securityIntelTypes';
import SystemOpsCenterPanel, { type MonitorSettingsFull } from '@/components/admin/SystemOpsCenterPanel';

function scoreColor(score: number) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 65) return 'text-cyan-400';
  if (score >= 45) return 'text-amber-400';
  if (score >= 20) return 'text-[var(--brand-orange-text)]';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
  const [opsSettings, setOpsSettings] = useState<MonitorSettingsFull | null>(null);
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
    void fetch(`${API_BASE_URL}/system/settings`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setOpsSettings(data.settings ?? null))
      .catch(() => setOpsSettings(null));
  }, [authHeaders]);

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
      cn(
        'relative min-h-full rounded-3xl overflow-hidden',
        // Solid theme tokens only (no gradients) to match admin pages.
        'bg-[var(--bg-page)] text-[var(--text-secondary)] border border-[var(--border-card)] shadow-[var(--shadow-lg)]',
      ),
    [],
  );

  return (
    <div className={cn('min-w-0 max-w-[1800px] mx-auto pb-12', pageShell)}>
      {/* No decorative gradients on this page. */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <span
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <ShieldCheck className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
              </span>
              <span>Security Intelligence Control Room</span>
            </h1>
            <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border text-sm transition-colors"
              style={{
                borderColor: 'var(--border-card)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              disabled={scanning}
              onClick={() => void runScan()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border text-sm disabled:opacity-50 transition-colors"
              style={{
                borderColor: 'var(--brand-border-subtle)',
                background: 'var(--brand-tint)',
                color: 'var(--text-primary)',
              }}
            >
              <ScanSearch className="w-4 h-4" />
              {scanning ? 'Scanning…' : 'Run scan'}
            </button>
          </div>
        </motion.div>

        <SystemOpsCenterPanel
          compact
          settings={opsSettings}
          alerts={intel.alerts.map((a) => ({
            id: a.id,
            level: (a.riskScore >= 80 ? 'critical' : a.riskScore >= 50 ? 'warning' : 'info') as
              | 'critical'
              | 'warning'
              | 'info',
            title: a.title,
            message: a.detail,
            at: a.at,
          }))}
          authHeaders={authHeaders}
          onSettingsSaved={() => {
            void fetch(`${API_BASE_URL}/system/settings`, { headers: authHeaders() })
              .then((r) => r.json())
              .then((data) => setOpsSettings(data.settings ?? null));
          }}
        />

        {loadError && (
          <div
            className="rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2"
            style={{
              borderColor: 'var(--badge-error-border)',
              background: 'var(--badge-error-bg)',
              color: 'var(--badge-error-text)',
            }}
          >
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
            className="xl:col-span-4 rounded-2xl border p-6 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden"
            style={{
              borderColor: 'var(--border-card)',
              background: 'var(--card-bg)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  fill="none"
                  stroke="color-mix(in srgb, var(--text-muted) 40%, transparent)"
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
                  style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.15))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-mono font-bold', scoreColor(displayScore))}>
                  {Math.round(displayScore)}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {overview?.grade ?? '—'}
                </span>
              </div>
            </div>
            {overview && (
              <p className="relative text-xs mt-4 text-center font-mono" style={{ color: 'var(--text-muted)' }}>
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
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Open risk
                    </p>
                    <p className="text-2xl font-mono text-red-400 mt-1">
                      {overview.findingsSummary.critical + overview.findingsSummary.high}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Medium / low
                    </p>
                    <p className="text-2xl font-mono text-amber-300 mt-1">
                      {overview.findingsSummary.medium + overview.findingsSummary.low}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Passing
                    </p>
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
        <ConfigurationRoom authHeaders={authHeaders} />

        {/* Identity & sign-in (existing) */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: 'var(--divider)' }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <KeyRound className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              Identity &amp; sign-in intelligence
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Buyer · Seller · Admin telemetry
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x" style={{ borderColor: 'var(--divider)' }}>
            <div className="p-4 min-w-0">
              <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
                Auth stream
              </p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto font-mono text-[11px] pr-1">
                {authEvents.length === 0 && (
                  <p className="italic" style={{ color: 'var(--text-muted)' }}>No sign-in events yet.</p>
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
                      a.type === 'LOGIN_BLOCKED' && 'border-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)]',
                      a.type === 'ROLE_SIGNIN' && 'border-cyan-500/35 bg-cyan-500/5',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span style={{ color: 'var(--text-primary)' }}>{a.type}</span>
                      {a.role && <span style={{ color: 'var(--text-muted)' }}>· {a.role}</span>}
                      <span className="ml-auto tabular-nums" style={{ color: 'var(--text-muted)' }}>{new Date(a.at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 break-words" style={{ color: 'var(--text-secondary)' }}>{a.detail}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>IP {a.ip}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="p-4 min-w-0">
              <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Users className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
                Behavior signals
              </p>
              <div className="overflow-x-auto max-h-[240px] overflow-y-auto">
                <table className="w-full text-left text-xs min-w-[400px]">
                  <thead className="uppercase sticky top-0" style={{ color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
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
                        <td colSpan={4} className="py-3 italic" style={{ color: 'var(--text-muted)' }}>
                          No behavior rows yet.
                        </td>
                      </tr>
                    )}
                    {behaviorRows.map((b) => (
                      <tr key={`${b.userId}-${b.at}-${b.action}`} className="border-t" style={{ borderColor: 'var(--divider)' }}>
                        <td className="py-2 pr-2 font-mono" style={{ color: 'var(--brand-primary)' }}>{b.role}</td>
                        <td className="py-2 pr-2 max-w-[140px] truncate">{b.action}</td>
                        <td className="py-2 pr-2" style={{ color: 'var(--text-secondary)' }}>{b.risk}</td>
                        <td className="py-2 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(b.at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible posture */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
        >
          <button
            type="button"
            onClick={() => setPostureOpen((o) => !o)}
            className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Radar className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              Security posture &amp; compliance (scan results)
            </span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', postureOpen && 'rotate-180')} style={{ color: 'var(--text-muted)' }} />
          </button>
          <AnimatePresence>
            {postureOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t px-4 pb-6 space-y-6"
                style={{ borderColor: 'var(--divider)' }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)' }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Radar className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                      Attack surface
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {surfaceNodes.map((n) => (
                        <span
                          key={n.id}
                          className={cn(
                            'text-[10px] font-mono px-2 py-1 rounded-lg border',
                            n.severity === 'CRITICAL' && 'border-red-500/50 text-red-300',
                            n.severity === 'HIGH' && 'border-[color-mix(in_srgb,var(--brand-primary)_50%,transparent)] text-[var(--badge-warning-text)]',
                            n.severity === 'MEDIUM' && 'border-amber-500/40 text-amber-200',
                            n.severity === 'LOW' && 'border-[var(--divider-strong)] text-[var(--text-secondary)]',
                            n.severity === 'OK' && 'border-emerald-500/40 text-emerald-200',
                          )}
                        >
                          {n.shortLabel} · {n.ring}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Sub-scores</h3>
                    {overview?.subScores && (
                      <div className="space-y-2 text-xs font-mono">
                        {Object.entries(overview.subScores).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{k}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-xl border overflow-hidden"
                  style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)' }}
                >
                  <div
                    className="px-4 py-2 border-b flex items-center gap-2"
                    style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--brand-orange-text)' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Vulnerability findings
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[640px]">
                      <thead className="text-xs uppercase" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                        <tr>
                          <th className="px-4 py-2">Severity</th>
                          <th className="px-4 py-2">Title</th>
                          <th className="px-4 py-2">Component</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {findings.map((f) => (
                          <tr key={f.id} className="border-t" style={{ borderColor: 'var(--divider)' }}>
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--brand-orange-text)' }}>
                              {f.severity}
                            </td>
                            <td className="px-4 py-3 max-w-xs" style={{ color: 'var(--text-primary)' }}>{f.title}</td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{f.component}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{f.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)' }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--text-in-stock)' }} />
                      <span>Compliance</span>
                    </h3>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {compliance.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg border px-3 py-2 flex justify-between gap-2"
                          style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}
                        >
                          <div>
                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-mono uppercase shrink-0',
                              c.status === 'PASS' && 'text-emerald-400',
                              c.status === 'FAIL' && 'text-red-400',
                              c.status === 'PARTIAL' && 'text-amber-300',
                              c.status === 'NEEDS_REVIEW' && 'text-[var(--text-muted)]',
                            )}
                          >
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                      Security events
                    </h3>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto">
                      {events.map((e) => (
                        <div key={e.id} className="border-l-2 pl-3" style={{ borderColor: 'var(--brand-border-subtle)' }}>
                          <p className="text-xs font-mono" style={{ color: 'var(--brand-primary)' }}>{e.type}</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{e.description}</p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{e.at}</p>
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
