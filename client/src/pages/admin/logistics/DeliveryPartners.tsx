import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Eye,
  XCircle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';

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

const mockPartners: DeliveryPartner[] = [
  {
    id: '1',
    name: 'FedEx',
    type: 'api',
    status: 'active',
    onTimeDelivery: 94.5,
    avgDeliveryTime: '2.3 days',
    failedDeliveryRate: 2.1,
    apiStatus: 'connected',
    totalShipments: 1245,
  },
  {
    id: '2',
    name: 'DHL Express',
    type: 'api',
    status: 'active',
    onTimeDelivery: 92.8,
    avgDeliveryTime: '2.1 days',
    failedDeliveryRate: 3.2,
    apiStatus: 'connected',
    totalShipments: 892,
  },
  {
    id: '3',
    name: 'In-House Delivery',
    type: 'in-house',
    status: 'active',
    onTimeDelivery: 88.5,
    avgDeliveryTime: '1.5 days',
    failedDeliveryRate: 5.8,
    apiStatus: 'connected',
    totalShipments: 567,
  },
  {
    id: '4',
    name: 'Local Courier A',
    type: 'courier',
    status: 'active',
    onTimeDelivery: 85.2,
    avgDeliveryTime: '3.2 days',
    failedDeliveryRate: 8.5,
    apiStatus: 'disconnected',
    totalShipments: 423,
  },
];

export default function DeliveryPartners() {
  const [partners, setPartners] = useState<DeliveryPartner[]>(mockPartners);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredPartners = partners.filter((partner) =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Partners</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage couriers, in-house drivers, and logistics partners
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Add Partner
        </button>
      </div>

      {/* Search */}
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

      {/* Partners Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPartners.map((partner) => (
          <div
            key={partner.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                  <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{partner.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {partner.type}
                  </p>
                </div>
              </div>
              {getStatusBadge(partner.status)}
            </div>

            {/* Performance Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">On-Time Delivery</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {partner.onTimeDelivery}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Avg Delivery Time</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {partner.avgDeliveryTime}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Failed Rate</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {partner.failedDeliveryRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Shipments</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {partner.totalShipments}
                </span>
              </div>
            </div>

            {/* API Status */}
            {partner.type === 'api' && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <span className="text-xs text-gray-600 dark:text-gray-400">API Status</span>
                {getApiStatusBadge(partner.apiStatus)}
              </div>
            )}

            {/* Actions */}
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
          </div>
        ))}
      </div>
    </div>
  );
}

