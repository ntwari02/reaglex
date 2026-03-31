import { motion } from 'framer-motion';
import { CalendarClock, TrendingUp } from 'lucide-react';
import type { WeeklySecurityStats } from './securityIntelTypes';

export function AuditTimeline({ weekly }: { weekly: WeeklySecurityStats }) {
  const maxEv = Math.max(1, ...weekly.days.map((d) => d.events));
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">7-day security timeline</h3>
            <p className="text-[10px] text-slate-500">Volume + high-severity spikes</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400">
            Flagged events: <span className="text-amber-400">{weekly.blockedOrFlagged}</span>
          </span>
          {weekly.peakSuspiciousHourUtc != null && (
            <span className="text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              Peak UTC hour: <span className="text-orange-300">{weekly.peakSuspiciousHourUtc}:00</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 items-end h-36 mb-6">
        {weekly.days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-lg bg-gradient-to-t from-cyan-600/30 to-fuchsia-500/40 border border-white/10"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(8, (d.events / maxEv) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              style={{ minHeight: 12 }}
            />
            <span className="text-[9px] font-mono text-slate-500 -rotate-0">{d.date.slice(5)}</span>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Top risky users</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {weekly.topRiskyUsers.length === 0 ? (
            <p className="text-xs text-slate-600">No data</p>
          ) : (
            weekly.topRiskyUsers.map((u, i) => (
              <motion.div
                key={u.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-sm"
              >
                <span className="text-slate-500 text-[10px] font-mono">…{u.userId.slice(-6)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({u.role})</span>
                <span className="float-right text-red-400 font-mono font-bold">{u.score}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
