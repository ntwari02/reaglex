import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, Ghost, MonitorSmartphone, MapPin, User, Globe, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VirtualSessionGhost, SessionSubjectDetail } from './securityIntelTypes';
import { API_BASE_URL } from '@/lib/config';

function bandStyle(band: VirtualSessionGhost['riskBand']) {
  if (band === 'dangerous') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (band === 'suspicious') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100';
}

export function SessionViewerPanel({
  sessions,
  onAudit,
}: {
  sessions: VirtualSessionGhost[];
  onAudit?: (targetUserId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(sessions[0]?.userId ?? null);
  const [detail, setDetail] = useState<SessionSubjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((prev) => {
      if (prev && sessions.some((s) => s.userId === prev)) return prev;
      return sessions[0].userId;
    });
  }, [sessions]);

  const loadDetail = useCallback(async (userId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const r = await fetch(
        `${API_BASE_URL}/security-analysis/session-subject/${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        },
      );
      if (!r.ok) {
        setDetailError('Could not load account details');
        setDetail(null);
        return;
      }
      const j = (await r.json()) as SessionSubjectDetail;
      setDetail(j);
    } catch {
      setDetailError('Could not load account details');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    void loadDetail(selected);
  }, [selected, loadDetail]);

  const sel = sessions.find((s) => s.userId === selected) ?? sessions[0];

  const handleSelect = async (userId: string) => {
    setSelected(userId);
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/security-analysis/audit/session-viewer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId }),
      });
      onAudit?.(userId);
    } catch {
      /* non-fatal */
    }
  };

  const acc = detail?.account;
  const sess = detail?.session;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-slate-950/70 backdrop-blur-xl overflow-hidden flex flex-col min-h-[420px] max-h-[640px]">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-gradient-to-r from-violet-950/50 to-transparent">
        <Ghost className="w-4 h-4 text-violet-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">Virtual session viewer</h3>
          <p className="text-[10px] text-slate-500">Event-based UI reconstruction — not screen share</p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="lg:w-[140px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto max-h-40 lg:max-h-none p-2 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-[11px] text-slate-500 p-2">No sessions</p>
          ) : (
            sessions.slice(0, 24).map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => void handleSelect(s.userId)}
                className={cn(
                  'w-full text-left rounded-lg px-2 py-2 text-[10px] font-mono transition-colors',
                  selected === s.userId
                    ? 'bg-violet-500/25 text-white border border-violet-500/40'
                    : 'text-slate-400 hover:bg-white/5 border border-transparent',
                )}
              >
                <span className="block truncate text-cyan-300/90">{s.maskedIdentifier}</span>
                <span className="text-[9px] text-slate-500">{s.role}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {!sel ? (
            <p className="text-slate-500 text-sm">Select a user to preview reconstructed state.</p>
          ) : (
            <motion.div
              key={sel.userId}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {detailLoading && (
                <div className="flex items-center gap-2 text-[11px] text-violet-300/90">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading account & network context…
                </div>
              )}
              {detailError && (
                <p className="text-[11px] text-amber-400/90">{detailError}</p>
              )}

              {acc && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90">
                    <User className="w-3.5 h-3.5" />
                    Account
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Name · </span>
                      {acc.fullName || '—'}
                    </p>
                    <p className="text-slate-300 break-all">
                      <span className="text-slate-500">Email · </span>
                      {acc.email}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Phone · </span>
                      {acc.phoneMasked || '—'}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Role · </span>
                      {acc.role}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Status · </span>
                      {acc.accountStatus || 'active'}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Email verified · </span>
                      {acc.emailVerified ? 'Yes' : 'No'}
                    </p>
                    {acc.profileLocation && (
                      <p className="text-slate-300 sm:col-span-2">
                        <span className="text-slate-500">Profile location · </span>
                        {acc.profileLocation}
                      </p>
                    )}
                    <p className="text-slate-400 text-[10px] sm:col-span-2">
                      Member since {acc.memberSince ? new Date(acc.memberSince).toLocaleString() : '—'}
                    </p>
                    {(acc.lastLoginAt || acc.lastLoginIp) && (
                      <p className="text-slate-400 text-[10px] sm:col-span-2">
                        Last sign-in ·{' '}
                        {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString() : '—'}
                        {acc.lastLoginIp ? ` · IP ${acc.lastLoginIp}` : ''}
                        {acc.lastLoginLocation ? ` · ${acc.lastLoginLocation}` : ''}
                        {acc.lastLoginDevice ? ` · ${acc.lastLoginDevice}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {sess && (
                <div className="rounded-xl border border-violet-500/25 bg-violet-950/15 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300/90">
                    <Globe className="w-3.5 h-3.5" />
                    Live telemetry
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-300">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-violet-400 mt-0.5" />
                      <span>
                        <span className="text-slate-500">Coarse location · </span>
                        {sess.geoLabel}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">IP · </span>
                      <span className="font-mono">{sess.ipAddress || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Device / browser · </span>
                      {sess.deviceSummary}
                    </p>
                    <p className="text-[10px] text-slate-500 break-all font-mono leading-snug">
                      UA · {sess.userAgentFull || sel.userAgentFull || sel.deviceHint}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-[10px] font-mono px-2 py-1 rounded-lg border', bandStyle(sel.riskBand))}>
                  Risk {sel.riskScore} · {sel.riskBand}
                </span>
                {sess && (
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Telemetry risk aligned
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-mono">
                  Session {new Date(sel.sessionStartedAt).toLocaleTimeString()} → now
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(139,92,246,0.07)_50%,transparent_60%)] animate-[shimmer_4s_linear_infinite] pointer-events-none" />
                <div className="relative flex items-center gap-2 text-xs text-slate-300 mb-3">
                  <MonitorSmartphone className="w-4 h-4 text-violet-400" />
                  <span className="font-mono truncate">{sel.currentRoute || '/'}</span>
                </div>
                <p className="relative text-lg font-semibold text-white">{sel.reconstructedUi.title || sel.routeLabel}</p>
                <ul className="relative mt-3 space-y-1.5">
                  {sel.reconstructedUi.sections.map((line, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-2">
                      <span className="text-violet-500">▪</span> {line}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-4 rounded-lg border border-dashed border-white/10 p-3 bg-slate-900/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Recent actions</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {sel.lastActions.slice(0, 8).map((a, i) => (
                      <p key={i} className="text-[10px] text-slate-400 font-mono">
                        {new Date(a.at).toLocaleTimeString()} · {a.type}: {a.detail}
                      </p>
                    ))}
                  </div>
                </div>
                <p className="relative text-[10px] text-slate-600 mt-3 flex items-start gap-1">
                  <Eye className="w-3 h-3 shrink-0 mt-0.5" />
                  {sel.reconstructedUi.hints.join(' ')}
                </p>
              </div>

              <p className="text-[10px] text-slate-600 font-mono break-all">
                Device (short): {sel.deviceHint}
              </p>
            </motion.div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
