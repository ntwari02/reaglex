import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, MapPin, Clock, Truck, Eye } from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, listRowStagger } from './logisticsAnimations';

interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  customerName: string;
  status: string;
  currentLocation?: string;
  estimatedDelivery: string;
  partner: string;
  lastUpdate: string;
}

export default function LiveTracking() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getShipments({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      setShipments(res.shipments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadShipments, 300);
    return () => clearTimeout(t);
  }, [statusFilter]);

  const handleSearch = () => loadShipments();

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      packed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      in_transit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      out_for_delivery: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
      delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
    };
    const labels: Record<string, string> = {
      packed: 'Packed',
      shipped: 'Shipped',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      failed: 'Failed',
      returned: 'Returned',
    };
    const s = styles[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    const l = labels[status] ?? status;
    return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s}`}>{l}</span>;
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Live Delivery Tracking</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track all active shipments. Data from backend.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking number, order ID, customer..."
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
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="returned">Returned</option>
        </select>
        <button
          onClick={handleSearch}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Search
        </button>
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
      ) : shipments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No shipments found from the database.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {shipments.map((shipment, i) => (
            <motion.div
              key={shipment.id}
              {...listRowStagger(i)}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {shipment.trackingNumber}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Order: {shipment.orderId} • {shipment.customerName}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {getStatusBadge(shipment.status)}
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Truck className="h-4 w-4" />
                      <span>{shipment.partner}</span>
                    </div>
                  </div>

                  {shipment.currentLocation && (
                    <div className="mb-2 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        Current: {shipment.currentLocation}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>ETA: {shipment.estimatedDelivery}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Updated: {shipment.lastUpdate}
                    </span>
                  </div>
                </div>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Eye className="mr-1 inline h-4 w-4" />
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
