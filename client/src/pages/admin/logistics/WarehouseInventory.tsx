import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Warehouse,
  Plus,
  Package,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { adminLogisticsAPI } from '@/lib/api';
import { pageTransition, staggerContainer, staggerItem } from './logisticsAnimations';

interface WarehouseData {
  id: string;
  name: string;
  location: string;
  totalStock: number;
  lowStockItems: number;
  inboundShipments: number;
  outboundShipments: number;
  damagedItems: number;
}

export default function WarehouseInventory() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogisticsAPI.getWarehouses();
      setWarehouses(res.warehouses ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load warehouses');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Warehouse & Inventory Logistics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage warehouses, stock movements, and inventory tracking. Data from backend.
          </p>
        </div>
        <button
          onClick={loadWarehouses}
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
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">No warehouses found from the database.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {warehouses.map((warehouse, i) => (
            <motion.div
              key={warehouse.id}
              variants={staggerItem}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
              whileHover={{ y: -2, boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.12)' }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                    <Warehouse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{warehouse.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{warehouse.location}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Stock</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    {warehouse.totalStock.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock Items</p>
                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                    {warehouse.lowStockItems}
                  </p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400">Inbound</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {warehouse.inboundShipments}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-gray-600 dark:text-gray-400">Outbound</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {warehouse.outboundShipments}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-gray-600 dark:text-gray-400">Damaged</span>
                  </div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {warehouse.damagedItems}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <FileText className="mr-1 inline h-4 w-4" />
                  View Details
                </button>
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Package className="mr-1 inline h-4 w-4" />
                  Stock Movement
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
