import React, { useState } from 'react';
import {
  Warehouse,
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Search,
} from 'lucide-react';

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

const mockWarehouses: WarehouseData[] = [
  {
    id: '1',
    name: 'Main Warehouse',
    location: 'New York, NY',
    totalStock: 15420,
    lowStockItems: 12,
    inboundShipments: 45,
    outboundShipments: 89,
    damagedItems: 3,
  },
  {
    id: '2',
    name: 'West Coast Hub',
    location: 'Los Angeles, CA',
    totalStock: 8920,
    lowStockItems: 8,
    inboundShipments: 32,
    outboundShipments: 67,
    damagedItems: 1,
  },
];

export default function WarehouseInventory() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>(mockWarehouses);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Warehouse & Inventory Logistics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage warehouses, stock movements, and inventory tracking
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Add Warehouse
        </button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {warehouses.map((warehouse) => (
          <div
            key={warehouse.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
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

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
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

            {/* Shipments */}
            <div className="space-y-2 mb-4">
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

            {/* Actions */}
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
          </div>
        ))}
      </div>
    </div>
  );
}

