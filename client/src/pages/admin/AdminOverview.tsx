import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  Activity,
  AlertOctagon,
  AlertTriangle,
  Award,
  Ban,
  BarChart2,
  BellRing,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Layers,
  LineChart,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Minus,
  PackagePlus,
  ShoppingCart,
  PieChart,
  Plus,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  UserPlus,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import Globe, { type GlobeInstance } from 'react-globe.gl';

type RevenueView = 'daily' | 'weekly' | 'monthly';
type RevenueCategory = 'all' | 'electronics' | 'fashion' | 'marketplace' | 'logistics';

const revenueViewOptions: { label: string; value: RevenueView }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const revenueCategoryOptions: { label: string; value: RevenueCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Logistics', value: 'logistics' },
];

const sparklineColors = {
  emerald: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  red: '#ef4444',
  gray: '#94a3b8',
} as const;

type SparklineColor = keyof typeof sparklineColors;

type RegionPerformance = {
  name: string;
  country: string;
  continent: string;
  category: string;
  sellerType: string;
  shipping: string;
  sales: number;
  orders: number;
  users: number;
  buyers: number;
  sellers: number;
  growth: number;
  conversionRate: number;
  lat: number;
  lon: number;
};

type OperationalKpiCard = {
  label: string;
  value: string;
  status: string;
  statusTone: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  valueClass: string;
};

type GlobeMarker = RegionPerformance & {
  altitude: number;
  radius: number;
  color: string;
  label: string;
};

type LiveOrder = {
  id: number;
  customer: string;
  amount: number;
  time: string;
  location: string;
};

const timeRangeOptions = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'YTD', value: 'ytd' },
  { label: 'Custom', value: 'custom' },
] as const;

const filterOptions = {
  continents: ['all', 'Africa', 'Europe', 'Asia', 'North America', 'South America', 'Oceania'],
  categories: ['all', 'electronics', 'fashion', 'marketplace', 'home', 'luxury', 'lifestyle'],
  sellerTypes: ['all', 'premium', 'verified', 'standard'],
  shipping: ['all', 'air', 'ground', 'sea'],
};

