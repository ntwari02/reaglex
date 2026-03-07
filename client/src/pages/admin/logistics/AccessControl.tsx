import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Edit, CheckCircle, XCircle } from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, staggerContainer, staggerItem } from './logisticsAnimations';

interface Role {
  id: string;
  name: string;
  permissions: {
    manageDrivers: boolean;
    viewOrders: boolean;
    editOrders: boolean;
    manageWarehouses: boolean;
    editShippingRates: boolean;
    viewAnalytics: boolean;
  };
  userCount: number;
}

export default function AccessControl() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getRoles();
      setRoles(res.roles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const formatPermissionKey = (key: string) =>
    key.replace(/([A-Z])/g, ' $1').trim();

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Control</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage user roles and permissions for logistics operations. Data from backend.
          </p>
        </div>
        <button
          onClick={loadRoles}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
        >
          Refresh
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
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No roles found from the database.</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {roles.map((role, i) => (
            <motion.div
              key={role.id}
              variants={staggerItem}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ y: -2, boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {role.userCount} users assigned
                    </p>
                  </div>
                </div>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(role.permissions).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatPermissionKey(key)}
                    </span>
                    {value ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
