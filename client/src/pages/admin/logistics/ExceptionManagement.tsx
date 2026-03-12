import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Search,
  Package,
  Clock,
  XCircle,
  FileText,
} from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, listRowStagger } from './logisticsAnimations';

interface Exception {
  id: string;
  type: 'failed_delivery' | 'delayed' | 'lost' | 'damaged' | 'sla_breach';
  shipmentId: string;
  orderId: string;
  partner: string;
  description: string;
  createdAt: string;
  status: 'open' | 'investigating' | 'resolved';
}

export default function ExceptionManagement() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getExceptions({
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: searchTerm || undefined,
      });
      setExceptions(res.exceptions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exceptions');
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadExceptions, 300);
    return () => clearTimeout(t);
  }, [typeFilter, searchTerm]);

  const getTypeBadge = (type: Exception['type']) => {
    const styles = {
      failed_delivery: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      delayed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      lost: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
      damaged: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      sla_breach: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    const labels = {
      failed_delivery: 'Failed Delivery',
      delayed: 'Delayed',
      lost: 'Lost',
      damaged: 'Damaged',
      sla_breach: 'SLA Breach',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getStatusBadge = (status: Exception['status']) => {
    const styles = {
      open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      resolved: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Exception & Issue Management
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track and manage delivery exceptions and issues. Data from backend.
        </p>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200"
        >
          {error}
        </motion.p>
      )}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/40">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed Deliveries</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {exceptions.filter((e) => e.type === 'failed_delivery').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Delayed Shipments</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {exceptions.filter((e) => e.type === 'delayed').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/40">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lost/Damaged</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {exceptions.filter((e) => e.type === 'lost' || e.type === 'damaged').length}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/40">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">SLA Breaches</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {exceptions.filter((e) => e.type === 'sla_breach').length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by shipment ID or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="failed_delivery">Failed Delivery</option>
          <option value="delayed">Delayed</option>
          <option value="lost">Lost</option>
          <option value="damaged">Damaged</option>
          <option value="sla_breach">SLA Breach</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : exceptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No exceptions found from the database.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {exceptions.map((exception, i) => (
            <motion.div
              key={exception.id}
              {...listRowStagger(i)}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {exception.shipmentId}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Order: {exception.orderId} • {exception.partner}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {getTypeBadge(exception.type)}
                    {getStatusBadge(exception.status)}
                  </div>

                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    {exception.description}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {exception.createdAt ? new Date(exception.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <FileText className="mr-1 inline h-4 w-4" />
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
