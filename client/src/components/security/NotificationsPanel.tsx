import { motion } from 'framer-motion';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SecurityAlertRow } from './securityIntelTypes';

export function NotificationsPanel({ alerts, unread }: { alerts: SecurityAlertRow[]; unread: number }) {
  const list = alerts.slice(0, 40);
  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-cyan-400" />
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border border-slate-900"
              >
                {unread > 99 ? '99+' : unread}
              </motion.span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Alert routing</h3>
            <p className="text-[10px] text-slate-500">Risk &gt;80 → SMS + email + in-app · 50–80 → email + in-app</p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">No automated alerts yet.</p>
        ) : (
          list.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-white/5 bg-black/30 px-3 py-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500">{new Date(a.at).toLocaleString()}</span>
                <span className="text-[10px] text-fuchsia-400 font-mono">R{a.riskScore}</span>
                <span className="flex gap-1 ml-auto">
                  <Channel on={a.channels.email} icon={Mail} label="Email" />
                  <Channel on={a.channels.sms} icon={Smartphone} label="SMS" />
                  <Channel on={a.channels.inapp} icon={MessageSquare} label="In-app" />
                </span>
              </div>
              <p className="text-xs text-white mt-1">{a.title}</p>
              <p className="text-[10px] text-slate-500 line-clamp-2">{a.detail}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function Channel({ on, icon: Icon, label }: { on: boolean; icon: typeof Mail; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono border',
        on ? 'border-cyan-500/40 text-cyan-200 bg-cyan-500/10' : 'border-white/5 text-slate-600 opacity-40',
      )}
      title={label}
    >
      <Icon className="w-3 h-3" />
    </span>
  );
}
