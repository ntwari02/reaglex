import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Printer,
  FileText,
  Mail,
  Phone,
  MoreVertical,
  CheckCircle,
  XCircle,
  Truck,
  DollarSign,
  Calendar,
  MapPin,
  CreditCard,
  TrendingUp,
  Package,
  ArrowLeft,
} from 'lucide-react';
import OrderDetails from './orders/OrderDetails';
import OrderAnalytics from './orders/OrderAnalytics';
import OrderLogs from './orders/OrderLogs';

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

type PaymentStatus = 'paid' | 'unpaid' | 'partially_paid' | 'refunded';
type PaymentMethod = 'card' | 'mobile_money' | 'cash_on_delivery' | 'paypal' | 'bank_transfer';
type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'customer_asc'
  | 'customer_desc'
  | 'status_asc'
  | 'status_desc'
  | 'payment_asc'
  | 'payment_desc';

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  itemsCount: number;
  sellerName: string;
  shippingMethod: string;
  deliveryDateEstimate: string;
  trackingNumber?: string;
  city: string;
  isHighValue: boolean;
  isCod: boolean;
  isFulfilled: boolean;
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1 555 123 4567',
    orderDate: '2024-03-15',
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    totalAmount: 299.99,
    itemsCount: 2,
    sellerName: 'TechHub Electronics',
    shippingMethod: 'Standard Shipping',
    deliveryDateEstimate: '2024-03-18',
    trackingNumber: 'TRACK-123456',
    city: 'New York',
    isHighValue: false,
    isCod: false,
    isFulfilled: true,
  },
  {
    id: 'ORD-002',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '+1 555 987 6543',
    orderDate: '2024-03-16',
    status: 'shipped',
    paymentStatus: 'paid',
    paymentMethod: 'paypal',
    totalAmount: 149.99,
    itemsCount: 1,
    sellerName: 'Fashion Forward',
    shippingMethod: 'Express Shipping',
    deliveryDateEstimate: '2024-03-19',
    trackingNumber: 'TRACK-789012',
    city: 'Los Angeles',
    isHighValue: false,
    isCod: false,
    isFulfilled: false,
  },
  {
    id: 'ORD-003',
    orderId: 'ORD-003',
    customerName: 'Bob Johnson',
    customerEmail: 'bob@example.com',
    customerPhone: '+1 555 456 7890',
    orderDate: '2024-03-17',
    status: 'pending',
    paymentStatus: 'unpaid',
    paymentMethod: 'cash_on_delivery',
    totalAmount: 89.99,
    itemsCount: 3,
    sellerName: 'HomeStyle',
    shippingMethod: 'Standard Shipping',
    deliveryDateEstimate: '2024-03-20',
    city: 'Chicago',
    isHighValue: false,
    isCod: true,
    isFulfilled: false,
  },
  {
    id: 'ORD-004',
    orderId: 'ORD-004',
    customerName: 'Alice Brown',
    customerEmail: 'alice@example.com',
    customerPhone: '+1 555 321 0987',
    orderDate: '2024-03-14',
    status: 'returned',
    paymentStatus: 'refunded',
    paymentMethod: 'card',
    totalAmount: 199.99,
    itemsCount: 1,
    sellerName: 'TechHub Electronics',
    shippingMethod: 'Standard Shipping',
    deliveryDateEstimate: '2024-03-17',
    city: 'Houston',
    isHighValue: false,
    isCod: false,
    isFulfilled: true,
  },
];

