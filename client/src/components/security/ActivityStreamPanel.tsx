import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelActivityEvent } from './securityIntelTypes';

const severityStyle: Record<
  IntelActivityEvent['severity'],
  { bar: string; badge: string }
> = {
  info: { bar: 'border-l-cyan-500/60', badge: 'bg-cyan-500/15 text-cyan-200' },
  low: { bar: 'border-l-emerald-500/50', badge: 'bg-emerald-500/15 text-emerald-200' },
  medium: { bar: 'border-l-amber-500/60', badge: 'bg-amber-500/15 text-amber-200' },
  high: { bar: 'border-l-orange-500/70', badge: 'bg-orange-500/20 text-orange-100' },
  critical: { bar: 'border-l-red-500', badge: 'bg-red-500/25 text-red-100' },
};

function RoleBadge({ role }: { role: string }) {
  const r = role?.toLowerCase() || '—';
  const cls =
    r === 'admin'
      ? 'bg-amber-500/20 text-amber-200 border-amber-500/30'
      : r === 'seller'
        ? 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/25'
        : r === 'buyer'
          ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/25'
          : 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  return (
    <span className={cn('text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md border', cls)}>{r}</span>
  );
}

export function ActivityStreamPanel({ events, live }: { events: IntelActivityEvent[]; live: boolean }) {
  const list = events.slice(0, 80);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl overflow-hidden flex flex-col min-h-[420px] max-h-[520px]">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 bg-black/30">
        <div className="flex items-center gap-2">
          <Radio className={cn('w-4 h-4', live ? 'text-emerald-400 animate-pulse' : 'text-slate-500')} />
          <h3 className="text-sm font-semibold text-white tracking-tight">Live activity stream</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">{list.length} events</span>
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
                  'rounded-lg border-l-2 bg-black/25 border border-white/5 pl-3 pr-2 py-2',
                  st.bar,
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={e.role} />
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded', st.badge)}>{e.severity}</span>
                  <span className="text-[9px] text-slate-500 ml-auto tabular-nums">
                    {new Date(e.at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-100 mt-1 font-sans text-[12px] leading-snug">{e.title}</p>
                <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-2">{e.detail}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {list.length === 0 && (
          <p className="text-slate-500 text-center py-12 text-sm">No events yet — connect telemetry & traffic.</p>
        )}
      </div>
    </div>
  );
}
