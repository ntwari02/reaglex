import React, { useEffect, useState } from 'react';
import { ArrowLeft, Store, Mail, Phone, MapPin, Calendar, FileText, Star, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import SellerProducts from './SellerProducts';
import SellerPerformance from './SellerPerformance';
import SellerOrders from './SellerOrders';
import SellerFinance from './SellerFinance';
import SellerSupport from './SellerSupport';
import SellerStrikes from './SellerStrikes';
import SellerKYC from './SellerKYC';
import AdminNotes from './AdminNotes';
import SellerSettings from './SellerSettings';

interface SellerProfileProps {
  sellerId: string;
  onBack: () => void;
}

type TabId =
  | 'overview'
  | 'products'
  | 'performance'
  | 'orders'
  | 'finance'
  | 'support'
  | 'strikes'
  | 'kyc'
  | 'notes'
  | 'settings';

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'performance', label: 'Performance' },
  { id: 'orders', label: 'Orders' },
  { id: 'finance', label: 'Finance' },
  { id: 'support', label: 'Support & Disputes' },
  { id: 'strikes', label: 'Strikes & Policy' },
  { id: 'kyc', label: 'KYC / Verification' },
  { id: 'notes', label: 'Admin Notes' },
  { id: 'settings', label: 'Store Settings' },
];

type SellerView = {
  id: string;
  sellerName: string;
  storeName: string;
  email: string;
  phone: string;
  status: string;
  kycStatus: string;
  country: string;
  city: string;
  address: string;
  joinDate: string;
  totalProducts: number;
  totalOrders: number;
  earnings: number;
  rating: number | null;
  reviews: number;
  disputes: number;
  tickets: number;
  warningCount: number;
};

function mapSellerDetails(raw: Awaited<ReturnType<typeof adminAPI.getSellerDetails>>['seller']): SellerView {
  const kycMap: Record<string, string> = {
    approved: 'verified',
    pending: 'pending',
    rejected: 'rejected',
  };
  const join = raw.createdAt ? new Date(raw.createdAt).toISOString().split('T')[0] : '';
  return {
    id: raw.id,
    sellerName: raw.sellerName,
    storeName: raw.storeName,
    email: raw.email,
    phone: raw.phone,
    status: raw.status,
    kycStatus: kycMap[raw.verificationStatus] || raw.verificationStatus || 'pending',
    country: raw.location || 'N/A',
    city: '',
    address: raw.location || '',
    joinDate: join,
    totalProducts: raw.totalProducts ?? 0,
    totalOrders: raw.totalOrders ?? 0,
    earnings: raw.earnings ?? 0,
    rating: null,
    reviews: 0,
    disputes: raw.disputes ?? 0,
    tickets: raw.tickets ?? 0,
    warningCount: raw.warningCount ?? 0,
  };
}

export default function SellerProfile({ sellerId, onBack }: SellerProfileProps) {
  const showToast = useToastStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [seller, setSeller] = useState<SellerView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sellerId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await adminAPI.getSellerDetails(sellerId);
        if (!cancelled) setSeller(mapSellerDetails(res.seller));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load seller';
        if (!cancelled) {
          setError(msg);
          showToast(msg, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, showToast]);

  const renderTabContent = () => {
    if (!seller) return null;
    switch (activeTab) {
      case 'overview':
        return <OverviewTab seller={seller} />;
      case 'products':
        return <SellerProducts sellerId={sellerId} />;
      case 'performance':
        return <SellerPerformance sellerId={sellerId} />;
      case 'orders':
        return <SellerOrders sellerId={sellerId} />;
      case 'finance':
        return <SellerFinance sellerId={sellerId} />;
      case 'support':
        return <SellerSupport sellerId={sellerId} />;
      case 'strikes':
        return <SellerStrikes sellerId={sellerId} />;
      case 'kyc':
        return <SellerKYC sellerId={sellerId} />;
      case 'notes':
        return <AdminNotes sellerId={sellerId} />;
      case 'settings':
        return <SellerSettings sellerId={sellerId} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sellers
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>{error || 'Seller not found'}</p>
        </div>
      </div>
    );
  }

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
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Seller Profile</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{seller.storeName}</h1>
          <p className="text-gray-500 dark:text-gray-400">Managed by {seller.sellerName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ seller }: { seller: any }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{seller.totalProducts}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{seller.totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Earnings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${seller.earnings.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Open disputes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{seller.disputes}</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{seller.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{seller.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{seller.address || seller.country}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Joined {new Date(seller.joinDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Account Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                {seller.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">KYC Status</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                {seller.kycStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Warnings</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{seller.warningCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Support tickets</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{seller.tickets}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

