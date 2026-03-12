import React, { useState, useEffect } from 'react';
import { Clock, Plus, Play, Pause, Edit, Trash2, Calendar, Repeat } from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

interface ScheduledNotification {
  id: string;
  name: string;
  target: string;
  scheduledFor: string;
  recurring: boolean;
  status: 'active' | 'paused' | 'completed';
  type: string;
}

export default function ScheduledNotifications() {
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScheduled = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getScheduled();
      setScheduled(res.scheduled ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scheduled');
      setScheduled([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduled();
  }, []);

  const getStatusBadge = (status: ScheduledNotification['status']) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scheduled Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage scheduled and recurring notifications. Data from backend.
          </p>
        </div>
        <button
          onClick={loadScheduled}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : scheduled.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No scheduled notifications from the database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scheduled.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Target: {item.target} • Type: {item.type}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {getStatusBadge(item.status)}
                    {item.recurring && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                        <Repeat className="h-3 w-3" />
                        Recurring
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      {item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.status === 'active' ? (
                    <button
                      onClick={async () => {
                        try {
                          await adminNotificationsAPI.updateScheduled(item.id, { status: 'paused' });
                          loadScheduled();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed');
                        }
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-400 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Pause className="mr-1 inline h-4 w-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await adminNotificationsAPI.updateScheduled(item.id, { status: 'active' });
                          loadScheduled();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed');
                        }
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Play className="mr-1 inline h-4 w-4" />
                      Resume
                    </button>
                  )}
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <Edit className="mr-1 inline h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this scheduled notification?')) return;
                      try {
                        await adminNotificationsAPI.deleteScheduled(item.id);
                        loadScheduled();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Delete failed');
                      }
                    }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
