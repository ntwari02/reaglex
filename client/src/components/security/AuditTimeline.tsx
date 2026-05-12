import { motion } from 'framer-motion';
import { CalendarClock, TrendingUp } from 'lucide-react';
import type { WeeklySecurityStats } from './securityIntelTypes';

export function AuditTimeline({ weekly }: { weekly: WeeklySecurityStats }) {
  const maxEv = Math.max(1, ...weekly.days.map((d) => d.events));
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              7-day security timeline
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Volume + high-severity spikes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span style={{ color: 'var(--text-muted)' }}>
            Flagged events: <span className="text-amber-400">{weekly.blockedOrFlagged}</span>
          </span>
          {weekly.peakSuspiciousHourUtc != null && (
            <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <TrendingUp className="w-3.5 h-3.5 text-[var(--brand-orange-text)]" />
              Peak UTC hour: <span className="text-[var(--brand-orange-text)]">{weekly.peakSuspiciousHourUtc}:00</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 items-end h-36 mb-6">
        {weekly.days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-lg border"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(8, (d.events / maxEv) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              style={{
                minHeight: 12,
                borderColor: 'var(--divider)',
                background: 'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
              }}
            />
            <span className="text-[9px] font-mono -rotate-0" style={{ color: 'var(--text-muted)' }}>
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Top risky users
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {weekly.topRiskyUsers.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No data
            </p>
          ) : (
            weekly.topRiskyUsers.map((u, i) => (
              <motion.div
                key={u.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
              >
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  …{u.userId.slice(-6)}
                </span>
                <span className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>
                  ({u.role})
                </span>
                <span className="float-right text-red-400 font-mono font-bold">{u.score}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