export default function OrderManagementAdmin() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'details' | 'analytics' | 'logs'>('list');

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 10000]);
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [codFilter, setCodFilter] = useState<'all' | 'cod' | 'online'>('all');
  const [fulfilledFilter, setFulfilledFilter] = useState<'all' | 'fulfilled' | 'not_fulfilled'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  const sellers = Array.from(new Set(orders.map((o) => o.sellerName)));
  const cities = Array.from(new Set(orders.map((o) => o.city)));

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'all' || order.paymentMethod === paymentMethodFilter;
      const matchesSeller = sellerFilter === 'all' || order.sellerName === sellerFilter;
      const matchesCity = cityFilter === 'all' || order.city === cityFilter;
      const matchesAmount = order.totalAmount >= amountRange[0] && order.totalAmount <= amountRange[1];
      const matchesCod =
        codFilter === 'all' || (codFilter === 'cod' && order.isCod) || (codFilter === 'online' && !order.isCod);
      const matchesFulfilled =
        fulfilledFilter === 'all' ||
        (fulfilledFilter === 'fulfilled' && order.isFulfilled) ||
        (fulfilledFilter === 'not_fulfilled' && !order.isFulfilled);

      const matchesDate =
        !dateRange[0] ||
        !dateRange[1] ||
        (order.orderDate >= dateRange[0] && order.orderDate <= dateRange[1]);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentStatus &&
        matchesPaymentMethod &&
        matchesSeller &&
        matchesCity &&
        matchesAmount &&
        matchesCod &&
        matchesFulfilled &&
        matchesDate
      );
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        case 'date_asc':
          return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        case 'amount_desc':
          return b.totalAmount - a.totalAmount;
        case 'amount_asc':
          return a.totalAmount - b.totalAmount;
        case 'customer_asc':
          return a.customerName.localeCompare(b.customerName);
        case 'customer_desc':
          return b.customerName.localeCompare(a.customerName);
        case 'status_asc':
          return a.status.localeCompare(b.status);
        case 'status_desc':
          return b.status.localeCompare(a.status);
        case 'payment_asc':
          return a.paymentStatus.localeCompare(b.paymentStatus);
        case 'payment_desc':
          return b.paymentStatus.localeCompare(a.paymentStatus);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    orders,
    searchQuery,
    statusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    dateRange,
    amountRange,
    sellerFilter,
    cityFilter,
    codFilter,
    fulfilledFilter,
    sortBy,
  ]);

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredAndSortedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredAndSortedOrders.map((o) => o.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for orders:`, Array.from(selectedOrders));
    setSelectedOrders(new Set());
  };

  const getStatusBadge = (status: OrderStatus) => {
    const styles: Record<OrderStatus, string> = {
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
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const styles: Record<PaymentStatus, string> = {
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (activeView === 'details' && selectedOrder) {
    return (
      <OrderDetails
        order={selectedOrder}
        onBack={() => {
          setActiveView('list');
          setSelectedOrder(null);
        }}
      />
    );
  }

  if (activeView === 'analytics') {
    return (
      <OrderAnalytics
        orders={orders}
        onBack={() => setActiveView('list')}
      />
    );
  }

  if (activeView === 'logs' && selectedOrder) {
    return (
      <OrderLogs
        orderId={selectedOrder.id}
        onBack={() => {
          setActiveView('list');
          setSelectedOrder(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Orders • Management</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Management</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage all platform orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveView('analytics')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
          >
            <TrendingUp className="h-4 w-4" /> Analytics
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Export
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Upload className="h-4 w-4" /> Import
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Orders Today</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {orders.filter((o) => o.orderDate === new Date().toISOString().split('T')[0]).length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {orders.filter((o) => o.status === 'pending').length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Revenue Today</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${orders
              .filter((o) => o.orderDate === new Date().toISOString().split('T')[0])
              .reduce((sum, o) => sum + o.totalAmount, 0)
              .toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 text-white">
            <XCircle className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cancelled Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {orders.filter((o) => o.status === 'cancelled').length}
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Search by Order ID, Customer, Phone, Seller, or Tracking"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Amount High → Low</option>
            <option value="amount_asc">Amount Low → High</option>
            <option value="customer_asc">Customer A-Z</option>
            <option value="customer_desc">Customer Z-A</option>
            <option value="status_asc">Status A-Z</option>
            <option value="status_desc">Status Z-A</option>
            <option value="payment_asc">Payment Status A-Z</option>
            <option value="payment_desc">Payment Status Z-A</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={() => {
                setStatusFilter('all');
                setPaymentStatusFilter('all');
                setPaymentMethodFilter('all');
                setDateRange(['', '']);
                setAmountRange([0, 10000]);
                setSellerFilter('all');
                setCityFilter('all');
                setCodFilter('all');
                setFulfilledFilter('all');
              }}
              className="text-xs text-emerald-500 hover:text-emerald-600"
            >
              Clear all
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Order Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Payment Status</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatus | 'all')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethod | 'all')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cash_on_delivery">Cash on Delivery</option>
                <option value="paypal">PayPal</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Seller</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Sellers</option>
                {sellers.map((seller) => (
                  <option key={seller} value={seller}>
                    {seller}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">City</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Payment Type</label>
              <select
                value={codFilter}
                onChange={(e) => setCodFilter(e.target.value as 'all' | 'cod' | 'online')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All</option>
                <option value="cod">Cash on Delivery</option>
                <option value="online">Online Paid</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Fulfillment</label>
              <select
                value={fulfilledFilter}
                onChange={(e) => setFulfilledFilter(e.target.value as 'all' | 'fulfilled' | 'not_fulfilled')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="not_fulfilled">Not Fulfilled</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Amount Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountRange[0]}
                  onChange={(e) => setAmountRange([Number(e.target.value), amountRange[1]])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={amountRange[1]}
                  onChange={(e) => setAmountRange([amountRange[0], Number(e.target.value)])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Max"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange[0]}
                  onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={dateRange[1]}
                  onChange={(e) => setDateRange([dateRange[0], e.target.value])}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {selectedOrders.size} order(s) selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('change_status')}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Change Status
              </button>
              <button
                onClick={() => handleBulkAction('mark_paid')}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              >
                Mark Paid
              </button>
              <button
                onClick={() => handleBulkAction('assign_delivery')}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
              >
                Assign Delivery Agent
              </button>
              <button
                onClick={() => handleBulkAction('cancel')}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                Cancel Orders
              </button>
              <button
                onClick={() => handleBulkAction('export')}
                className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
              >
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredAndSortedOrders.length && filteredAndSortedOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Shipping</th>
                <th className="px-4 py-3">Delivery Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredAndSortedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{order.orderId}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.customerEmail}</p>
                      <p className="text-xs text-gray-500">{order.customerPhone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-4">{getPaymentStatusBadge(order.paymentStatus)}</td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {order.paymentMethod.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    ${order.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{order.itemsCount}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{order.sellerName}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{order.shippingMethod}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(order.deliveryDateEstimate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActiveView('details');
                        }}
                        className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActiveView('logs');
                        }}
                        className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400"
                        title="View Logs"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-full border border-gray-200 p-1.5 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400"
                        title="More Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedOrders.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">No orders found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
