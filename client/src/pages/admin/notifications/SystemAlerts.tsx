import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  User,
  Server,
  CreditCard,
  Warehouse,
  Shield,
  Trash2,
} from 'lucide-react';
import { adminNotificationsAPI } from '@/lib/api';

interface SystemAlert {
  id: string;
  type: 'server' | 'api' | 'payment' | 'warehouse' | 'security';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'assigned' | 'resolved';
  assignedTo?: string;
  createdAt: string;
}

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminNotificationsAPI.getAlerts({
        search: searchTerm || undefined,
        severity: severityFilter === 'all' ? undefined : severityFilter,
      });
      setAlerts(res.alerts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadAlerts, 300);
    return () => clearTimeout(t);
  }, [severityFilter, searchTerm]);

  const getTypeIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'server':
        return <Server className="h-4 w-4" />;
      case 'api':
        return <AlertTriangle className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'warehouse':
        return <Warehouse className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: SystemAlert['severity']) => {
    const styles = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[severity]}`}>
        {severity}
      </span>
    );
  };

  const getStatusBadge = (status: SystemAlert['status']) => {
    const styles = {
      open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      resolved: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Alerts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Monitor and manage system-generated notifications. Data from backend.
        </p>
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
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadAlerts()}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={loadAlerts}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No system alerts from the database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    {getTypeIcon(alert.type)}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{alert.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{alert.description}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {getSeverityBadge(alert.severity)}
                    {getStatusBadge(alert.status)}
                    {alert.assignedTo && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{alert.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={async () => {
                        try {
                          await adminNotificationsAPI.updateAlert(alert.id, { status: 'resolved' });
                          loadAlerts();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Failed');
                        }
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle className="mr-1 inline h-4 w-4" />
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this alert permanently?')) return;
                      try {
                        await adminNotificationsAPI.deleteAlert(alert.id);
                        loadAlerts();
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to delete');
                      }
                    }}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="mr-1 inline h-4 w-4" />
                    Delete
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
