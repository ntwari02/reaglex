import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  Clock,
  User,
  Server,
  CreditCard,
  Warehouse,
  Shield,
} from 'lucide-react';

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

const mockAlerts: SystemAlert[] = [
  {
    id: '1',
    type: 'server',
    title: 'Server Downtime',
    description: 'Main server experiencing high load',
    severity: 'critical',
    status: 'open',
    createdAt: '2024-03-17T10:30:00',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Gateway Error',
    description: 'Stripe API connection failed',
    severity: 'high',
    status: 'assigned',
    assignedTo: 'John Doe',
    createdAt: '2024-03-17T09:15:00',
  },
  {
    id: '3',
    type: 'warehouse',
    title: 'Low Stock Alert',
    description: 'Warehouse A has 5 items below threshold',
    severity: 'medium',
    status: 'resolved',
    createdAt: '2024-03-16T14:20:00',
  },
];

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Alerts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Monitor and manage system-generated notifications
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
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
                      {new Date(alert.createdAt).toLocaleString()}
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
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <CheckCircle className="mr-1 inline h-4 w-4" />
                    Mark Resolved
                  </button>
                )}
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <User className="mr-1 inline h-4 w-4" />
                  Assign
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

