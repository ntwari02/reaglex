import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Search, Eye, Package, Truck, CheckCircle, XCircle, Filter, Printer, Upload, X, MapPin, CreditCard, User, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  status: 'pending' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentMethod: string;
  trackingNumber?: string;
  timeline: {
    status: string;
    date: string;
    time: string;
  }[];
}

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Order['status'] | ''>('');
  const [showBulkShippingModal, setShowBulkShippingModal] = useState(false);
  const [bulkCarrier, setBulkCarrier] = useState<'ups' | 'fedex' | 'dhl'>('ups');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');

      const res = await fetch('http://localhost:5000/api/seller/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        // Not authenticated as seller; send to login/home
        navigate(res.status === 401 ? '/login' : '/');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to load orders');
      }

      const data = await res.json();

      const mapped: Order[] = (data.orders || []).map((o: any) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        items: (o.items || []).map((item: any) => ({
          id: item._id || item.productId || '',
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          variant: item.variant,
        })),
        subtotal: o.subtotal,
        shipping: o.shipping,
        tax: o.tax,
        total: o.total,
        status: o.status,
        date: o.date ? new Date(o.date).toISOString().slice(0, 10) : '',
        shippingAddress: {
          name: o.shippingAddress?.name || '',
          street: o.shippingAddress?.street || '',
          city: o.shippingAddress?.city || '',
          state: o.shippingAddress?.state || '',
          zip: o.shippingAddress?.zip || '',
          country: o.shippingAddress?.country || '',
        },
        paymentMethod: o.paymentMethod,
        trackingNumber: o.trackingNumber,
        timeline: (o.timeline || []).map((t: any) => ({
          status: t.status,
          date: t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
          time: t.time,
        })),
      }));

      setOrders(mapped);
    } catch (err: any) {
      console.error('Failed to fetch seller orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        await fetchOrders();
      } catch (err: any) {
        // error is already handled inside fetchOrders
      }
    };

    load();
  }, [fetchOrders]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'processing': case 'packed': return Package;
      case 'shipped': return Truck;
      case 'delivered': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Package;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'packed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'shipped': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredOrders.map((order) => order.id);
    const allSelected = visibleIds.every((id) => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      const merged = new Set([...selectedOrderIds, ...visibleIds]);
      setSelectedOrderIds(Array.from(merged));
    }
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleViewOrder = (order: Order) => {
    navigate(`/seller/orders/${order.id}`);
  };

  const handleMarkAsPacked = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`http://localhost:5000/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'packed' }),
      });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to mark as packed', err);
    }
  };

  const handleMarkAsShipped = (orderId: string) => {
    setShowTrackingModal(true);
    setSelectedOrder(orders.find(o => o.id === orderId) || null);
  };

  const handleSubmitTracking = async () => {
    if (selectedOrder && trackingNumber) {
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`http://localhost:5000/api/seller/orders/${selectedOrder.id}/tracking`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ trackingNumber }),
        });
        setShowTrackingModal(false);
        setTrackingNumber('');
        await fetchOrders();
      } catch (err) {
        console.error('Failed to submit tracking', err);
      }
    }
  };

  const handleCancelOrder = async () => {
    if (selectedOrder && cancelReason) {
      try {
        const token = localStorage.getItem('auth_token');
        await fetch(`http://localhost:5000/api/seller/orders/${selectedOrder.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ status: 'cancelled', reason: cancelReason }),
        });
        setShowCancelModal(false);
        setCancelReason('');
        setShowOrderDetails(false);
        await fetchOrders();
      } catch (err) {
        console.error('Failed to cancel order', err);
      }
    }
  };

  const handlePrintInvoice = (order: Order) => {
    window.print();
  };

  const handlePrintPackingSlip = (order: Order) => {
    window.print();
  };

  const handleBatchPrintInvoices = () => {
    if (!selectedOrderIds.length) return;
    console.log('Batch print invoices for orders:', selectedOrderIds);
    window.print();
  };

  const handleBatchPrintPackingSlips = () => {
    if (!selectedOrderIds.length) return;
    console.log('Batch print packing slips for orders:', selectedOrderIds);
    window.print();
  };

  const handleBatchStatusUpdate = async (status: Order['status']) => {
    if (!selectedOrderIds.length) return;
    try {
      const token = localStorage.getItem('auth_token');

      await Promise.all(
        selectedOrderIds.map((orderId) =>
          fetch(`http://localhost:5000/api/seller/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ status }),
          })
        )
      );

      setBulkStatus('');
      await fetchOrders();
    } catch (err) {
      console.error('Failed to apply bulk status update', err);
    }
  };

  const handleBatchGenerateLabels = () => {
    if (!selectedOrderIds.length) return;
    setShowBulkShippingModal(true);
  };

  const selectedOrders = orders.filter((order) => selectedOrderIds.includes(order.id));

  const handleConfirmBulkShipping = () => {
    if (!selectedOrders.length) return;
    // This is a frontend-only stub for carrier API integration.
    // Here you would call your shipping provider (UPS/FedEx/DHL, etc.)
    // and sync tracking numbers back into your system.
    console.log('Generate labels via carrier:', bulkCarrier, 'for orders:', selectedOrders);
    setShowBulkShippingModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <ShoppingCart className="w-8 h-8 text-red-400" />
            Orders Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">View and manage all your orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="border-gray-300 dark:border-gray-700"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors duration-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Batch actions toolbar */}
        {selectedOrderIds.length > 0 && (
          <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 rounded-lg border border-red-200/60 dark:border-red-500/40 bg-red-50/40 dark:bg-red-900/10 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="rounded border-red-300 text-red-500 focus:ring-red-500"
                onChange={handleSelectAllVisible}
                checked={
                  filteredOrders.length > 0 &&
                  filteredOrders.every((order) => selectedOrderIds.includes(order.id))
                }
              />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-red-700/80 dark:text-red-200/80">
                  Run batch operations like invoice printing, label generation, and status updates.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700"
                onClick={handleBatchPrintInvoices}
              >
                <Printer className="w-3 h-3 mr-2" />
                Print Invoices
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700"
                onClick={handleBatchPrintPackingSlips}
              >
                <Printer className="w-3 h-3 mr-2" />
                Print Packing Slips
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-700"
                onClick={handleBatchGenerateLabels}
              >
                <Truck className="w-3 h-3 mr-2" />
                Generate Labels
              </Button>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600 dark:text-gray-400">Update status to</span>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as Order['status'] | '')}
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select...</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!bulkStatus}
                  className="border-gray-300 dark:border-gray-700 text-xs"
                  onClick={() => bulkStatus && handleBatchStatusUpdate(bulkStatus)}
                >
                  Apply
                </Button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="ml-1 inline-flex items-center text-[11px] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Orders List */}
        <div className="space-y-4">
        {loading && (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading orders...</p>
        )}
        {error && !loading && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!loading && !error && filteredOrders.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No orders found for the selected filters.
          </p>
        )}
          {filteredOrders.map((order, index) => {
            const StatusIcon = getStatusIcon(order.status);
            const isSelected = selectedOrderIds.includes(order.id);
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border hover:border-red-500/50 transition-all ${
                  isSelected
                    ? 'border-red-400/70 dark:border-red-500/70 ring-1 ring-red-500/40'
                    : 'border-gray-200 dark:border-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOrder(order.id)}
                      className="mt-1 rounded border-gray-300 dark:border-gray-600 text-red-500 focus:ring-red-500"
                      aria-label={`Select order ${order.orderNumber}`}
                    />
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
                        <StatusIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">{order.orderNumber}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(order.status)} font-medium capitalize`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">
                          {order.customer} • {order.items.length} items • {order.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    onClick={() => handleViewOrder(order)}
                  >
                    <Eye className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Order Details - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-400" />
                    Customer Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-900 dark:text-white">{selectedOrder.customer}</p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedOrder.customerEmail}</p>
                    <p className="text-gray-600 dark:text-gray-400">{selectedOrder.customerPhone}</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-400" />
                    Shipping Address
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>{selectedOrder.shippingAddress.name}</p>
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zip}</p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-400" />
                  Payment Method
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.paymentMethod}</p>
              </div>

              {/* Order Items */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items in Order</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.variant && <p className="text-sm text-gray-600 dark:text-gray-400">Variant: {item.variant}</p>}
                        <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-400" />
                  Order Timeline
                </h3>
                <div className="space-y-3">
                  {selectedOrder.timeline.map((event, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === selectedOrder.timeline.length - 1 ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{event.status}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{event.date} at {event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {selectedOrder.status === 'processing' && (
                  <Button 
                    onClick={() => handleMarkAsPacked(selectedOrder.id)}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Mark as Packed
                  </Button>
                )}
                {(selectedOrder.status === 'packed' || selectedOrder.status === 'processing') && (
                  <Button 
                    onClick={() => handleMarkAsShipped(selectedOrder.id)}
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark as Shipped
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="border-gray-300 dark:border-gray-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Invoice
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handlePrintPackingSlip(selectedOrder)}
                  className="border-gray-300 dark:border-gray-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Packing Slip
                </Button>
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowCancelModal(true);
                      setShowOrderDetails(false);
                    }}
                    className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Number Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Upload Tracking Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTrackingModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitTracking}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Shipping Labels Modal */}
      <Dialog open={showBulkShippingModal} onOpenChange={setShowBulkShippingModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Generate Shipping Labels
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are about to generate labels for{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''}
              </span>
              . Choose a carrier to send the request to your shipping integration.
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Carrier
              </label>
              <select
                value={bulkCarrier}
                onChange={(e) => setBulkCarrier(e.target.value as 'ups' | 'fedex' | 'dhl')}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="dhl">DHL</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This demo uses a frontend-only stub. In production, this is where you'd call your
                carrier API to create labels and sync tracking numbers back to each order.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkShippingModal(false)}
                className="border-gray-300 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBulkShipping}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                <Truck className="w-4 h-4 mr-2" />
                Generate Labels
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Cancel Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Cancellation (Required)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this order..."
                rows={4}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Close
              </Button>
              <Button 
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
