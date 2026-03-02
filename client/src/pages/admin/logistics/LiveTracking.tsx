import React, { useState } from 'react';
import {
  Package,
  Search,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  Eye,
} from 'lucide-react';

interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  customerName: string;
  status: 'packed' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  currentLocation?: string;
  estimatedDelivery: string;
  partner: string;
  lastUpdate: string;
}

const mockShipments: Shipment[] = [
  {
    id: '1',
    trackingNumber: 'TRK-001234',
    orderId: 'ORD-12345',
    customerName: 'John Doe',
    status: 'out_for_delivery',
    currentLocation: 'Downtown Area',
    estimatedDelivery: 'Today, 3:00 PM',
    partner: 'In-House Delivery',
    lastUpdate: '2 hours ago',
  },
  {
    id: '2',
    trackingNumber: 'TRK-001235',
    orderId: 'ORD-12346',
    customerName: 'Jane Smith',
    status: 'in_transit',
    estimatedDelivery: 'Tomorrow, 10:00 AM',
    partner: 'FedEx',
    lastUpdate: '1 hour ago',
  },
  {
    id: '3',
    trackingNumber: 'TRK-001236',
    orderId: 'ORD-12347',
    customerName: 'Bob Johnson',
    status: 'delivered',
    estimatedDelivery: 'Delivered',
    partner: 'DHL Express',
    lastUpdate: '5 hours ago',
  },
];

export default function LiveTracking() {
  const [shipments, setShipments] = useState<Shipment[]>(mockShipments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Shipment['status']) => {
    const styles = {
      packed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      in_transit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      out_for_delivery: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
      delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
    };
    const labels = {
      packed: 'Packed',
      shipped: 'Shipped',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      failed: 'Failed',
      returned: 'Returned',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Live Delivery Tracking</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track all active shipments in real-time
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tracking number, order ID, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {filteredShipments.map((shipment) => (
          <div
            key={shipment.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
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
          </div>
        ))}
      </div>
    </div>
  );
}

