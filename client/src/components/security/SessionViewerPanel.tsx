import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, Ghost, MonitorSmartphone, MapPin, User, Globe, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VirtualSessionGhost, SessionSubjectDetail } from './securityIntelTypes';
import { API_BASE_URL } from '@/lib/config';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();
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
    <div
      className="rounded-2xl border overflow-hidden flex flex-col min-h-[420px] max-h-[640px]"
      style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
      >
        <Ghost className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Virtual session viewer
          </h3>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Event-based UI reconstruction — not screen share
          </p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div
          className="lg:w-[140px] border-b lg:border-b-0 lg:border-r overflow-y-auto max-h-40 lg:max-h-none p-2 space-y-1"
          style={{ borderColor: 'var(--divider)' }}
        >
          {sessions.length === 0 ? (
            <p className="text-[11px] p-2" style={{ color: 'var(--text-muted)' }}>
              No sessions
            </p>
          ) : (
            sessions.slice(0, 24).map((s) => (
              <button
                key={s.userId}
                type="button"
                onClick={() => void handleSelect(s.userId)}
                className={cn(
                  'w-full text-left rounded-lg px-2 py-2 text-[10px] font-mono transition-colors',
                  selected === s.userId
                    ? 'border'
                    : 'border border-transparent',
                )}
                style={
                  selected === s.userId
                    ? {
                        background: 'var(--bg-active)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--brand-border-subtle)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
              >
                <span className="block truncate" style={{ color: 'var(--text-primary)' }}>
                  {s.maskedIdentifier}
                </span>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {s.role}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {!sel ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Select a user to preview reconstructed state.
            </p>
          ) : (
            <motion.div
              key={sel.userId}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {detailLoading && (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading account & network context…
                </div>
              )}
              {detailError && (
                <p className="text-[11px]" style={{ color: 'var(--badge-warning-text)' }}>
                  {detailError}
                </p>
              )}

              {acc && (
                <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    <User className="w-3.5 h-3.5" />
                    Account
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Name · </span>
                      {acc.fullName || '—'}
                    </p>
                    <p className="break-all" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Email · </span>
                      {acc.email}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Phone · </span>
                      {acc.phoneMasked || '—'}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Role · </span>
                      {acc.role}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Status · </span>
                      {acc.accountStatus || 'active'}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Email verified · </span>
                      {acc.emailVerified ? 'Yes' : 'No'}
                    </p>
                    {acc.profileLocation && (
                      <p className="sm:col-span-2" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Profile location · </span>
                        {acc.profileLocation}
                      </p>
                    )}
                    <p className="text-[10px] sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
                      Member since {acc.memberSince ? new Date(acc.memberSince).toLocaleString() : '—'}
                    </p>
                    {(acc.lastLoginAt || acc.lastLoginIp) && (
                      <p className="text-[10px] sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
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
                <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    <Globe className="w-3.5 h-3.5" />
                    Live telemetry
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
                      <span>
                        <span style={{ color: 'var(--text-muted)' }}>Coarse location · </span>
                        {sess.geoLabel}
                      </span>
                    </p>
                    <p>
                      <span style={{ color: 'var(--text-muted)' }}>IP · </span>
                      <span className="font-mono">{sess.ipAddress || '—'}</span>
                    </p>
                    <p>
                      <span style={{ color: 'var(--text-muted)' }}>Device / browser · </span>
                      {sess.deviceSummary}
                    </p>
                    <p className="text-[10px] break-all font-mono leading-snug" style={{ color: 'var(--text-muted)' }}>
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
                  <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Shield className="w-3 h-3" />
                    Telemetry risk aligned
                  </span>
                )}
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  Session {new Date(sel.sessionStartedAt).toLocaleTimeString()} → now
                </span>
              </div>

              <div className="rounded-xl border p-4 relative overflow-hidden" style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}>
                <div className="relative flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  <MonitorSmartphone className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                  <span className="font-mono truncate">{sel.currentRoute || '/'}</span>
                </div>
                <p className="relative text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {sel.reconstructedUi.title || sel.routeLabel}
                </p>
                <ul className="relative mt-3 space-y-1.5">
                  {sel.reconstructedUi.sections.map((line, i) => (
                    <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--brand-primary)' }}>▪</span> {line}
                    </li>
                  ))}
                </ul>
                <div
                  className="relative mt-4 rounded-lg border border-dashed p-3"
                  style={{ borderColor: 'var(--divider-strong)', background: 'var(--card-bg)' }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Recent actions
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {sel.lastActions.slice(0, 8).map((a, i) => (
                      <p key={i} className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(a.at).toLocaleTimeString()} · {a.type}: {a.detail}
                      </p>
                    ))}
                  </div>
                </div>
                <p className="relative text-[10px] mt-3 flex items-start gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Eye className="w-3 h-3 shrink-0 mt-0.5" />
                  {sel.reconstructedUi.hints.join(' ')}
                </p>
              </div>

              <p className="text-[10px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>
                Device (short): {sel.deviceHint}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
