import React, { useState, useEffect } from 'react';
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
import { adminNotificationsAPI } from '@/lib/api';

interface LogEntry {
  id: string;
  recipient: string;
  type: 'email' | 'sms' | 'push' | 'inapp';
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  sentAt: string;
  template?: string;
}

export default function NotificationLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getLogs({
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
      });
      setLogs(res.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadLogs, 300);
    return () => clearTimeout(t);
  }, [statusFilter, typeFilter]);

  const handleSearch = () => loadLogs();

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Logs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View full history of all notifications. Data from backend.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLogs}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by recipient or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
        <button
          onClick={handleSearch}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <List className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No notification logs from the database.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Sent At</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{log.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">{log.recipient}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{log.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{log.templateName || log.template || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
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
      )}
    </div>
  );
}
