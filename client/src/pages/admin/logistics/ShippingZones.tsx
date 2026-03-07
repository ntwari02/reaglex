import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Edit, Trash2, DollarSign, Package, Navigation, Zap } from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, listRowStagger } from './logisticsAnimations';

interface ShippingZone {
  id: string;
  name: string;
  type: 'local' | 'national' | 'international';
  rateType: 'flat' | 'weight' | 'distance' | 'dynamic';
  baseRate: number;
  freeShippingThreshold?: number;
  codAvailable: boolean;
  countries?: string[];
}

export default function ShippingZones() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getZones();
      setZones(res.zones ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load zones');
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const getRateTypeIcon = (type: ShippingZone['rateType']) => {
    switch (type) {
      case 'flat':
        return <DollarSign className="h-4 w-4" />;
      case 'weight':
        return <Package className="h-4 w-4" />;
      case 'distance':
        return <Navigation className="h-4 w-4" />;
      case 'dynamic':
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: ShippingZone['type']) => {
    const styles = {
      local: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      national: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      international: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[type]}`}>{type}</span>
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shipping Zones & Rates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure shipping zones and delivery rates. Data from backend.
          </p>
        </div>
        <button
          onClick={loadZones}
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
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      ) : zones.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No shipping zones found from the database.</p>
        </motion.div>
      ) : (
        <motion.div
          className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900"
          initial={pageTransition.initial}
          animate={pageTransition.animate}
          transition={pageTransition.transition}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Zone Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Rate Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Base Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Free Shipping
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    COD
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {zones.map((zone, i) => (
                  <motion.tr
                    key={zone.id}
                    {...listRowStagger(i)}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">{zone.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(zone.type)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRateTypeIcon(zone.rateType)}
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                          {zone.rateType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${zone.baseRate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {zone.freeShippingThreshold != null ? (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          ${zone.freeShippingThreshold}+
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {zone.codAvailable ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this zone?')) return;
                            try {
                              await adminLogisticsAPI.deleteZone(zone.id);
                              loadZones();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Delete failed');
                            }
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
