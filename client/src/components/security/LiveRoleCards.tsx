import { motion } from 'framer-motion';
import { Activity, Crown, ShoppingBag, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveRoleCard } from './securityIntelTypes';

const roleMeta: Record<
  LiveRoleCard['role'],
  { label: string; icon: typeof Users; iconColor: string }
> = {
  buyer: {
    label: 'Buyers',
    icon: ShoppingBag,
    iconColor: 'var(--link-color)',
  },
  seller: {
    label: 'Sellers',
    icon: Activity,
    iconColor: 'var(--brand-primary)',
  },
  admin: {
    label: 'Admins',
    icon: Crown,
    iconColor: 'var(--brand-orange-text)',
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
    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
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
            className="relative overflow-hidden rounded-2xl border p-5"
            style={{
              borderColor: 'var(--border-card)',
              background: 'var(--card-bg)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                  {m.label}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    <CountUp value={c.onlineCount} />
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>online</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <Shield className="inline w-3 h-3 mr-1" style={{ color: 'var(--text-muted)' }} />
                  <CountUp value={c.activeSessions} /> active sessions
                </p>
              </div>
              <div
                className="rounded-xl border p-2.5"
                style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)' }}
              >
                <Icon className="w-6 h-6" style={{ color: m.iconColor }} />
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--divider)' }}>
              <RiskDot level={c.riskIndicator} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                ~{Number.isFinite(c.avgSessionDurationSec) ? Math.round(c.avgSessionDurationSec) : 0}s avg session
              </span>
            </div>
            <div className="relative mt-3 space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Live actions
              </p>
              {c.currentActions.length === 0 ? (
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Awaiting telemetry…</p>
              ) : (
                c.currentActions.map((a, j) => (
                  <motion.p
                    key={`${a}-${j}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs truncate"
                    style={{ color: 'var(--text-secondary)' }}
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
