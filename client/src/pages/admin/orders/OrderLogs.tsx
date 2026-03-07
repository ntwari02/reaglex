import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, DollarSign, CheckCircle, Truck, Clock, Loader2 } from 'lucide-react';
import { adminOrdersAPI } from '../../../lib/api';

interface LogEntry {
  id: string;
  action: string;
  performedBy: string;
  date: string;
  type: string;
}

interface OrderLogsProps {
  orderId: string;
  onBack: () => void;
}

export default function OrderLogs({ orderId, onBack }: OrderLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminOrdersAPI
      .getOrderLogs(orderId)
      .then((res) => {
        if (!cancelled) setLogs(res.logs || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load logs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'created':
        return User;
      case 'payment':
        return DollarSign;
      case 'accepted':
      case 'processing':
        return CheckCircle;
      case 'shipped':
        return Truck;
      case 'delivered':
      case 'packed':
      case 'pending':
      case 'processing':
      case 'cancelled':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order Logs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Activity history and change logs</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading logs…
          </div>
        ) : (
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="py-4 text-sm text-gray-500 dark:text-gray-400">No activity logs for this order.</p>
            ) : (
              logs.map((log, index) => {
                const Icon = getIcon(log.type);
                return (
                  <div key={log.id} className="relative flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.action}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>By: {log.performedBy}</span>
                        <span>•</span>
                        <span>{log.date}</span>
                      </div>
                    </div>
                    {index < logs.length - 1 && (
                      <div className="absolute left-4 top-8 h-[calc(100%+0.5rem)] w-0.5 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

