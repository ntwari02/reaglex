import React, { useState } from 'react';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Edit,
  Printer,
  Download,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  DollarSign,
  Store,
  FileText,
  Send,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface OrderDetailsProps {
  order: any;
  onBack: () => void;
}

export default function OrderDetails({ order, onBack }: OrderDetailsProps) {
  const [statusUpdate, setStatusUpdate] = useState(order.status);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const orderItems = [
    {
      id: 'ITEM-001',
      productName: 'Wireless Bluetooth Headphones',
      sku: 'WBH-001',
      image: '/placeholder-product.jpg',
      sellerName: 'TechHub Electronics',
      quantity: 1,
      price: 79.99,
      total: 79.99,
      variant: 'Black',
      stockStatus: 'in_stock',
    },
    {
      id: 'ITEM-002',
      productName: 'USB-C Cable 2m',
      sku: 'UCC-002',
      image: '/placeholder-product.jpg',
      sellerName: 'TechHub Electronics',
      quantity: 1,
      price: 12.99,
      total: 12.99,
      variant: 'White',
      stockStatus: 'in_stock',
    },
  ];

  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const discount = 0;
  const tax = subtotal * 0.1;
  const shippingFee = 10.0;
  const grandTotal = subtotal - discount + tax + shippingFee;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
      shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
      out_for_delivery: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200',
      delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] || ''}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const statusFlow = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Order {order.orderId}</h1>
            {getStatusBadge(order.status)}
            {order.isHighValue && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
                High Value
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Placed on {new Date(order.orderDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Printer className="h-4 w-4" /> Print Invoice
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Order Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Timeline */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Order Status</h2>
              <button
                onClick={() => setShowStatusModal(true)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                Update Status
              </button>
            </div>
            <div className="space-y-3">
              {statusFlow.map((status, index) => {
                const isActive = statusFlow.indexOf(order.status) >= index;
                const isCurrent = order.status === status;
                return (
                  <div key={status} className="flex items-center gap-3">
                    {isActive ? (
                      <CheckCircle className={`h-5 w-5 ${isCurrent ? 'text-emerald-500' : 'text-gray-400'}`} />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm font-semibold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items in Order */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Items in Order</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{item.productName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>Variant: {item.variant}</span>
                          <span>•</span>
                          <span>Seller: {item.sellerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">${item.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Delivery Information</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Delivery Address</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    123 Main Street, {order.city}, NY 10001
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No special instructions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Shipping Method</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{order.shippingMethod}</p>
                </div>
              </div>
              {order.trackingNumber && (
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Tracking Number</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{order.trackingNumber}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Estimated Delivery</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(order.deliveryDateEstimate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Discount</span>
                <span className="font-semibold text-gray-900 dark:text-white">-${discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Tax</span>
                <span className="font-semibold text-gray-900 dark:text-white">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Shipping Fee</span>
                <span className="font-semibold text-gray-900 dark:text-white">${shippingFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 dark:border-gray-800">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Customer Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.customerName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {order.customerEmail}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {order.customerPhone}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  View Profile
                </button>
                <button className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  Order History
                </button>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Payment Information</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Payment Method</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {order.paymentMethod.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Payment Status</span>
                {getStatusBadge(order.paymentStatus)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Transaction ID</span>
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">TXN-123456789</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Payment Time</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(order.orderDate).toLocaleString()}
                </span>
              </div>
              {order.paymentStatus === 'paid' && (
                <button className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  Refund Payment
                </button>
              )}
            </div>
          </div>

          {/* Seller Panel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Seller Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{order.sellerName}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Seller Earnings</span>
                  <span className="font-semibold text-gray-900 dark:text-white">$250.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Commission</span>
                  <span className="font-semibold text-gray-900 dark:text-white">$49.99</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Payout Status</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                    Eligible
                  </span>
                </div>
              </div>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                View Seller Invoice
              </button>
            </div>
          </div>

          {/* Order Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Edit Items
              </button>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Change Address
              </button>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Assign Delivery Agent
              </button>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Resend Confirmation
              </button>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Resend Payment Link
              </button>
              <button className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Update Order Status</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">New Status</label>
                <select
                  value={statusUpdate}
                  onChange={(e) => setStatusUpdate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {statusFlow.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Note for Seller
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Add a note for the seller..."
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Note for Customer
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Add a note for the customer..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Update status to:', statusUpdate);
                    setShowStatusModal(false);
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

