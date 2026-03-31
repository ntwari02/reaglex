import { motion } from 'framer-motion';
import { Flame, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskSample } from './securityIntelTypes';

function Meter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const hue = clamped <= 30 ? 160 : clamped <= 60 ? 45 : 0;
  return (
    <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        style={{
          background: `linear-gradient(90deg, hsl(${hue + 140},70%,45%), hsl(${hue},85%,55%))`,
          boxShadow: `0 0 20px hsla(${hue},90%,50%,0.4)`,
        }}
      />
    </div>
  );
}

function labelForScore(s: number) {
  if (s <= 30) return { text: 'Safe', cls: 'text-emerald-400' };
  if (s <= 60) return { text: 'Suspicious', cls: 'text-amber-400' };
  return { text: 'Dangerous', cls: 'text-red-400' };
}

export function RiskPanel({ samples }: { samples: RiskSample[] }) {
  const top = samples.slice(0, 12);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-4 h-4 text-fuchsia-400" />
        <h3 className="text-sm font-semibold text-white">Risk engine</h3>
        <span className="text-[10px] font-mono text-slate-500 ml-auto">0–30 safe · 31–60 suspicious · 61–100 critical</span>
      </div>
      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {top.length === 0 ? (
          <p className="text-sm text-slate-500">No risk samples yet.</p>
        ) : (
          top.map((r) => {
            const L = labelForScore(r.score);
            return (
              <div key={r.userId} className="rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="flex justify-between items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono text-slate-300 truncate">
                    …{r.userId.slice(-8)} <span className="text-slate-500">({r.role})</span>
                  </span>
                  <span className={cn('text-xs font-bold tabular-nums', L.cls)}>
                    {r.score} {L.text}
                  </span>
                </div>
                <Meter score={r.score} />
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
        <Flame className="w-3.5 h-3.5 text-orange-500" />
        Patterns: failed logins, burst requests, privilege probes, flagged behavior.
      </div>
    </div>
  );
}
