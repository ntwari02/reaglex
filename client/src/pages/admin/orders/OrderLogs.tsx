import React from 'react';
import { ArrowLeft, FileText, User, DollarSign, CheckCircle, Truck, RefreshCw, Clock } from 'lucide-react';

interface OrderLogsProps {
  orderId: string;
  onBack: () => void;
}

export default function OrderLogs({ orderId, onBack }: OrderLogsProps) {
  const mockLogs = [
    {
      id: 'LOG-001',
      action: 'Order created by customer',
      performedBy: 'Customer',
      date: '2024-03-15 10:30:00',
      type: 'created',
    },
    {
      id: 'LOG-002',
      action: 'Payment received',
      performedBy: 'System',
      date: '2024-03-15 10:32:00',
      type: 'payment',
    },
    {
      id: 'LOG-003',
      action: 'Seller accepted order',
      performedBy: 'Seller',
      date: '2024-03-15 11:00:00',
      type: 'accepted',
    },
    {
      id: 'LOG-004',
      action: 'Preparation started',
      performedBy: 'Seller',
      date: '2024-03-15 14:00:00',
      type: 'processing',
    },
    {
      id: 'LOG-005',
      action: 'Order shipped',
      performedBy: 'Admin',
      date: '2024-03-16 09:00:00',
      type: 'shipped',
    },
    {
      id: 'LOG-006',
      action: 'Order delivered',
      performedBy: 'Delivery Agent',
      date: '2024-03-18 15:30:00',
      type: 'delivered',
    },
  ];

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
        <div className="space-y-4">
          {mockLogs.map((log, index) => {
            const Icon = getIcon(log.type);
            return (
              <div key={log.id} className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
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
                {index < mockLogs.length - 1 && (
                  <div className="absolute left-4 mt-8 h-8 w-0.5 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

