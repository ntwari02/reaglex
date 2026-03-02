import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  Package,
  User,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface ReturnShipment {
  id: string;
  returnNumber: string;
  orderId: string;
  customerName: string;
  status: 'pending' | 'pickup_scheduled' | 'in_transit' | 'received' | 'refunded';
  returnReason: string;
  pickupDriver?: string;
  refundAmount: number;
  returnCost: number;
  createdAt: string;
}

const mockReturns: ReturnShipment[] = [
  {
    id: '1',
    returnNumber: 'RET-001234',
    orderId: 'ORD-12345',
    customerName: 'John Doe',
    status: 'in_transit',
    returnReason: 'Wrong item received',
    pickupDriver: 'John Smith',
    refundAmount: 99.99,
    returnCost: 5.0,
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    returnNumber: 'RET-001235',
    orderId: 'ORD-12346',
    customerName: 'Jane Smith',
    status: 'pending',
    returnReason: 'Product not as described',
    refundAmount: 149.99,
    returnCost: 0,
    createdAt: '2024-03-17',
  },
];

export default function ReturnsReverse() {
  const [returns, setReturns] = useState<ReturnShipment[]>(mockReturns);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReturns = returns.filter(
    (returnItem) =>
      returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: ReturnShipment['status']) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      pickup_scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      in_transit: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
      received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    const labels = {
      pending: 'Pending',
      pickup_scheduled: 'Pickup Scheduled',
      in_transit: 'In Transit',
      received: 'Received',
      refunded: 'Refunded',
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Returns & Reverse Logistics
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage RTO (Return to Origin) shipments and refunds
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by return number or order ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {filteredReturns.map((returnItem) => (
          <div
            key={returnItem.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {returnItem.returnNumber}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Order: {returnItem.orderId} • {returnItem.customerName}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {getStatusBadge(returnItem.status)}
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Package className="h-4 w-4" />
                    <span>{returnItem.returnReason}</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-gray-600 dark:text-gray-400">Refund:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${returnItem.refundAmount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-gray-600 dark:text-gray-400">Return Cost:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${returnItem.returnCost}
                    </span>
                  </div>
                  {returnItem.pickupDriver && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-gray-600 dark:text-gray-400">Driver:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {returnItem.pickupDriver}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Truck className="mr-1 inline h-4 w-4" />
                  Assign Driver
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <CheckCircle className="mr-1 inline h-4 w-4" />
                  Process Refund
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

