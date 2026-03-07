import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Car, MapPin, Edit, Search } from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, staggerContainer, staggerItem } from './logisticsAnimations';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'active' | 'offline' | 'on-delivery';
  onTimeDelivery: number;
  totalDeliveries: number;
  avgDeliveryTime: string;
  currentLocation?: string;
}

export default function FleetDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getDrivers({ search: searchTerm || undefined });
      setDrivers(res.drivers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drivers');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [searchTerm]);

  const getStatusBadge = (status: Driver['status']) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      offline: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      'on-delivery': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    const labels = {
      active: 'Active',
      offline: 'Offline',
      'on-delivery': 'On Delivery',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fleet & Drivers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage in-house delivery drivers and vehicles. Data from backend.
          </p>
        </div>
        <button
          onClick={loadDrivers}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search drivers or vehicles..."
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
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No drivers found from the database.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {drivers.map((driver, i) => (
            <motion.div
              key={driver.id}
              variants={staggerItem}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ y: -2, boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{driver.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{driver.phone}</p>
                  </div>
                </div>
                {getStatusBadge(driver.status)}
              </div>

              <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <Car className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{driver.vehicle}</span>
              </div>

              {driver.currentLocation && (
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-gray-600 dark:text-gray-400">{driver.currentLocation}</span>
                </div>
              )}

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">On-Time Delivery</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {driver.onTimeDelivery}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Deliveries</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{driver.totalDeliveries}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Avg Delivery Time</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{driver.avgDeliveryTime}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  Track
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
