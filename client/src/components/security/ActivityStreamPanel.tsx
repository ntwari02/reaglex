import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelActivityEvent } from './securityIntelTypes';

const severityStyle: Record<
  IntelActivityEvent['severity'],
  { bar: string; badge: string }
> = {
  info: { bar: 'border-l-cyan-500/60', badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200' },
  low: { bar: 'border-l-emerald-500/50', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' },
  medium: { bar: 'border-l-amber-500/60', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-200' },
  high: { bar: 'border-l-[color-mix(in_srgb,var(--brand-primary)_70%,transparent)]', badge: 'bg-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] text-[var(--text-on-accent)]' },
  critical: { bar: 'border-l-red-500', badge: 'bg-red-500/25 text-red-700 dark:text-red-100' },
};

function RoleBadge({ role }: { role: string }) {
  const r = role?.toLowerCase() || '—';
  const cls =
    r === 'admin'
      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30'
      : r === 'seller'
        ? 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-200 border-fuchsia-500/25'
        : r === 'buyer'
          ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 border-cyan-500/25'
          : '';
  return (
    <span
      className={cn('text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md border', cls)}
      style={
        cls
          ? undefined
          : {
              background: 'var(--bg-badge)',
              color: 'var(--text-muted)',
              borderColor: 'var(--divider)',
            }
      }
    >
      {r}
    </span>
  );
}

export function ActivityStreamPanel({ events, live }: { events: IntelActivityEvent[]; live: boolean }) {
  const list = events.slice(0, 80);
  return (
    <div
      className="rounded-2xl border overflow-hidden flex flex-col min-h-[420px] max-h-[520px]"
      style={{ borderColor: 'var(--border-card)', background: 'var(--card-bg)', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: 'var(--divider)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-2">
          <Radio className={cn('w-4 h-4', live ? 'text-emerald-400 animate-pulse' : '')} style={!live ? { color: 'var(--text-muted)' } : undefined} />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Live activity stream
          </h3>
        </div>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {list.length} events
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-[11px]">
        <AnimatePresence initial={false}>
          {list.map((e) => {
            const st = severityStyle[e.severity] ?? severityStyle.info;
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className={cn(
                  'rounded-lg border-l-2 border pl-3 pr-2 py-2',
                  st.bar,
                )}
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--divider)',
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={e.role} />
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded', st.badge)}>{e.severity}</span>
                  <span className="text-[9px] ml-auto tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {new Date(e.at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 font-sans text-[12px] leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {e.title}
                </p>
                <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                  {e.detail}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {list.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            No events yet — connect telemetry & traffic.
          </p>
        )}
      </div>
    </div>
  );
}
