import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  User,
  XCircle,
  CheckCircle,
  Clock,
  Search,
  Eye,
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'seller' | 'buyer' | 'payment' | 'dispute';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityName: string;
  entityId: string;
  createdAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'seller',
    severity: 'high',
    title: 'High Refund Rate Detected',
    description: 'Seller has 45% refund rate in the last 30 days',
    entityName: 'Tech Store',
    entityId: 'seller-123',
    createdAt: '2024-03-17T10:30:00',
    status: 'open',
  },
  {
    id: '2',
    type: 'buyer',
    severity: 'medium',
    title: 'Multiple Order Cancellations',
    description: 'Buyer has cancelled 8 orders in the last week',
    entityName: 'John Doe',
    entityId: 'buyer-456',
    createdAt: '2024-03-17T09:15:00',
    status: 'investigating',
  },
  {
    id: '3',
    type: 'payment',
    severity: 'high',
    title: 'Suspicious Payment Pattern',
    description: 'Multiple failed payment attempts from same IP',
    entityName: 'Payment Gateway',
    entityId: 'payment-789',
    createdAt: '2024-03-16T14:20:00',
    status: 'open',
  },
  {
    id: '4',
    type: 'dispute',
    severity: 'medium',
    title: 'Frequent Disputes',
    description: 'Seller involved in 5 disputes this month',
    entityName: 'Fashion Hub',
    entityId: 'seller-321',
    createdAt: '2024-03-15T11:00:00',
    status: 'resolved',
  },
];

export default function FraudSecurityAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityBadge = (severity: Alert['severity']) => {
    const styles = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[severity]}`}>
        {severity}
      </span>
    );
  };

  const getStatusBadge = (status: Alert['status']) => {
    const styles = {
      open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      resolved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      dismissed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'seller':
      case 'buyer':
        return <User className="h-4 w-4" />;
      case 'payment':
        return <Shield className="h-4 w-4" />;
      case 'dispute':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fraud & Security Alerts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Monitor and manage security threats and fraudulent activities
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">High Severity</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {alerts.filter((a) => a.severity === 'high').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Open Alerts</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {alerts.filter((a) => a.status === 'open').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/40">
              <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Investigating</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {alerts.filter((a) => a.status === 'investigating').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {alerts.filter((a) => a.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>
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
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
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
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/40">
                  {getTypeIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {alert.title}
                    </h3>
                    {getSeverityBadge(alert.severity)}
                    {getStatusBadge(alert.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {alert.description}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Entity: <span className="font-semibold text-gray-900 dark:text-white">{alert.entityName}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Eye className="mr-1 inline h-4 w-4" />
                  View
                </button>
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <XCircle className="mr-1 inline h-4 w-4" />
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

