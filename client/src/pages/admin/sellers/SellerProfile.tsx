import React, { useState } from 'react';
import { ArrowLeft, Store, Mail, Phone, MapPin, Calendar, FileText, Star, Shield } from 'lucide-react';
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

export default function SellerProfile({ sellerId, onBack }: SellerProfileProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Mock seller data - in real app, fetch by sellerId
  const seller = {
    id: sellerId,
    sellerName: 'John Tech Store',
    storeName: 'TechHub Electronics',
    email: 'john@techhub.com',
    phone: '+1 555 123 4567',
    status: 'active' as const,
    kycStatus: 'verified' as const,
    country: 'United States',
    city: 'San Francisco',
    address: '123 Tech Street, SF, CA 94102',
    joinDate: '2023-01-15',
    totalProducts: 245,
    totalOrders: 1234,
    earnings: 125000,
    rating: 4.8,
    reviews: 892,
  };

  const renderTabContent = () => {
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
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Rating</p>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{seller.rating}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">({seller.reviews} reviews)</p>
          </div>
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
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {seller.address}, {seller.city}, {seller.country}
              </span>
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
              <span className="text-sm text-gray-600 dark:text-gray-300">Store Name</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{seller.storeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            Approve KYC
          </button>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Suspend Seller
          </button>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Send Message
          </button>
          <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300">
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}

