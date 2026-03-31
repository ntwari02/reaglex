import { motion } from 'framer-motion';
import { Activity, Crown, ShoppingBag, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveRoleCard } from './securityIntelTypes';

const roleMeta: Record<
  LiveRoleCard['role'],
  { label: string; icon: typeof Users; accent: string; glow: string }
> = {
  buyer: {
    label: 'Buyers',
    icon: ShoppingBag,
    accent: 'from-cyan-500/25 to-blue-600/10',
    glow: 'shadow-[0_0_40px_-8px_rgba(34,211,238,0.35)]',
  },
  seller: {
    label: 'Sellers',
    icon: Activity,
    accent: 'from-fuchsia-500/20 to-violet-600/10',
    glow: 'shadow-[0_0_40px_-8px_rgba(217,70,239,0.3)]',
  },
  admin: {
    label: 'Admins',
    icon: Crown,
    accent: 'from-amber-500/20 to-rose-600/10',
    glow: 'shadow-[0_0_40px_-8px_rgba(251,191,36,0.25)]',
  },
};

function RiskDot({ level }: { level: LiveRoleCard['riskIndicator'] }) {
  const cls =
    level === 'high'
      ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
      : level === 'medium'
        ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]'
        : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]';
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
      <span className={cn('h-2 w-2 rounded-full animate-pulse', cls)} />
      {level}
    </span>
  );
}

function CountUp({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.5, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="tabular-nums"
    >
      {value}
    </motion.span>
  );
}

export function LiveRoleCards({ cards }: { cards: LiveRoleCard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c, i) => {
        const m = roleMeta[c.role];
        const Icon = m.icon;
        return (
          <motion.div
            key={c.role}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-5 backdrop-blur-xl',
              m.accent,
              m.glow,
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_55%)] pointer-events-none" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">{m.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tabular-nums">
                    <CountUp value={c.onlineCount} />
                  </span>
                  <span className="text-xs text-slate-500">online</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  <Shield className="inline w-3 h-3 mr-1 text-slate-500" />
                  <CountUp value={c.activeSessions} /> active sessions
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
                <Icon className="w-6 h-6 text-cyan-300/90" />
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
              <RiskDot level={c.riskIndicator} />
              <span className="text-[10px] font-mono text-slate-500">
                ~{Number.isFinite(c.avgSessionDurationSec) ? Math.round(c.avgSessionDurationSec) : 0}s avg session
              </span>
            </div>
            <div className="relative mt-3 space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Live actions</p>
              {c.currentActions.length === 0 ? (
                <p className="text-xs text-slate-600 italic">Awaiting telemetry…</p>
              ) : (
                c.currentActions.map((a, j) => (
                  <motion.p
                    key={`${a}-${j}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-cyan-100/90 truncate"
                  >
                    ▸ {a}
                  </motion.p>
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
