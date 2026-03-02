import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Package,
  Truck,
  CheckCircle,
  X,
  Clock,
  User,
  MapPin,
} from 'lucide-react';

interface SellerOrdersProps {
  sellerId: string;
}

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'returned';

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  total: number;
  items: number;
  orderDate: string;
  shippingAddress: string;
  trackingNumber?: string;
  isSuspicious: boolean;
  hasRefundRequest: boolean;
  hasReturnRequest: boolean;
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: 'delivered',
    total: 299.99,
    items: 2,
    orderDate: '2024-03-10',
    shippingAddress: '123 Main St, New York, NY 10001',
    trackingNumber: 'TRACK-123456',
    isSuspicious: false,
    hasRefundRequest: false,
    hasReturnRequest: false,
  },
  {
    id: 'ORD-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: 'shipped',
    total: 149.99,
    items: 1,
    orderDate: '2024-03-12',
    shippingAddress: '456 Oak Ave, Los Angeles, CA 90001',
    trackingNumber: 'TRACK-789012',
    isSuspicious: false,
    hasRefundRequest: false,
    hasReturnRequest: false,
  },
  {
    id: 'ORD-003',
    customerName: 'Bob Johnson',
    customerEmail: 'bob@example.com',
    status: 'pending',
    total: 89.99,
    items: 3,
    orderDate: '2024-03-15',
    shippingAddress: '789 Pine Rd, Chicago, IL 60601',
    isSuspicious: true,
    hasRefundRequest: false,
    hasReturnRequest: false,
  },
  {
    id: 'ORD-004',
    customerName: 'Alice Brown',
    customerEmail: 'alice@example.com',
    status: 'delivered',
    total: 199.99,
    items: 1,
    orderDate: '2024-03-08',
    shippingAddress: '321 Elm St, Houston, TX 77001',
    trackingNumber: 'TRACK-345678',
    isSuspicious: false,
    hasRefundRequest: true,
    hasReturnRequest: false,
  },
  {
    id: 'ORD-005',
    customerName: 'Charlie Wilson',
    customerEmail: 'charlie@example.com',
    status: 'cancelled',
    total: 59.99,
    items: 1,
    orderDate: '2024-03-14',
    shippingAddress: '654 Maple Dr, Phoenix, AZ 85001',
    isSuspicious: false,
    hasRefundRequest: false,
    hasReturnRequest: false,
  },
];

export default function SellerOrders({ sellerId }: SellerOrdersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const getStatusBadge = (status: OrderStatus) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      packed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
      shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
      delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  const orderStats = {
    total: mockOrders.length,
    pending: mockOrders.filter((o) => o.status === 'pending').length,
    shipped: mockOrders.filter((o) => o.status === 'shipped').length,
    delivered: mockOrders.filter((o) => o.status === 'delivered').length,
    suspicious: mockOrders.filter((o) => o.isSuspicious).length,
    refundRequests: mockOrders.filter((o) => o.hasRefundRequest).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Orders</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">All orders from this seller</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.pending}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Shipped</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.shipped}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Delivered</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{orderStats.delivered}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Suspicious</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{orderStats.suspicious}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Refund Requests</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{orderStats.refundRequests}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Search by order ID, customer name, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{order.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{order.items}</td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    ${order.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {order.trackingNumber || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {order.isSuspicious && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                          Suspicious
                        </span>
                      )}
                      {order.hasRefundRequest && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                          Refund
                        </span>
                      )}
                      {order.hasReturnRequest && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
                          Return
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
                      className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
                      title="View order details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowOrderModal(false);
                setSelectedOrder(null);
              }}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Order Details</h3>
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Order ID</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Status</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Total</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${selectedOrder.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Items</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedOrder.items}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Order Date</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedOrder.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-300">{selectedOrder.customerEmail}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{selectedOrder.shippingAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Progress */}
              {selectedOrder.trackingNumber && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Shipping Progress</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Tracking: {selectedOrder.trackingNumber}
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {['pending', 'accepted', 'packed', 'shipped', 'delivered'].map((status, index) => {
                        const isActive = ['pending', 'accepted', 'packed', 'shipped', 'delivered'].indexOf(
                          selectedOrder.status,
                        ) >= index;
                        return (
                          <div key={status} className="flex items-center gap-2">
                            {isActive ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-400" />
                            )}
                            <span
                              className={`text-xs ${isActive ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Flags */}
              {(selectedOrder.isSuspicious || selectedOrder.hasRefundRequest || selectedOrder.hasReturnRequest) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Flags & Alerts</h4>
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    {selectedOrder.isSuspicious && (
                      <p className="text-amber-700 dark:text-amber-300">⚠️ Suspicious activity detected</p>
                    )}
                    {selectedOrder.hasRefundRequest && (
                      <p className="text-amber-700 dark:text-amber-300">💰 Refund request pending</p>
                    )}
                    {selectedOrder.hasReturnRequest && (
                      <p className="text-amber-700 dark:text-amber-300">📦 Return request pending</p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  View Timeline
                </button>
                {selectedOrder.isSuspicious && (
                  <button className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    Flag Suspicious
                  </button>
                )}
                {(selectedOrder.hasRefundRequest || selectedOrder.hasReturnRequest) && (
                  <button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40">
                    Handle Request
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
