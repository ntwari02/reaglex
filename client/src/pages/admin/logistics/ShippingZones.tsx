import React, { useState } from 'react';
import { MapPin, Plus, Edit, Trash2, DollarSign, Package, Navigation, Zap } from 'lucide-react';

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

const mockZones: ShippingZone[] = [
  {
    id: '1',
    name: 'Local Delivery',
    type: 'local',
    rateType: 'flat',
    baseRate: 5.0,
    freeShippingThreshold: 50,
    codAvailable: true,
  },
  {
    id: '2',
    name: 'National Shipping',
    type: 'national',
    rateType: 'weight',
    baseRate: 10.0,
    freeShippingThreshold: 100,
    codAvailable: true,
  },
  {
    id: '3',
    name: 'International',
    type: 'international',
    rateType: 'dynamic',
    baseRate: 25.0,
    codAvailable: false,
    countries: ['US', 'UK', 'CA'],
  },
];

export default function ShippingZones() {
  const [zones, setZones] = useState<ShippingZone[]>(mockZones);
  const [showAddModal, setShowAddModal] = useState(false);

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
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[type]}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shipping Zones & Rates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure shipping zones and delivery rates
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Add Zone
        </button>
      </div>

      {/* Zones Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
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
              {zones.map((zone) => (
                <tr
                  key={zone.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {zone.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getTypeBadge(zone.type)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRateTypeIcon(zone.rateType)}
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
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
                    {zone.freeShippingThreshold ? (
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
                      <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

