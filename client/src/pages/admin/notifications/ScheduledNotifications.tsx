import React, { useState } from 'react';
import { Clock, Plus, Play, Pause, Edit, Trash2, Calendar, Repeat } from 'lucide-react';

interface ScheduledNotification {
  id: string;
  name: string;
  target: string;
  scheduledFor: string;
  recurring: boolean;
  status: 'active' | 'paused' | 'completed';
  type: string;
}

const mockScheduled: ScheduledNotification[] = [
  {
    id: '1',
    name: 'Weekly Promotions',
    target: 'All Customers',
    scheduledFor: '2024-03-20T10:00:00',
    recurring: true,
    status: 'active',
    type: 'email',
  },
  {
    id: '2',
    name: 'Order Reminder',
    target: 'Pending Orders',
    scheduledFor: '2024-03-18T14:00:00',
    recurring: false,
    status: 'active',
    type: 'sms',
  },
];

export default function ScheduledNotifications() {
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>(mockScheduled);
  const [showAddModal, setShowAddModal] = useState(false);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scheduled Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage scheduled and recurring notifications
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Schedule Notification
        </button>
      </div>

      {/* Scheduled List */}
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
                    {new Date(item.scheduledFor).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {item.status === 'active' ? (
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-400 dark:border-gray-700 dark:text-gray-300">
                    <Pause className="mr-1 inline h-4 w-4" />
                    Pause
                  </button>
                ) : (
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <Play className="mr-1 inline h-4 w-4" />
                    Resume
                  </button>
                )}
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

