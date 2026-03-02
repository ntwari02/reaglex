import React, { useState } from 'react';
import {
  List,
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

interface LogEntry {
  id: string;
  recipient: string;
  type: 'email' | 'sms' | 'push' | 'inapp';
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  sentAt: string;
  template?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    recipient: 'john@example.com',
    type: 'email',
    subject: 'Order Confirmation',
    status: 'sent',
    sentAt: '2024-03-17T10:30:00',
    template: 'Order Placed',
  },
  {
    id: '2',
    recipient: '+1234567890',
    type: 'sms',
    subject: 'Order Shipped',
    status: 'sent',
    sentAt: '2024-03-17T09:15:00',
  },
  {
    id: '3',
    recipient: 'user-device',
    type: 'push',
    subject: 'Flash Sale',
    status: 'failed',
    sentAt: '2024-03-17T08:00:00',
  },
];

export default function NotificationLogs() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesType = typeFilter === 'all' || log.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <List className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: LogEntry['status']) => {
    const styles = {
      sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      queued: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    };
    const icons = {
      sent: <CheckCircle className="h-3 w-3" />,
      failed: <XCircle className="h-3 w-3" />,
      queued: <Clock className="h-3 w-3" />,
    };
    return (
      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Logs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View full history of all notifications
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="push">Push</option>
          <option value="inapp">In-App</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Sent At
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(log.type)}
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {log.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">{log.recipient}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{log.subject}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {log.template || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(log.sentAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {log.status === 'failed' && (
                      <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                        <RefreshCw className="mr-1 inline h-4 w-4" />
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

