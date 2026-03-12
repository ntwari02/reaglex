import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, staggerContainer, staggerItem } from './logisticsAnimations';

interface DeliveryPartner {
  id: string;
  name: string;
  type: 'courier' | 'in-house' | 'api';
  status: 'active' | 'inactive';
  onTimeDelivery: number;
  avgDeliveryTime: string;
  failedDeliveryRate: number;
  apiStatus: 'connected' | 'disconnected' | 'error';
  totalShipments: number;
}

export default function DeliveryPartners() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getPartners({ search: searchTerm || undefined });
      setPartners(res.partners ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partners');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, [searchTerm]);

  const getStatusBadge = (status: DeliveryPartner['status']) => {
    return status === 'active' ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        Active
      </span>
    ) : (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Inactive
      </span>
    );
  };

  const getApiStatusBadge = (status: DeliveryPartner['apiStatus']) => {
    const styles = {
      connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      disconnected: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Partners</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage couriers, in-house drivers, and logistics partners. Data from backend.
          </p>
        </div>
        <button
          onClick={loadPartners}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search partners..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
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

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : partners.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No delivery partners found from the database.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Add partners via API or seed data.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              variants={staggerItem}
              initial="initial"
              animate="animate"
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ y: -2, boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                    <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{partner.name}</h3>
                    <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{partner.type}</p>
                  </div>
                </div>
                {getStatusBadge(partner.status)}
              </div>

              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">On-Time Delivery</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {partner.onTimeDelivery}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Avg Delivery Time</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{partner.avgDeliveryTime}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Failed Rate</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {partner.failedDeliveryRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Shipments</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{partner.totalShipments}</span>
                </div>
              </div>

              {partner.type === 'api' && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <span className="text-xs text-gray-600 dark:text-gray-400">API Status</span>
                  {getApiStatusBadge(partner.apiStatus)}
                </div>
              )}

              <div className="flex gap-2">
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Eye className="mr-1 inline h-4 w-4" />
                  View
                </button>
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
