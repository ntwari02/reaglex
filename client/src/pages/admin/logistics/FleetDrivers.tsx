import React, { useState } from 'react';
import {
  Users,
  Plus,
  Car,
  MapPin,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
  Edit,
} from 'lucide-react';

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

const mockDrivers: Driver[] = [
  {
    id: '1',
    name: 'John Smith',
    phone: '+1234567890',
    vehicle: 'Van-001',
    status: 'on-delivery',
    onTimeDelivery: 92.5,
    totalDeliveries: 245,
    avgDeliveryTime: '1.2 hours',
    currentLocation: 'Downtown Area',
  },
  {
    id: '2',
    name: 'Mike Johnson',
    phone: '+1234567891',
    vehicle: 'Truck-002',
    status: 'active',
    onTimeDelivery: 88.3,
    totalDeliveries: 189,
    avgDeliveryTime: '1.5 hours',
  },
  {
    id: '3',
    name: 'Sarah Williams',
    phone: '+1234567892',
    vehicle: 'Bike-003',
    status: 'offline',
    onTimeDelivery: 95.2,
    totalDeliveries: 312,
    avgDeliveryTime: '0.8 hours',
  },
];

export default function FleetDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredDrivers = drivers.filter((driver) =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fleet & Drivers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage in-house delivery drivers and vehicles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Add Driver
        </button>
      </div>

      {/* Search */}
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

      {/* Drivers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDrivers.map((driver) => (
          <div
            key={driver.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
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

            {/* Vehicle Info */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
              <Car className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {driver.vehicle}
              </span>
            </div>

            {/* Location */}
            {driver.currentLocation && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-gray-600 dark:text-gray-400">{driver.currentLocation}</span>
              </div>
            )}

            {/* Performance Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">On-Time Delivery</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {driver.onTimeDelivery}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Deliveries</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {driver.totalDeliveries}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Avg Delivery Time</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {driver.avgDeliveryTime}
                </span>
              </div>
            </div>

            {/* Actions */}
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
          </div>
        ))}
      </div>
    </div>
  );
}

