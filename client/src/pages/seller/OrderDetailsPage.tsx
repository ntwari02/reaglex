import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Mail, Phone, MapPin, CreditCard, Package, Truck,
  CheckCircle, XCircle, Clock, Printer, Download, Edit, Save, X,
  Calendar, DollarSign, AlertCircle, FileText, Box, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  sku?: string;
  image?: string;
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
  billingAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  trackingNumber?: string;
  carrier?: 'ups' | 'fedex' | 'dhl' | 'usps' | 'other';
  timeline: {
    status: string;
    date: string;
    time: string;
  }[];
  notes?: string;
}

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState<'ups' | 'fedex' | 'dhl' | 'usps' | 'other'>('ups');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<Order['status'] | ''>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const token = localStorage.getItem('auth_token');

        const res = await fetch(`http://localhost:5000/api/seller/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });

        if (res.status === 401) {
          navigate('/login');
          return;
        }

        if (res.status === 403) {
          navigate('/');
          return;
        }

        if (!res.ok) {
          console.error('Failed to fetch order details');
          setOrder(null);
          setLoading(false);
          return;
        }

        const data = await res.json();
        const o = data.order;

        if (!o) {
          setOrder(null);
          setLoading(false);
          return;
        }

        const mapped: Order = {
          id: o._id || orderId,
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
            sku: item.sku,
            image: item.image,
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
          billingAddress: o.billingAddress && {
            name: o.billingAddress.name || '',
            street: o.billingAddress.street || '',
            city: o.billingAddress.city || '',
            state: o.billingAddress.state || '',
            zip: o.billingAddress.zip || '',
            country: o.billingAddress.country || '',
          },
          paymentMethod: o.paymentMethod || 'Unknown',
          paymentStatus: o.paymentStatus || 'paid',
          trackingNumber: o.trackingNumber || '',
          carrier: o.carrier || 'ups',
          timeline: (o.timeline || []).map((t: any) => ({
            status: t.status,
            date: t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
            time: t.time || '',
          })),
          notes: o.notes,
        };

        setOrder(mapped);
        setTrackingNumber(mapped.trackingNumber || '');
        setCarrier(mapped.carrier || 'ups');
      } catch (err) {
        console.error('Error fetching order details:', err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'refunded': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleSaveTracking = async () => {
    if (!order) return;

    try {
      const token = localStorage.getItem('auth_token');

      const res = await fetch(
        `http://localhost:5000/api/seller/orders/${order.id}/tracking`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ trackingNumber, carrier }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const o = data.order;
        if (o) {
          const mapped: Order = {
            id: o._id || order.id,
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
              sku: item.sku,
              image: item.image,
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
            billingAddress: o.billingAddress && {
              name: o.billingAddress.name || '',
              street: o.billingAddress.street || '',
              city: o.billingAddress.city || '',
              state: o.billingAddress.state || '',
              zip: o.billingAddress.zip || '',
              country: o.billingAddress.country || '',
            },
            paymentMethod: o.paymentMethod || 'Unknown',
            paymentStatus: o.paymentStatus || 'paid',
            trackingNumber: o.trackingNumber || '',
            carrier: o.carrier || 'ups',
            timeline: (o.timeline || []).map((t: any) => ({
              status: t.status,
              date: t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
              time: t.time || '',
            })),
            notes: o.notes,
          };

          setOrder(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to save tracking', err);
    } finally {
      setIsEditingTracking(false);
    }
  };

  const handleStatusChange = (status: Order['status']) => {
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!order || !newStatus) return;

    try {
      const token = localStorage.getItem('auth_token');

      const res = await fetch(
        `http://localhost:5000/api/seller/orders/${order.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus, reason: statusChangeReason }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const o = data.order;
        if (o) {
          const mapped: Order = {
            id: o._id || order.id,
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
              sku: item.sku,
              image: item.image,
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
            billingAddress: o.billingAddress && {
              name: o.billingAddress.name || '',
              street: o.billingAddress.street || '',
              city: o.billingAddress.city || '',
              state: o.billingAddress.state || '',
              zip: o.billingAddress.zip || '',
              country: o.billingAddress.country || '',
            },
            paymentMethod: o.paymentMethod || 'Unknown',
            paymentStatus: o.paymentStatus || 'paid',
            trackingNumber: o.trackingNumber || '',
            carrier: o.carrier || 'ups',
            timeline: (o.timeline || []).map((t: any) => ({
              status: t.status,
              date: t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
              time: t.time || '',
            })),
            notes: o.notes,
          };

          setOrder(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to change status', err);
    } finally {
      setShowStatusModal(false);
      setNewStatus('');
      setStatusChangeReason('');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handlePrintPackingSlip = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <div className="text-gray-500 dark:text-gray-400">Order not found</div>
        <Button onClick={() => navigate('/seller/orders')} className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/seller/orders')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-red-400" />
              Order {order.orderNumber}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Placed on {new Date(order.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrintInvoice}>
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
          <Button variant="outline" onClick={handlePrintPackingSlip}>
            <FileText className="w-4 h-4 mr-2" />
            Packing Slip
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${getStatusColor(order.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}</div>
            <div className={`px-3 py-1 rounded-full text-sm border ${getPaymentStatusColor(order.paymentStatus)}`}>
              Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowStatusModal(true)}
            className="border-gray-300 dark:border-gray-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Change Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-red-400" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Box className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                    {item.variant && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Variant: {item.variant}</p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">SKU: {item.sku}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Quantity: {item.quantity}</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="text-gray-900 dark:text-white">${order.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-gray-900 dark:text-white">${order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Tracking */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-red-400" />
                Shipping & Tracking
              </h2>
              {!isEditingTracking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingTracking(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {order.trackingNumber ? 'Edit' : 'Add'} Tracking
                </Button>
              )}
            </div>

            {isEditingTracking ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Carrier
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="ups">UPS</option>
                    <option value="fedex">FedEx</option>
                    <option value="dhl">DHL</option>
                    <option value="usps">USPS</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTracking} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Tracking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingTracking(false);
                      setTrackingNumber(order.trackingNumber || '');
                      setCarrier(order.carrier || 'ups');
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {order.trackingNumber ? (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Carrier</p>
                        <p className="font-semibold text-gray-900 dark:text-white uppercase">{order.carrier}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Tracking Number</p>
                        <p className="font-semibold text-gray-900 dark:text-white font-mono">{order.trackingNumber}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://www.${order.carrier}.com/track/${order.trackingNumber}`, '_blank')}
                      >
                        Track Package
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      No tracking number added yet. Click "Add Tracking" to enter tracking information.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Timeline */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-red-400" />
              Order Timeline
            </h2>
            <div className="space-y-4">
              {order.timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    {index < order.timeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 mt-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{event.status}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {event.date} at {event.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Buyer Details */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-red-400" />
              Buyer Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.customer}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {order.customerEmail}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a
                  href={`tel:${order.customerPhone}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {order.customerPhone}
                </a>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-red-400" />
              Shipping Address
            </h2>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">{order.shippingAddress.name}</p>
              <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress.street}</p>
              <p className="text-gray-600 dark:text-gray-400">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
              </p>
              <p className="text-gray-600 dark:text-gray-400">{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-red-400" />
              Payment Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                <p className="font-semibold text-gray-900 dark:text-white">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm border ${getPaymentStatusColor(order.paymentStatus)}`}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {order.status === 'processing' && (
                <Button
                  onClick={() => handleStatusChange('packed')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Mark as Packed
                </Button>
              )}
              {(order.status === 'processing' || order.status === 'packed') && (
                <Button
                  onClick={() => handleStatusChange('shipped')}
                  className="w-full justify-start bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Mark as Shipped
                </Button>
              )}
              {order.status === 'shipped' && (
                <Button
                  onClick={() => handleStatusChange('delivered')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Delivered
                </Button>
              )}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <Button
                  onClick={() => handleStatusChange('cancelled')}
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  variant="outline"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Change Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Order['status'])}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select status...</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                placeholder="Add a note about this status change..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmStatusChange} className="flex-1" disabled={!newStatus}>
                Confirm Change
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                  setStatusChangeReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailsPage;