// Mini sparkline component for cards
const MiniSparkline = ({ data, color = 'emerald' }: { data: number[]; color?: SparklineColor }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${30 - ((v - min) / range) * 25}`).join(' ');
  const strokeColor = sparklineColors[color] ?? sparklineColors.emerald;
  
  return (
    <svg className="w-16 h-8" viewBox="0 0 60 30">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

// Status badge component
const StatusBadge = ({ status, count }: { status: string, count: number }) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}: {count}
    </span>
  );
};

export default function AdminOverview() {
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    previousWeekRevenue: 0,
    previousMonthRevenue: 0,
    grossRevenue: 0,
    netRevenue: 0,
    refundsTotal: 0,
    ordersToday: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    lateShipments: 0,
    totalSellers: 0,
    activeSellers: 0,
    pendingSellerApprovals: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomersToday: 0,
    activeDisputes: 0,
    chargebackAlerts: 0,
    fraudAlerts: 0,
    lowStockAlerts: 0,
    criticalStockItems: 0,
    avgProcessingTime: 0,
    fulfillmentRate: 0,
    deliverySuccessRate: 0,
    returnRate: 0,
    cancelRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [liveOrderFeed, setLiveOrderFeed] = useState<LiveOrder[]>([]);
  const [revenueView, setRevenueView] = useState<RevenueView>('daily');
  const [revenueCategory, setRevenueCategory] = useState<RevenueCategory>('all');
  const [timeRange, setTimeRange] = useState<(typeof timeRangeOptions)[number]['value']>('7d');
  const [filters, setFilters] = useState({
    continent: 'all',
    country: 'all',
    category: 'all',
    sellerType: 'all',
    shipping: 'all',
  });
  const [liveDataMode, setLiveDataMode] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );
  const globeRef = useRef<GlobeInstance | null>(null);
  const [liveTracking, setLiveTracking] = useState({
    visitors: 142,
    ordersProcessing: 18,
    shipments: 312,
    payments: [
      { provider: 'Stripe', status: 'healthy', lastWebhook: 'Just now', latency: 180 },
      { provider: 'Flutterwave', status: 'queueing', lastWebhook: '1 min ago', latency: 260 },
    ],
  });

  // Mock data for demo
  const topProducts = [
    { name: 'Premium Wireless Headphones', units: 342, revenue: 34200, trend: 12 },
    { name: 'Smart Watch Pro', units: 289, revenue: 57800, trend: 8 },
    { name: 'Organic Coffee Beans 1kg', units: 456, revenue: 9120, trend: 23 },
    { name: 'Fitness Tracker Band', units: 234, revenue: 11700, trend: -3 },
    { name: 'Bluetooth Speaker Mini', units: 198, revenue: 7920, trend: 15 },
  ];

  const topSellers = [
    { name: 'TechWorld Store', revenue: 125000, orders: 892, rating: 4.9 },
    { name: 'Fashion Hub', revenue: 98500, orders: 1243, rating: 4.8 },
    { name: 'Home Essentials', revenue: 87200, orders: 654, rating: 4.7 },
    { name: 'Sports Gear Pro', revenue: 76400, orders: 432, rating: 4.8 },
    { name: 'Beauty Palace', revenue: 65800, orders: 876, rating: 4.6 },
  ];

  const topCategories = [
    { name: 'Electronics', revenue: 245000, growth: 18 },
    { name: 'Fashion', revenue: 189000, growth: 12 },
    { name: 'Home & Garden', revenue: 145000, growth: 8 },
    { name: 'Sports', revenue: 98000, growth: 22 },
    { name: 'Beauty', revenue: 87000, growth: 15 },
  ];

  const topCustomers = [
    { name: 'John D.', orders: 47, spent: 12500, lastOrder: '2 days ago' },
    { name: 'Sarah M.', orders: 38, spent: 9800, lastOrder: '1 day ago' },
    { name: 'Mike R.', orders: 35, spent: 8900, lastOrder: '3 days ago' },
    { name: 'Emma L.', orders: 32, spent: 7600, lastOrder: 'Today' },
    { name: 'David K.', orders: 29, spent: 6800, lastOrder: '5 days ago' },
  ];

  const systemHealth = {
    serverUptime: 99.98,
    apiResponseTime: 45,
    paymentGateways: [
      { name: 'Stripe', status: 'operational', latency: 120 },
      { name: 'PayPal', status: 'operational', latency: 180 },
      { name: 'M-Pesa', status: 'degraded', latency: 450 },
    ],
    emailHealth: 'operational',
    smsHealth: 'operational',
  };

  const marketingStats = {
    activeAds: 8,
    adSpendToday: 1250,
    adConversions: 89,
    roas: 3.2,
    topAd: { name: 'Summer Sale Banner', clicks: 2340, conversions: 156 },
  };

  const regionData: RegionPerformance[] = [
    { name: 'Kigali', country: 'Rwanda', continent: 'Africa', category: 'marketplace', sellerType: 'verified', shipping: 'air', sales: 125000, orders: 4200, users: 4500, buyers: 3800, sellers: 120, growth: 12, conversionRate: 2.8, lat: -1.95, lon: 30.06 },
    { name: 'Lagos', country: 'Nigeria', continent: 'Africa', category: 'electronics', sellerType: 'premium', shipping: 'sea', sales: 210000, orders: 6100, users: 6200, buyers: 5400, sellers: 185, growth: 9, conversionRate: 3.2, lat: 6.45, lon: 3.39 },
    { name: 'Cairo', country: 'Egypt', continent: 'Africa', category: 'fashion', sellerType: 'verified', shipping: 'air', sales: 185000, orders: 5200, users: 5400, buyers: 4800, sellers: 160, growth: 7, conversionRate: 2.9, lat: 30.04, lon: 31.24 },
    { name: 'Nairobi', country: 'Kenya', continent: 'Africa', category: 'marketplace', sellerType: 'verified', shipping: 'ground', sales: 142000, orders: 3800, users: 3600, buyers: 3100, sellers: 102, growth: 4, conversionRate: 2.4, lat: -1.29, lon: 36.82 },
    { name: 'Johannesburg', country: 'South Africa', continent: 'Africa', category: 'home', sellerType: 'standard', shipping: 'air', sales: 96000, orders: 2500, users: 2800, buyers: 2300, sellers: 75, growth: -2, conversionRate: 1.9, lat: -26.2, lon: 28.04 },
    { name: 'Casablanca', country: 'Morocco', continent: 'Africa', category: 'fashion', sellerType: 'premium', shipping: 'sea', sales: 78000, orders: 2100, users: 1900, buyers: 1700, sellers: 54, growth: 5, conversionRate: 2.1, lat: 33.57, lon: -7.59 },
    { name: 'Paris', country: 'France', continent: 'Europe', category: 'luxury', sellerType: 'premium', shipping: 'air', sales: 258000, orders: 7200, users: 7100, buyers: 6400, sellers: 210, growth: 6, conversionRate: 3.1, lat: 48.85, lon: 2.35 },
    { name: 'São Paulo', country: 'Brazil', continent: 'South America', category: 'marketplace', sellerType: 'verified', shipping: 'ground', sales: 174000, orders: 4700, users: 5000, buyers: 4200, sellers: 140, growth: 3, conversionRate: 2.6, lat: -23.55, lon: -46.63 },
    { name: 'Mumbai', country: 'India', continent: 'Asia', category: 'electronics', sellerType: 'premium', shipping: 'sea', sales: 198000, orders: 5600, users: 6300, buyers: 5600, sellers: 175, growth: 11, conversionRate: 3.4, lat: 19.07, lon: 72.87 },
    { name: 'Sydney', country: 'Australia', continent: 'Oceania', category: 'lifestyle', sellerType: 'verified', shipping: 'air', sales: 92000, orders: 2600, users: 2400, buyers: 2100, sellers: 68, growth: -1, conversionRate: 2.2, lat: -33.86, lon: 151.21 },
  ];
  const countryOptions = ['all', ...new Set(regionData.map(region => region.country))];
  const filteredRegions = regionData.filter(region => {
    if (filters.continent !== 'all' && region.continent !== filters.continent) return false;
    if (filters.country !== 'all' && region.country !== filters.country) return false;
    if (filters.category !== 'all' && region.category !== filters.category) return false;
    if (filters.sellerType !== 'all' && region.sellerType !== filters.sellerType) return false;
    if (filters.shipping !== 'all' && region.shipping !== filters.shipping) return false;
    return true;
  });
  const mapRegions = filteredRegions.length ? filteredRegions : regionData;
  const maxRegionSales = Math.max(...mapRegions.map(region => region.sales));
  const totalRegionalSales = filteredRegions.reduce((sum, region) => sum + region.sales, 0) || regionData.reduce((sum, region) => sum + region.sales, 0);
  const totalOrdersFromRegions = filteredRegions.reduce((sum, region) => sum + region.orders, 0) || regionData.reduce((sum, region) => sum + region.orders, 0);
  const totalSellersFromRegions = filteredRegions.reduce((sum, region) => sum + region.sellers, 0) || regionData.reduce((sum, region) => sum + region.sellers, 0);
  const totalBuyersFromRegions = filteredRegions.reduce((sum, region) => sum + region.buyers, 0) || regionData.reduce((sum, region) => sum + region.buyers, 0);
  const activeRegions = filteredRegions.length || regionData.length;
  const sortedBySales = [...mapRegions].sort((a, b) => b.sales - a.sales);
  const highestRegion = sortedBySales[0];
  const lowestRegion = sortedBySales[sortedBySales.length - 1];
  const yoyGrowth = mapRegions.length ? mapRegions.reduce((sum, region) => sum + region.growth, 0) / mapRegions.length : 0;
  const topRegions = sortedBySales.slice(0, 5);
  const getTrendColor = (growth: number) => {
    if (growth > 1) return '#16a34a';
    if (growth < -1) return '#dc2626';
    return '#facc15';
  };
const getMarkerColor = (growth: number) => {
  if (growth >= 10) return '#22c55e';
  if (growth >= 4) return '#4ade80';
  if (growth <= -8) return '#f97316';
  if (growth < 0) return '#fb923c';
  return '#fde047';
};

const getMarkerLabelTint = (growth: number) => (growth >= 0 ? '#fde68a' : '#fed7aa');

  const heatLegend = [
  { label: 'Accelerating (10%+)', color: '#22c55e' },
  { label: 'Growing (0-10%)', color: '#4ade80' },
  { label: 'Cooling (0 to -8%)', color: '#fb923c' },
  { label: 'Declining (≤ -8%)', color: '#f97316' },
];
const globeTexture = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
  const bumpTexture = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const mapBackdropClass = isDarkMode
  ? 'from-[#020617] via-[#050f2a] to-[#01030c]'
  : 'from-[#041226] via-[#082449] to-[#030712]';
const globeMarkers = useMemo<GlobeMarker[]>(() => {
  if (!mapRegions.length || !maxRegionSales) return [];
  return mapRegions.map(region => {
    const relative = maxRegionSales ? region.sales / maxRegionSales : 0;
    const altitude = 0.12 + relative * 0.28;
    const radius = 0.04 + relative * 0.08;
    return {
      ...region,
      altitude,
      radius,
      color: getMarkerColor(region.growth),
      label: `${region.name} · ${region.country}\n${region.orders.toLocaleString()} orders · $${(region.sales / 1000).toFixed(1)}k GMV`,
    };
  });
}, [mapRegions, maxRegionSales]);
  const handleGlobeZoom = (direction: 'in' | 'out') => {
    const controls = globeRef.current?.controls?.();
    if (!controls) return;
    const factor = 0.86;
    if (direction === 'in') {
      controls.dollyIn?.(factor);
      controls.zoomIn?.();
    } else {
      controls.dollyOut?.(factor);
      controls.zoomOut?.();
    }
    controls.update?.();
  };
  const handleExport = (type: 'csv' | 'pdf' | 'png') => {
    console.log(`Exporting ${type}`, mapRegions);
  };
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const lowStockItems = [
    { name: '4K Drone Bundle', sku: 'DRN-409', stock: 2, priority: 'critical', supplierDelay: true },
    { name: 'Smart Watch Pro', sku: 'SWP-221', stock: 5, priority: 'high', supplierDelay: false },
    { name: 'Organic Coffee Beans 1kg', sku: 'COF-100', stock: 4, priority: 'medium', supplierDelay: true },
  ];

  const sellerApplications = [
    { name: 'GreenHome Furnishings', since: '3 min ago', documents: 'KYC + VAT', risk: 'clean' },
    { name: 'Huye Agro Market', since: '8 min ago', documents: 'KYC pending', risk: 'needs review' },
    { name: 'Moda Collective', since: '12 min ago', documents: 'KYC + Bank', risk: 'clean' },
  ];

  const warehouseStatuses = [
    { name: 'Kigali Central', capacity: 78, status: 'stable' },
    { name: 'Huye Dry Hub', capacity: 56, status: 'load rising' },
    { name: 'Rubavu Cross-border', capacity: 91, status: 'near limit' },
  ];

  const topAds = [
    { name: 'Holiday Mega Splash', spend: 540, roas: 4.2 },
    { name: 'Sports Gear Carousel', spend: 310, roas: 3.4 },
    { name: 'Beauty Flash Sale', spend: 180, roas: 2.8 },
  ];

  const conversionSummary = {
    rate: 2.9,
    checkoutDrop: 14,
    avgOrderValue: 86,
    funnel: [
      { label: 'Visits', value: 52000 },
      { label: 'Product Views', value: 31000 },
      { label: 'Cart Adds', value: 9200 },
      { label: 'Purchases', value: 1500 },
    ],
  };

  const trafficSources = [
    { label: 'Organic', value: 38 },
    { label: 'Paid', value: 27 },
    { label: 'Email', value: 14 },
    { label: 'Social', value: 12 },
    { label: 'Affiliates', value: 9 },
  ];

  const categoryPerformance = [
    { name: 'Electronics', share: 32, trend: 6 },
    { name: 'Fashion', share: 24, trend: 4 },
    { name: 'Home & Garden', share: 18, trend: 2 },
    { name: 'Beauty', share: 14, trend: 5 },
    { name: 'Sports', share: 12, trend: -1 },
  ];

  const salesForecastBreakdown = {
    categories: [
      { name: 'Electronics', forecast: 185000, growth: 0.18 },
      { name: 'Fashion', forecast: 142000, growth: 0.14 },
      { name: 'Home & Living', forecast: 98000, growth: 0.11 },
    ],
    sellerTiers: [
      { name: 'Enterprise Sellers', forecast: 210000, growth: 0.19 },
      { name: 'Pro Sellers', forecast: 155000, growth: 0.15 },
      { name: 'Emerging Sellers', forecast: 68000, growth: 0.22 },
    ],
  };

  const sparklineSeries = {
    today: [95, 112, 108, 132, 145, 152, 160],
    week: [620, 640, 660, 655, 690, 720, 740],
    month: [175, 188, 190, 205, 215, 230, 244],
    orders: [18, 22, 25, 28, 30, 27, 31],
    sellers: [72, 74, 75, 77, 79, 80, 81],
    customers: [410, 420, 430, 440, 435, 448, 455],
    disputes: [6, 5, 7, 8, 7, 6, 5],
  };

  const revenueSeries = {
    daily: {
      data: [
        { date: '2024-11-10', value: 98000 },
        { date: '2024-11-11', value: 105000 },
        { date: '2024-11-12', value: 112000 },
        { date: '2024-11-13', value: 120500 },
        { date: '2024-11-14', value: 126000 },
        { date: '2024-11-15', value: 131500 },
        { date: '2024-11-16', value: 138000 },
        { date: '2024-11-17', value: 142500 },
      ],
      forecast: [
        { date: '2024-11-18', value: 150000 },
        { date: '2024-11-19', value: 156000 },
        { date: '2024-11-20', value: 162500 },
      ],
    },
    weekly: {
      data: [
        { date: '2024-09-01', value: 540000 },
        { date: '2024-09-08', value: 565000 },
        { date: '2024-09-15', value: 590000 },
        { date: '2024-09-22', value: 615000 },
        { date: '2024-09-29', value: 640000 },
        { date: '2024-10-06', value: 668000 },
        { date: '2024-10-13', value: 692000 },
      ],
      forecast: [
        { date: '2024-10-20', value: 715000 },
        { date: '2024-10-27', value: 735000 },
        { date: '2024-11-03', value: 760000 },
      ],
    },
    monthly: {
      data: [
        { date: '2024-04-01', value: 1950000 },
        { date: '2024-05-01', value: 2040000 },
        { date: '2024-06-01', value: 2125000 },
        { date: '2024-07-01', value: 2260000 },
        { date: '2024-08-01', value: 2345000 },
        { date: '2024-09-01', value: 2480000 },
        { date: '2024-10-01', value: 2590000 },
      ],
      forecast: [
        { date: '2024-11-01', value: 2740000 },
        { date: '2024-12-01', value: 2860000 },
        { date: '2025-01-01', value: 2980000 },
      ],
    },
  };

  const revenueCategoryMultipliers = {
    all: 1,
    electronics: 1.15,
    fashion: 0.82,
    marketplace: 0.65,
    logistics: 0.38,
  };


  const paymentAlerts = [
    { provider: 'Stripe', status: 'operational', incidents: 0, latency: 120 },
    { provider: 'PayPal', status: 'operational', incidents: 1, latency: 180 },
    { provider: 'M-Pesa', status: 'degraded', incidents: 2, latency: 450 },
  ];

  const shippingPerformance = {
    onTimeRate: 92,
    lateShipments: metrics.lateShipments,
    avgDeliveryDays: 1.9,
    escalations: 4,
    atRiskRoutes: ['Huye', 'Rubavu'],
  };

  const minutesElapsedToday = Math.max((new Date().getHours() * 60) + new Date().getMinutes(), 1);
  const liveRevenuePulse = {
    perMinute: Math.round((metrics.todayRevenue || 0) / minutesElapsedToday),
    settlement: metrics.netRevenue,
    gross: metrics.grossRevenue,
    lastUpdate: '12s ago',
  };

  useEffect(() => {
    loadDashboardData();
    // Simulate live order feed
    const mockLiveOrders = [
      { id: 1, customer: 'Alice K.', amount: 125.00, time: 'Just now', location: 'Kigali' },
      { id: 2, customer: 'Bob M.', amount: 89.50, time: '2 min ago', location: 'Huye' },
      { id: 3, customer: 'Carol N.', amount: 234.00, time: '5 min ago', location: 'Musanze' },
    ];
    setLiveOrderFeed(mockLiveOrders);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTracking(prev => ({
        ...prev,
        visitors: Math.max(40, prev.visitors + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 6)),
        ordersProcessing: Math.max(6, prev.ordersProcessing + (Math.random() > 0.5 ? 1 : -1) * 2),
        shipments: Math.max(25, prev.shipments + (Math.random() > 0.5 ? 1 : -1) * 6),
      }));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!metrics.processingOrders) return;
    setLiveTracking(prev => ({ ...prev, ordersProcessing: metrics.processingOrders }));
  }, [metrics.processingOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const updateMode = () => setIsDarkMode(root.classList.contains('dark'));
    updateMode();
    const observer = new MutationObserver(updateMode);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame: number;
    const configureControls = () => {
      const controls = globeRef.current?.controls?.();
      if (!controls) {
        frame = requestAnimationFrame(configureControls);
        return;
      }
      controls.enableZoom = true;
      controls.zoomSpeed = 0.8;
      controls.minDistance = 140;
      controls.maxDistance = 520;
      controls.update?.();
    };
    configureControls();
    return () => cancelAnimationFrame(frame);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { count: sellerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'seller');

      const { count: buyerCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'buyer');

      const { data: ordersData } = await supabase.from('orders').select('*');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date(today);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      type OrderRecord = {
        created_at?: string;
        total?: number;
        status?: string;
        payment_status?: string;
      };

      const allOrders: OrderRecord[] = Array.isArray(ordersData) ? (ordersData as OrderRecord[]) : [];
      const completedOrders = allOrders.filter(order => order.payment_status === 'completed');
      const ordersTodayCount = allOrders.filter(
        order => order.created_at && new Date(order.created_at) >= today
      ).length;

      const todayRevenue = completedOrders
        .filter(order => order.created_at && new Date(order.created_at) >= today)
        .reduce((sum, order) => sum + (order.total || 0), 0);

      const weekRevenue = completedOrders
        .filter(order => order.created_at && new Date(order.created_at) >= weekAgo)
        .reduce((sum, order) => sum + (order.total || 0), 0);

      const previousWeekRevenue = completedOrders
        .filter(order => {
          if (!order.created_at) return false;
          const createdAt = new Date(order.created_at);
          return createdAt >= twoWeeksAgo && createdAt < weekAgo;
        })
        .reduce((sum, order) => sum + (order.total || 0), 0);

      const monthRevenue = completedOrders
        .filter(order => order.created_at && new Date(order.created_at) >= monthAgo)
        .reduce((sum, order) => sum + (order.total || 0), 0);

      const previousMonthRevenue = completedOrders
        .filter(order => {
          if (!order.created_at) return false;
          const createdAt = new Date(order.created_at);
          return createdAt >= twoMonthsAgo && createdAt < monthAgo;
        })
        .reduce((sum, order) => sum + (order.total || 0), 0);

      // Order status counts
      const pendingOrders = allOrders.filter(order => order.status === 'pending').length;
      const processingOrders = allOrders.filter(order => order.status === 'processing').length;
      const shippedOrders = allOrders.filter(order => order.status === 'shipped').length;
      const deliveredOrders = allOrders.filter(order => order.status === 'delivered').length;
      const cancelledOrders = allOrders.filter(order => order.status === 'cancelled').length;

      const { count: pendingSellerCount } = await supabase
        .from('seller_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: lowStockProducts } = await supabase
        .from('products')
        .select('id, stock_quantity, low_stock_threshold')
        .eq('status', 'active');
      
      type LowStockProduct = {
        stock_quantity: number | null;
        low_stock_threshold?: number | null;
      };

      const normalizedLowStock: LowStockProduct[] = Array.isArray(lowStockProducts)
        ? (lowStockProducts as LowStockProduct[])
        : [];

      const lowStockCount =
        normalizedLowStock.filter(
          product => (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 5)
      ).length || 0;

      const criticalCount =
        normalizedLowStock.filter(product => (product.stock_quantity ?? 0) <= 2).length || 0;

      const { count: disputesCount } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Calculate operational KPIs (mock for demo)
      const grossRevenue = monthRevenue * 1.15;
      const refundsTotal = monthRevenue * 0.03;
      const netRevenue = monthRevenue - refundsTotal;

      setMetrics({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        previousWeekRevenue,
        previousMonthRevenue,
        grossRevenue,
        netRevenue,
        refundsTotal,
        ordersToday: ordersTodayCount,
        totalOrders: allOrders.length,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        lateShipments: Math.floor(shippedOrders * 0.08),
        totalSellers: sellerCount || 0,
        activeSellers: Math.floor((sellerCount || 0) * 0.85),
        pendingSellerApprovals: pendingSellerCount || 0,
        totalCustomers: buyerCount || 0,
        activeCustomers: Math.floor((buyerCount || 0) * 0.65),
        newCustomersToday: Math.floor(Math.random() * 20) + 5,
        activeDisputes: disputesCount || 0,
        chargebackAlerts: Math.floor(Math.random() * 3),
        fraudAlerts: Math.floor(Math.random() * 5),
        lowStockAlerts: lowStockCount,
        criticalStockItems: criticalCount,
        avgProcessingTime: 2.4,
        fulfillmentRate: 94.5,
        deliverySuccessRate: 97.2,
        returnRate: 3.8,
        cancelRate: 2.1,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekChange = metrics.previousWeekRevenue > 0 
    ? ((metrics.weekRevenue - metrics.previousWeekRevenue) / metrics.previousWeekRevenue * 100).toFixed(1)
    : '0';
  const monthChange = metrics.previousMonthRevenue > 0
    ? ((metrics.monthRevenue - metrics.previousMonthRevenue) / metrics.previousMonthRevenue * 100).toFixed(1)
    : '0';

  const currentRevenueSeries = revenueSeries[revenueView];
  const categoryMultiplier = revenueCategoryMultipliers[revenueCategory];
  const filteredRevenueData = currentRevenueSeries.data.map(point => ({
    ...point,
    value: Math.round(point.value * categoryMultiplier),
  }));
  const filteredForecastData = currentRevenueSeries.forecast.map(point => ({
    ...point,
    value: Math.round(point.value * categoryMultiplier),
  }));
  const revenueAnnotations = filteredRevenueData.length >= 2
    ? [
        {
          date: filteredRevenueData[1].date,
          label: 'Campaign lift',
          value: filteredRevenueData[1].value,
        },
        {
          date: filteredRevenueData[filteredRevenueData.length - 1].date,
          label: 'Platform update',
          value: filteredRevenueData[filteredRevenueData.length - 1].value,
        },
      ]
    : [];

  const quickActions = [
    { icon: PackagePlus, label: 'Add Product', color: 'bg-emerald-500', action: () => {} },
    { icon: UserCheck, label: 'Approve Seller', color: 'bg-blue-500', action: () => {} },
    { icon: MessageCircle, label: 'Resolve Dispute', color: 'bg-red-500', action: () => {} },
    { icon: RefreshCw, label: 'Process Refund', color: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500', action: () => {} },
    { icon: Ban, label: 'Suspend Seller', color: 'bg-gray-500', action: () => {} },
    { icon: BellRing, label: 'Push Notification', color: 'bg-indigo-500', action: () => {} },
    { icon: Sparkles, label: 'Feature Trending Product', color: 'bg-pink-500', action: () => {} },
    { icon: Tag, label: 'Create Discount', color: 'bg-purple-500', action: () => {} },
    { icon: Megaphone, label: 'Launch Campaign', color: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500', action: () => {} },
    { icon: Layers, label: 'Create Collection', color: 'bg-teal-500', action: () => {} },
    { icon: Users, label: 'Assign Staff Role', color: 'bg-slate-500', action: () => {} },
  ];

  const operationalKpis: OperationalKpiCard[] = [
    {
      label: 'Avg Processing Time',
      value: `${metrics.avgProcessingTime.toFixed(1)}h`,
      status: metrics.avgProcessingTime <= 2.5 ? 'On schedule' : 'Delay risk',
      statusTone: metrics.avgProcessingTime <= 2.5 ? 'text-emerald-500' : 'text-amber-500',
      icon: Clock,
      accent: 'from-sky-500/15 via-sky-500/5 to-transparent',
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-200',
      valueClass: 'text-gray-900 dark:text-white',
    },
    {
      label: 'Fulfillment Rate',
      value: `${metrics.fulfillmentRate}%`,
      status: metrics.fulfillmentRate >= 95 ? 'On target' : 'Investigate',
      statusTone: metrics.fulfillmentRate >= 95 ? 'text-emerald-500' : 'text-amber-500',
      icon: ShieldCheck,
      accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
      valueClass: 'text-emerald-500',
    },
    {
      label: 'Delivery Success',
      value: `${metrics.deliverySuccessRate}%`,
      status: metrics.deliverySuccessRate >= 96 ? 'Excellent' : 'Monitor',
      statusTone: metrics.deliverySuccessRate >= 96 ? 'text-emerald-500' : 'text-amber-500',
      icon: Truck,
      accent: 'from-blue-500/15 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-200',
      valueClass: 'text-blue-500',
    },
    {
      label: 'Return Rate',
      value: `${metrics.returnRate}%`,
      status: metrics.returnRate <= 4 ? 'Within norms' : 'Action needed',
      statusTone: metrics.returnRate <= 4 ? 'text-emerald-500' : 'text-red-500',
      icon: RefreshCw,
      accent: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200',
      valueClass: 'text-emerald-500',
    },
    {
      label: 'Cancel Rate',
      value: `${metrics.cancelRate}%`,
      status: metrics.cancelRate <= 3 ? 'Healthy' : 'Escalate',
      statusTone: metrics.cancelRate <= 3 ? 'text-emerald-500' : 'text-red-500',
      icon: AlertTriangle,
      accent: 'from-rose-500/15 via-rose-500/5 to-transparent',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-200',
      valueClass: 'text-rose-500',
    },
  ];

  const totalPlatformGMV = metrics.grossRevenue + metrics.netRevenue;
  const commissionRevenue = Math.round(metrics.grossRevenue * 0.12);
  const escrowOrders = metrics.pendingOrders + Math.floor(metrics.processingOrders * 0.4);
  const disputesNeedingAction = metrics.activeDisputes;

  const highLevelKpis = [
    {
      label: 'Total Orders Today',
      value: metrics.ordersToday.toLocaleString(),
      helper: `${metrics.totalOrders.toLocaleString()} this month`,
      delta: '+12%',
      icon: ShoppingCart,
      accent: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    },
    {
      label: 'Platform GMV',
      value: `$${(totalPlatformGMV / 1000).toFixed(1)}k`,
      helper: 'Gross + Net',
      delta: `${weekChange}% vs last week`,
      icon: BarChart2,
      accent: 'from-sky-500/15 via-sky-500/5 to-transparent',
    },
    {
      label: 'Revenue from Commissions',
      value: `$${commissionRevenue.toLocaleString()}`,
      helper: '12% take rate',
      delta: '+8% QoQ',
      icon: CreditCard,
      accent: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    },
    {
      label: 'Active Sellers',
      value: metrics.activeSellers.toLocaleString(),
      helper: `${metrics.totalSellers.toLocaleString()} total`,
      delta: '+5 onboarded',
      icon: Store,
      accent: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
    },
    {
      label: 'Active Buyers',
      value: metrics.activeCustomers.toLocaleString(),
      helper: `${metrics.totalCustomers.toLocaleString()} total`,
      delta: '+3% WoW',
      icon: Users,
      accent: 'from-purple-500/15 via-purple-500/5 to-transparent',
    },
    {
      label: 'Pending Seller Approvals',
      value: metrics.pendingSellerApprovals.toLocaleString(),
      helper: 'KYC queue',
      delta: '4 need docs',
      icon: UserCheck,
      accent: 'from-rose-500/15 via-rose-500/5 to-transparent',
    },
    {
      label: 'Orders in Escrow',
      value: escrowOrders.toLocaleString(),
      helper: 'Awaiting payout',
      delta: 'Clearing tonight',
      icon: Shield,
      accent: 'from-slate-500/15 via-slate-500/5 to-transparent',
    },
    {
      label: 'Disputes needing action',
      value: disputesNeedingAction.toLocaleString(),
      helper: 'Ops queue',
      delta: 'Escalate urgent',
      icon: AlertTriangle,
      accent: 'from-red-500/15 via-red-500/5 to-transparent',
    },
  ];

  const liveStatCards = [
    { label: 'Live visitors', value: liveTracking.visitors, helper: 'Last 10s', icon: Activity },
    { label: 'Orders processing', value: liveTracking.ordersProcessing, helper: 'Ops queue', icon: Clock },
    { label: 'Shipments in transit', value: liveTracking.shipments, helper: 'Across hubs', icon: Truck },
  ];

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Command Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
            <p className="text-xs font-semibold tracking-[0.3em] text-emerald-500 uppercase">
              Platform Control Tower
            </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time platform overview and operations
          </p>
        </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setLiveDataMode(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                liveDataMode
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {liveDataMode ? 'Live telemetry' : 'Snapshot mode'}
            </button>
          <button 
            onClick={loadDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh data
          </button>
        </div>
        </header>

        {/* High-Level KPIs */}
        <section aria-labelledby="kpi-title" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Snapshot</p>
              <h2 id="kpi-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                High-Level KPIs
              </h2>
      </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {highLevelKpis.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
                >
                  <div className={`absolute inset-0 opacity-60 bg-gradient-to-br ${card.accent}`} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {card.label}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                        {card.value}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{card.helper}</p>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        {card.delta}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-gray-800/70 flex items-center justify-center shadow-sm">
                      <Icon className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                    </div>
                </div>
                </div>
              );
            })}
          </div>
        </section>
        {/* Live Tracking Metrics */}
        <section aria-labelledby="live-metrics-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Real-time</p>
              <h2 id="live-metrics-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Tracking Metrics
              </h2>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {liveStatCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {card.label}
                      </p>
                      <Icon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">{card.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.helper}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Payments pulse (webhooks)
                  </p>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Gateway Health</h3>
                </div>
              </div>
              <div className="space-y-3">
                {liveTracking.payments.map(payment => (
                  <div key={payment.provider} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.provider}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{payment.lastWebhook}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          payment.status === 'healthy'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {payment.status}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{payment.latency}ms</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Core analytics summary"
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-[#070d1b] dark:via-[#0a1424] dark:to-[#0f1d35] text-gray-900 dark:text-white shadow-2xl p-6 space-y-5 transition-colors">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300/80">Velocity</p>
              <h3 className="text-2xl font-semibold leading-tight">Sales over time</h3>
              <p className="text-sm text-gray-500 dark:text-white/60">Historical GMV with forward-looking forecasting layers.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {revenueViewOptions.map(option => (
                <button
                  key={`velocity-range-${option.value}`}
                  onClick={() => setRevenueView(option.value)}
                  className={`px-3 py-1.5 rounded-full border transition-colors ${
                    revenueView === option.value
                      ? 'bg-emerald-500/90 border-emerald-400 text-white shadow'
                      : 'border-gray-300 text-gray-600 hover:text-gray-800 dark:border-white/20 dark:text-white/70 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-white/60">
              {revenueCategoryOptions.map(option => (
                <button
                  key={`velocity-cat-${option.value}`}
                  onClick={() => setRevenueCategory(option.value)}
                  className={`px-3 py-1 rounded-full border ${
                    revenueCategory === option.value
                      ? 'border-blue-500 text-blue-600 bg-blue-50 dark:border-blue-400 dark:text-blue-100 dark:bg-blue-500/20'
                      : 'border-gray-300 text-gray-500 hover:text-gray-800 dark:border-white/10 dark:text-white/60 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20 p-3 transition-colors">
              <TrendLineChart
                data={filteredRevenueData}
                forecastData={filteredForecastData}
                annotations={revenueAnnotations}
                height={280}
                yAxisLabel="Revenue ($)"
                color="from-emerald-400 to-blue-500"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-b dark:from-[#0b152a] dark:via-[#0f1c34] dark:to-[#111f3b] text-gray-900 dark:text-white shadow-2xl p-6 space-y-5 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300/70">Composition</p>
                <h3 className="text-2xl font-semibold leading-tight">Orders by category</h3>
              </div>
              <Target className="w-6 h-6 text-sky-500 dark:text-sky-300" />
            </div>
            <div className="space-y-4">
              {categoryPerformance.map(category => (
                <div
                  key={`cat-stack-${category.name}`}
                  className="p-3 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-white/60">{category.share}% of GMV</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        category.trend >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'
                      }`}
                    >
                      {category.trend >= 0 ? '▲' : '▼'}
                      {Math.abs(category.trend)}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                      style={{ width: `${category.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        <section className="rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gradient-to-br dark:from-[#030711] dark:via-[#071226] dark:to-[#050d1d] text-gray-900 dark:text-white p-3 sm:p-4 md:p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_45px_120px_rgba(5,8,20,0.75)] space-y-3 sm:space-y-4 md:space-y-6 transition-colors">
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-emerald-300">Sales by Region</p>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
              {timeRangeOptions.map(option => (
                <button
                  key={`globe-tab-${option.value}`}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border ${
                    timeRange === option.value
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 dark:border-white/20 dark:text-white/70 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div
            className="mt-2 relative rounded-2xl sm:rounded-[28px] border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-gradient-to-br dark:from-[#02050c] dark:via-[#070e1c] dark:to-[#040813] overflow-hidden transition-colors min-h-[240px] sm:min-h-[280px] md:min-h-[320px] lg:min-h-[380px] xl:min-h-[420px]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {/* Outer glow layers */}
              <div className="absolute inset-0 blur-[180px] opacity-20 dark:opacity-50 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.4),_transparent_70%)]" />
              <div className="absolute -inset-20 blur-[250px] opacity-15 dark:opacity-35 bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.3),_transparent_75%)]" />
              
              {/* Middle glow layers */}
              <div className="absolute inset-0 blur-[120px] opacity-25 dark:opacity-60 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.45),_transparent_65%)]" />
              <div className="absolute -inset-10 blur-[150px] opacity-20 dark:opacity-45 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.3),_transparent_70%)]" />
              
              {/* Inner glow layers */}
              <div className="absolute inset-0 blur-[80px] opacity-30 dark:opacity-70 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.5),_transparent_60%)]" />
              <div className="absolute inset-0 blur-[40px] opacity-35 dark:opacity-75 bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.4),_transparent_55%)]" />
              
              {/* Top accent glow */}
              <div className="absolute -inset-10 blur-[200px] opacity-12 dark:opacity-40 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.25),_transparent_65%)]" />
              
              {/* Bottom accent glow */}
              <div className="absolute -inset-10 blur-[200px] opacity-12 dark:opacity-40 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.25),_transparent_65%)]" />
            </div>
            <div className="relative w-full h-full grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center justify-center overflow-hidden">
              <div className="w-full h-full flex items-center justify-center order-2 lg:order-1">
                <Globe
                  ref={globeRef}
                  className="w-full h-[240px] sm:h-[280px] md:h-[320px] lg:h-[380px] xl:h-[420px] 2xl:h-[480px]"
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl={globeTexture}
                    bumpImageUrl={bumpTexture}
                    showAtmosphere
                    atmosphereColor="#60a5fa"
                    atmosphereAltitude={0.28}
                    autoRotate
                    autoRotateSpeed={0.5}
                    pointAltitude={(d: GlobeMarker) => d.altitude}
                    pointColor={(d: GlobeMarker) => d.color}
                    pointLat={(d: GlobeMarker) => d.lat}
                    pointLng={(d: GlobeMarker) => d.lon}
                    pointRadius={(d: GlobeMarker) => d.radius}
                    pointLabel={(d: GlobeMarker) => d.label}
                    pointsData={globeMarkers}
                    labelsData={globeMarkers}
                    labelLat={(d: GlobeMarker) => d.lat}
                    labelLng={(d: GlobeMarker) => d.lon}
                    labelText={(d: GlobeMarker) => d.name}
                    labelSize={(d: GlobeMarker) => 0.9 + (d.radius - 0.04) * 6}
                    labelDotRadius={(d: GlobeMarker) => d.radius * 0.65}
                    labelColor={(d: GlobeMarker) => getMarkerLabelTint(d.growth)}
                  />
              </div>
              <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 items-end z-10 pointer-events-auto order-1 lg:order-2 p-2 sm:p-3 md:p-4 lg:p-6 lg:absolute lg:bottom-6 lg:right-6">
                <div className="bg-white text-gray-900 dark:bg-slate-900/80 dark:text-white rounded-lg sm:rounded-xl md:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 lg:px-5 lg:py-4 backdrop-blur w-full sm:w-40 md:w-48 lg:w-56 shadow-lg border border-gray-200 dark:border-white/10 transition-colors">
                  <p className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wide text-gray-500 dark:text-white/70">Regional GMV</p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white">${(totalRegionalSales / 1000).toFixed(1)}k</p>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] text-gray-500 dark:text-white/60">
                    Avg order size ${Math.round((totalRegionalSales / activeRegions) / 100).toLocaleString()}k
                  </p>
                </div>
                <div className="bg-white text-gray-900 dark:bg-slate-900/80 dark:text-white border border-gray-200 dark:border-white/10 rounded-lg sm:rounded-xl md:rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 lg:px-5 lg:py-4 backdrop-blur w-full sm:w-40 md:w-48 lg:w-56 shadow-lg transition-colors">
                  <p className="font-semibold mb-1 sm:mb-1.5 md:mb-2 text-[9px] sm:text-[10px] md:text-xs lg:text-sm">Legend</p>
                  <div className="space-y-0.5 sm:space-y-1 md:space-y-1.5 text-gray-600 dark:text-white/80">
                    {heatLegend.map(step => (
                      <div key={`legend-${step.label}`} className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: step.color }} />
                        <span className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs">{step.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] text-gray-500 dark:text-white/60 mt-1 sm:mt-1.5 md:mt-2">Bar height & dot size scale with GMV</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      {false && (
        <Fragment>
          {/* ═══════════════════════════════════════════════════════════════════
              SECTION A: TOP PRIORITY KPIs
          ═══════════════════════════════════════════════════════════════════ */}
          
          {/* Revenue KPIs with Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Revenue */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-start justify-between">
          <div>
                  <p className="text-emerald-100 text-sm font-medium">Today's Revenue</p>
                  <p className="text-3xl font-bold mt-1">${metrics.todayRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">+12% from yesterday</span>
                  </div>
                </div>
                <MiniSparkline data={sparklineSeries.today} />
              </div>
            </div>

            {/* Weekly Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    ${metrics.weekRevenue.toLocaleString()}
                  </p>
                  <div className={`flex items-center gap-1 mt-2 ${parseFloat(weekChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {parseFloat(weekChange) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">{weekChange}% vs last week</span>
          </div>
          </div>
                <MiniSparkline data={sparklineSeries.week} />
        </div>
                  </div>

            {/* Monthly Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    ${metrics.monthRevenue.toLocaleString()}
                  </p>
                  <div className={`flex items-center gap-1 mt-2 ${parseFloat(monthChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {parseFloat(monthChange) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">{monthChange}% vs last month</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <MiniSparkline data={sparklineSeries.month} />
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Gross: ${metrics.grossRevenue.toLocaleString()}</p>
                    <p className="text-xs text-red-400">Refunds: -${metrics.refundsTotal.toLocaleString()}</p>
                    <p className="text-xs text-emerald-500 font-medium">Net: ${metrics.netRevenue.toLocaleString()}</p>
              </div>
        </div>
              </div>
            </div>

            {/* Orders Today */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Orders Today</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {metrics.pendingOrders + metrics.processingOrders}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-amber-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{metrics.lateShipments} late shipments</span>
                  </div>
                </div>
                <MiniSparkline data={sparklineSeries.orders} color="amber" />
              </div>
            </div>
      </div>

      {/* Orders Breakdown + Sellers + Customers + Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Order Status</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Monitor fulfillment velocity</p>
          </div>
            <ShoppingCart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-2">
            <StatusBadge status="pending" count={metrics.pendingOrders} />
            <StatusBadge status="processing" count={metrics.processingOrders} />
            <StatusBadge status="shipped" count={metrics.shippedOrders} />
            <StatusBadge status="delivered" count={metrics.deliveredOrders} />
            <StatusBadge status="cancelled" count={metrics.cancelledOrders} />
          </div>
          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {metrics.lateShipments} late shipments
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-200">Escalate Kigali hub if unresolved in 2h</p>
            </div>
          </div>
        </div>

        {/* Sellers Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Seller Performance</h3>
            <Store className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Sellers</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metrics.totalSellers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
              <span className="font-semibold text-emerald-600">{metrics.activeSellers}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-amber-600 dark:text-amber-400">Pending Approval</span>
              </div>
              <span className="font-bold text-amber-600">{metrics.pendingSellerApprovals}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Latest request: <span className="font-medium text-gray-800 dark:text-gray-200">{sellerApplications[0].name}</span> ({sellerApplications[0].since})
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400">Seller health</span>
                </div>
                <span className="font-semibold text-emerald-600">Good</span>
              </div>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Customers</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-semibold text-gray-900 dark:text-white">{metrics.totalCustomers}</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Active (30d)</span>
                <span className="font-semibold text-emerald-600">{metrics.activeCustomers}</span>
              </div>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${Math.round((metrics.activeCustomers / (metrics.totalCustomers || 1)) * 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round((metrics.activeCustomers / (metrics.totalCustomers || 1)) * 100)}% active • {metrics.totalCustomers - metrics.activeCustomers} inactive
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-emerald-600 dark:text-emerald-400">New Today</span>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                +{metrics.newCustomersToday}
              </span>
            </div>
        </div>
      </div>

        {/* Disputes & Risk Alerts */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Risk & Disputes</h3>
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-red-100 text-sm">Active Disputes</span>
              <span className="font-bold text-2xl">{metrics.activeDisputes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-100 text-sm">Chargeback Alerts</span>
              <span className="font-semibold">{metrics.chargebackAlerts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-100 text-sm">Fraud Alerts</span>
              <span className="font-semibold">{metrics.fraudAlerts}</span>
            </div>
            <div className="pt-2 border-t border-white/20">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span className="text-red-100">Avg Resolution: 2.4 days</span>
              </div>
            </div>
          </div>
        </div>
        </div>

          {/* Low Stock Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Low Stock Alerts</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Trigger replenishment before listings go dark</p>
          </div>
              <ListChecks className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Critical (≤2 units)</span>
              </div>
              <span className="font-bold text-red-600">{metrics.criticalStockItems}</span>
            </div>
            <div className="grid gap-3">
              {lowStockItems.map((item) => (
                <div key={item.sku} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">SKU {item.sku}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.priority === 'critical' ? 'bg-red-100 text-red-700' : item.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {item.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Stock: {item.stock} units</span>
                    {item.supplierDelay && <span className="text-red-500">Supplier delay risk</span>}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all stock alerts →
            </button>
        </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION B: OPERATIONAL PANELS
      ═══════════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* System Health Monitor */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">System Health</h3>
            <Server className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Server Uptime</span>
              </div>
              <span className="text-sm font-medium text-emerald-600">{systemHealth.serverUptime}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">API Response</span>
              </div>
              <span className="text-sm font-medium text-emerald-600">{systemHealth.apiResponseTime}ms</span>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Gateways</p>
              {systemHealth.paymentGateways.map((gw, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{gw.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${gw.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    <span className={`text-xs font-medium ${gw.status === 'operational' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {gw.latency}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Email/SMS</span>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                Operational
              </span>
            </div>
        </div>
      </div>

        {/* Security & Risk Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Security & Risk</h3>
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-400">Suspicious Logins</span>
              </div>
              <span className="font-semibold text-amber-600">3</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-400">High Cancel Rate</span>
              </div>
              <span className="font-semibold text-blue-600">2 sellers</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Blocked IPs</span>
              </div>
              <span className="font-semibold text-gray-600 dark:text-gray-400">12</span>
            </div>
          </div>
        </div>

        {/* Marketing Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Marketing</h3>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-xs text-purple-600 dark:text-purple-400">Active Campaigns</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{marketingStats.activeAds}</p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">ROAS</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{marketingStats.roas}x</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Ad Spend Today</span>
              <span className="font-semibold text-gray-900 dark:text-white">${marketingStats.adSpendToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Conversions</span>
              <span className="font-semibold text-emerald-600">{marketingStats.adConversions}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Top Performing:</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{marketingStats.topAd.name}</p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {topAds.map(ad => (
                <div key={ad.name} className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{ad.name}</span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    ${ad.spend} • {ad.roas}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shipping Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Shipping Performance</h3>
            <Truck className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                <p className="text-xs text-green-600 dark:text-green-400">On-time</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{shippingPerformance.onTimeRate}%</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-600 dark:text-red-400">Late</p>
                <p className="text-xl font-bold text-red-600">{shippingPerformance.lateShipments}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Avg delivery</span>
              <span className="font-semibold text-gray-900 dark:text-white">{shippingPerformance.avgDeliveryDays} days</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Escalations</span>
              <span className="font-semibold text-red-500">{shippingPerformance.escalations}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Routes at risk:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {shippingPerformance.atRiskRoutes.map(route => (
                  <span key={route} className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {route}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION C: ANALYTICS & TOP LISTS
      ═══════════════════════════════════════════════════════════════════ */}

      {/* Revenue Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compare historical performance and next 30-day forecast
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {revenueViewOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setRevenueView(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    revenueView === option.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {revenueCategoryOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setRevenueCategory(option.value)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    revenueCategory === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <TrendLineChart
          data={filteredRevenueData}
          forecastData={filteredForecastData}
          annotations={revenueAnnotations}
          height={240}
          yAxisLabel="Revenue ($)"
        />
      </div>

      {/* Conversion & Traffic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Conversion Funnel</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Storewide conversion diagnostics</p>
            </div>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{conversionSummary.rate}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Checkout Drop</p>
              <p className="text-2xl font-semibold text-red-500">-{conversionSummary.checkoutDrop}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-semibold text-emerald-500">${conversionSummary.avgOrderValue}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {conversionSummary.funnel.map((step, index) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{step.label}</span>
                  <span>{step.value.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${index === conversionSummary.funnel.length - 1 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${(step.value / conversionSummary.funnel[0].value) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
      </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Traffic Sources</h3>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
              <div className="space-y-4">
            {trafficSources.map(source => (
              <div key={source.label}>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <span>{source.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{source.value}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${source.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
                    <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Category Performance</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share of revenue and momentum</p>
                    </div>
          <Filter className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {categoryPerformance.map((category) => (
            <div key={category.name} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{category.share}% of GMV</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
                    style={{ width: `${category.share}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-semibold ${category.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {category.trend >= 0 ? '↑' : '↓'}
                  {Math.abs(category.trend)}%
                </span>
                    </div>
                  </div>
                ))}
        </div>
      </div>

      {/* Top 5 Lists moved to command column */}

      {/* Geo Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-start gap-4 justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3rem] text-emerald-500">
              <MapPin className="w-4 h-4" />
              Geo Performance
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Sales by Region</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeRegions} active regions • {liveDataMode ? 'Live data' : 'Snapshot'} • Timeframe: {timeRange.toUpperCase()}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 justify-end">
              {timeRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    timeRange === option.value
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                Export PDF
              </button>
              <button
                onClick={() => handleExport('png')}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                Export PNG
              </button>
              <button
                onClick={() => setLiveDataMode(prev => !prev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                  liveDataMode ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-gray-600'
                }`}
              >
                {liveDataMode ? 'Live data: ON' : 'Live data: OFF'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {[
            {
              label: 'Total GMV',
              value: `$${(totalRegionalSales / 1000).toFixed(1)}k`,
              helper: 'Across selected filters',
              delta: `${yoyGrowth.toFixed(1)}% avg Δ`,
            },
            {
              label: 'Total Orders',
              value: totalOrdersFromRegions.toLocaleString(),
              helper: 'Orders in view',
              delta: `${totalSellersFromRegions.toLocaleString()} sellers`,
            },
            {
              label: 'Active Regions',
              value: activeRegions.toString(),
              helper: `${countryOptions.length - 1} available`,
              delta: `${totalBuyersFromRegions.toLocaleString()} buyers`,
            },
            {
              label: 'Highest Performing',
              value: highestRegion ? highestRegion.name : '—',
              helper: highestRegion ? `$${(highestRegion.sales / 1000).toFixed(1)}k` : 'No data',
              delta: highestRegion ? `${highestRegion.growth}% growth` : '—',
            },
            {
              label: 'Lowest Performing',
              value: lowestRegion ? lowestRegion.name : '—',
              helper: lowestRegion ? `$${(lowestRegion.sales / 1000).toFixed(1)}k` : 'No data',
              delta: lowestRegion ? `${lowestRegion.growth}% change` : '—',
            },
            {
              label: 'Conversion Rate',
              value: `${(
                mapRegions.reduce((sum, region) => sum + region.conversionRate, 0) / mapRegions.length || 0
              ).toFixed(2)}%`,
              helper: 'Regional average',
              delta: liveDataMode ? 'Realtime mode' : 'Snapshot',
            },
          ].map(card => (
            <div key={card.label} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.helper}</p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{card.delta}</p>
          </div>
          ))}
                      </div>

        <div className="space-y-5">
          <div className="bg-slate-900/90 text-white rounded-2xl p-5 border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                <h4 className="text-lg font-semibold">Filters</h4>
                <p className="text-xs text-white/70">Slice performance by dimension</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  className="px-3 py-1.5 rounded-full border border-white/30 hover:border-emerald-400 transition-colors"
                  onClick={() => setFilters({ continent: 'all', country: 'all', category: 'all', sellerType: 'all', shipping: 'all' })}
                >
                  Reset filters
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-4 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-white/70">Region</span>
                <select
                  value={filters.continent}
                  onChange={(e) => handleFilterChange('continent', e.target.value)}
                  className="text-gray-900 rounded-lg px-3 py-2"
                >
                  {filterOptions.continents.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All regions' : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-white/70">Country</span>
                <select
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="text-gray-900 rounded-lg px-3 py-2"
                >
                  {countryOptions.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All countries' : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-white/70">Category</span>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="text-gray-900 rounded-lg px-3 py-2"
                >
                  {filterOptions.categories.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All categories' : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-white/70">Seller type</span>
                <select
                  value={filters.sellerType}
                  onChange={(e) => handleFilterChange('sellerType', e.target.value)}
                  className="text-gray-900 rounded-lg px-3 py-2"
                >
                  {filterOptions.sellerTypes.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All sellers' : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-white/70">Shipping</span>
                <select
                  value={filters.shipping}
                  onChange={(e) => handleFilterChange('shipping', e.target.value)}
                  className="text-gray-900 rounded-lg px-3 py-2"
                >
                  {filterOptions.shipping.map(option => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All methods' : option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="border-t border-white/10 pt-4 mt-4">
              <h4 className="text-lg font-semibold mb-3">Top Regions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {topRegions.map((region, index) => (
                  <div key={region.name} className="rounded-xl border border-white/10 p-3">
                    <p className="text-sm font-semibold flex items-center gap-1">
                      <span className="text-white/50">{index + 1}.</span> {region.name}
                    </p>
                    <p className="text-[11px] text-white/60">{region.country}</p>
                    <p className="text-base font-bold mt-1">${(region.sales / 1000).toFixed(1)}k</p>
                    <p className="text-[11px]" style={{ color: getTrendColor(region.growth) }}>
                      {region.growth > 0 ? '+' : ''}
                      {region.growth}% {region.growth > 1 ? '▲' : region.growth < -1 ? '▼' : '⏸'}
                        </p>
                      </div>
                ))}
                    </div>
            </div>
          </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.9fr)] items-start">
          <div
            className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${mapBackdropClass} shadow-[0_45px_120px_rgba(2,6,23,0.85)] border border-white/10`}
          >
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute inset-0 blur-3xl opacity-70 bg-[radial-gradient(circle_at_center,_rgba(125,211,252,0.35),_transparent_60%)]" />
              <div className="absolute -inset-8 blur-[140px] opacity-40 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_65%)]" />
            </div>
            <div className="absolute top-5 left-5 z-10 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 text-white shadow-lg backdrop-blur">
              <button
                className="p-3 border-b border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center"
                onClick={() => handleGlobeZoom('in')}
                aria-label="Zoom in"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                className="p-3 hover:bg-white/10 transition-colors flex items-center justify-center"
                onClick={() => handleGlobeZoom('out')}
                aria-label="Zoom out"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
            <Globe
              ref={globeRef}
              className="w-full h-[260px] sm:h-[320px] lg:h-[380px]"
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl={globeTexture}
              bumpImageUrl={bumpTexture}
              showAtmosphere
              atmosphereColor="#60a5fa"
              atmosphereAltitude={0.28}
              autoRotate
              autoRotateSpeed={0.5}
              pointAltitude={(d: GlobeMarker) => d.altitude}
              pointColor={(d: GlobeMarker) => d.color}
              pointLat={(d: GlobeMarker) => d.lat}
              pointLng={(d: GlobeMarker) => d.lon}
              pointRadius={(d: GlobeMarker) => d.radius}
              pointLabel={(d: GlobeMarker) => d.label}
              pointsData={globeMarkers}
              labelsData={globeMarkers}
              labelLat={(d: GlobeMarker) => d.lat}
              labelLng={(d: GlobeMarker) => d.lon}
              labelText={(d: GlobeMarker) => d.name}
              labelSize={(d: GlobeMarker) => 0.9 + (d.radius - 0.04) * 6}
              labelDotRadius={(d: GlobeMarker) => d.radius * 0.65}
              labelColor={(d: GlobeMarker) => getMarkerLabelTint(d.growth)}
            />
          </div>
          <div className="space-y-4">
            <div className="bg-slate-900/80 text-white rounded-2xl px-4 py-4 backdrop-blur shadow-lg border border-white/10">
            <p className="text-xs uppercase tracking-wide text-white/70">Regional GMV</p>
              <p className="text-2xl font-semibold mt-1">${(totalRegionalSales / 1000).toFixed(1)}k</p>
              <p className="text-sm text-white/70 mt-2">
                Avg order size ${Math.round((totalRegionalSales / activeRegions) / 100).toLocaleString()}k
              </p>
              <p className="text-xs text-white/50 mt-3">
                {totalOrdersFromRegions.toLocaleString()} orders · {totalSellersFromRegions.toLocaleString()} sellers
              </p>
          </div>
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-4 text-xs text-white backdrop-blur shadow-lg">
              <p className="font-semibold mb-3 text-sm">Legend</p>
            <div className="space-y-1">
              {heatLegend.map(step => (
                <div key={step.label} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: step.color }} />
                  <span>{step.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/60 mt-3">Bar height & dot size scale with GMV</p>
            </div>
          </div>
        </div>
      </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

      {/* Sales Forecast */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">30-Day Sales Forecast</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered prediction based on historical trends</p>
          </div>
          <BarChart2 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Forecasted Revenue</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">$485,000</p>
            <p className="text-xs text-emerald-500 mt-1">↑ 18% from current month</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
            <p className="text-sm text-blue-600 dark:text-blue-400">Expected Orders</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">3,250</p>
            <p className="text-xs text-blue-500 mt-1">↑ 12% from current month</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
            <p className="text-sm text-purple-600 dark:text-purple-400">Peak Sales Day</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">Dec 15</p>
            <p className="text-xs text-purple-500 mt-1">Holiday shopping surge</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Forecast by Category</p>
            {salesForecastBreakdown.categories.map(category => (
              <div key={category.name} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 py-1">
                <span>{category.name}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${(category.forecast / 1000).toFixed(0)}k
                  <span className="ml-1 text-emerald-500">↑{Math.round(category.growth * 100)}%</span>
                </span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Forecast by Seller Tier</p>
            {salesForecastBreakdown.sellerTiers.map(tier => (
              <div key={tier.name} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 py-1">
                <span>{tier.name}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${(tier.forecast / 1000).toFixed(0)}k
                  <span className="ml-1 text-emerald-500">↑{Math.round(tier.growth * 100)}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Revenue Pulse */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Live Revenue</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white mt-1">${metrics.todayRevenue.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {liveRevenuePulse.lastUpdate}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Per Minute</p>
            <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">${liveRevenuePulse.perMinute}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">Settlement</p>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">${liveRevenuePulse.settlement.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Gross</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">${liveRevenuePulse.gross.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          <Zap className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.action}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-300 transition-colors group"
              >
                <div className={`p-2 ${action.color} rounded-xl text-white group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-center text-gray-600 dark:text-gray-400">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Issues */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Payment Issues</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {paymentAlerts.filter(alert => alert.status !== 'operational' || alert.incidents > 0).length} alerts
          </span>
        </div>
        <div className="space-y-3">
          {paymentAlerts.map(alert => (
            <div key={`cmd-${alert.provider}`} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-white">{alert.provider}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    alert.status === 'operational'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}
                >
                  {alert.status === 'operational' ? 'OK' : 'Slow'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>Latency {alert.latency}ms</span>
                {alert.incidents > 0 && (
                  <span className="text-red-500 font-semibold">{alert.incidents} incident(s)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Orders */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <h3 className="font-semibold text-gray-900 dark:text-white">Live Orders</h3>
          </div>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {liveOrderFeed.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{order.location} • {order.time}</p>
          </div>
              <span className="font-semibold text-emerald-600">${order.amount}</span>
          </div>
          ))}
        </div>
      </div>

      {/* Seller Applications */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Seller Applications</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Live queue</span>
        </div>
        <div className="space-y-3">
          {sellerApplications.map((application) => (
            <div key={application.name} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{application.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{application.documents}</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{application.since}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full ${
                  application.risk === 'clean'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                  {application.risk}
                </span>
                <button className="text-blue-600 dark:text-blue-400 hover:underline">Review</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warehouse Status */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Warehouse Capacity</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Live stock levels</span>
        </div>
        <div className="space-y-3">
          {warehouseStatuses.map(warehouse => (
            <div key={warehouse.name}>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>{warehouse.name}</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">{warehouse.status}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-1">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500"
                  style={{ width: `${warehouse.capacity}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Health */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Payment Gateways</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Health monitor</span>
        </div>
        <div className="space-y-3">
          {paymentAlerts.map(alert => (
            <div key={alert.provider} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>{alert.provider}</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${alert.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>{alert.status === 'operational' ? 'OK' : 'Slow'}</span>
                <span className="text-xs text-gray-400">{alert.latency}ms</span>
                {alert.incidents > 0 && (
                  <span className="text-xs text-red-500">{alert.incidents} incidents</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top performers (right column) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Products</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</span>
        </div>
        <div className="space-y-3">
          {topProducts.slice(0, 5).map((product, i) => (
            <div key={product.name} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{product.units} sold</span>
                  <span>•</span>
                  <span>${(product.revenue / 1000).toFixed(1)}k</span>
                  <span className={product.trend >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                    {product.trend >= 0 ? '↑' : '↓'}
                    {Math.abs(product.trend)}%
                </span>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Sellers</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">GMV leaders</span>
        </div>
        <div className="space-y-3">
          {topSellers.slice(0, 5).map((seller, i) => (
            <div key={seller.name} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{seller.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>${(seller.revenue / 1000).toFixed(0)}k</span>
                  <span>•</span>
                  <span>{seller.orders} orders</span>
                  <span className="text-amber-500">★{seller.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark-border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Categories</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Share of GMV</span>
        </div>
        <div className="space-y-3">
          {topCategories.slice(0, 5).map((cat, i) => (
            <div key={cat.name} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>${(cat.revenue / 1000).toFixed(0)}k</span>
                  <span className="text-emerald-500">↑{cat.growth}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark-border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Customers</h3>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">High-value buyers</span>
        </div>
        <div className="space-y-3">
          {topCustomers.slice(0, 5).map((customer, i) => (
            <div key={customer.name} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>${(customer.spent / 1000).toFixed(1)}k spent</span>
                  <span>•</span>
                  <span>{customer.orders} orders</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-xl border border-gray-200 dark-border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Operational KPIs</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Live health indicators from fulfillment ops</p>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Updated now</span>
          </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operationalKpis.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl border border-gray-200/70 dark:border-gray-800/60 bg-white/80 dark:bg-gray-800/80 shadow-md"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
              <div className="relative p-4 flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
          </div>
                  <span className={`text-xs font-medium ${card.statusTone}`}>{card.status}</span>
          </div>
                <div>
                  <p className={`text-3xl font-semibold ${card.valueClass}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
          </div>
        </div>
      </div>
          );
        })}
    </div>

      </div>
      </div>
        </Fragment>
      )}
  </div>
  </div>
);
}
