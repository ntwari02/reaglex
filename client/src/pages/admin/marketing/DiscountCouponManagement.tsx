import React, { useState } from 'react';
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Copy,
  Search,
  Percent,
  DollarSign,
  Truck,
  Calendar,
  Users,
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder?: number;
  usageLimit?: number;
  usedCount: number;
  expiryDate: string;
  status: 'active' | 'expired' | 'disabled';
  applicableTo: string;
}

const mockCoupons: Coupon[] = [
  {
    id: '1',
    code: 'SAVE20',
    type: 'percentage',
    value: 20,
    minOrder: 50,
    usageLimit: 1000,
    usedCount: 245,
    expiryDate: '2024-04-30',
    status: 'active',
    applicableTo: 'All Products',
  },
  {
    id: '2',
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    minOrder: 25,
    expiryDate: '2024-05-15',
    status: 'active',
    applicableTo: 'All Orders',
  },
];

export default function DiscountCouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>(mockCoupons);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: Coupon['type']) => {
    switch (type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'fixed':
        return <DollarSign className="h-4 w-4" />;
      case 'free_shipping':
        return <Truck className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: Coupon['status']) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      expired: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      disabled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Discount & Coupon Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage discount codes and coupons
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Create Coupon
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search coupons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Coupons Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredCoupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">
                        {coupon.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(coupon.type)}
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {coupon.type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {coupon.type === 'percentage'
                        ? `${coupon.value}%`
                        : coupon.type === 'free_shipping'
                          ? 'Free'
                          : `$${coupon.value}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {coupon.usedCount}
                      {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(coupon.expiryDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(coupon.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                        <Copy className="h-4 w-4" />
                      </button>
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

