import React, { useState } from 'react';
import {
  Store,
  Upload,
  Save,
  Eye,
  EyeOff,
  Building,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Package,
  X,
} from 'lucide-react';

interface SellerSettingsProps {
  sellerId: string;
}

const mockCategories = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Beauty & Personal Care',
  'Sports & Outdoors',
  'Toys & Games',
  'Books',
  'Automotive',
];

export default function SellerSettings({ sellerId }: SellerSettingsProps) {
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'TechHub Electronics',
    storeDescription: 'Your one-stop shop for all electronics needs',
    isVisible: true,
    logo: null as File | null,
    banner: null as File | null,
  });

  const [businessInfo, setBusinessInfo] = useState({
    businessName: 'TechHub Electronics LLC',
    businessType: 'LLC',
    taxId: 'TAX-123456789',
    registrationNumber: 'REG-987654321',
    address: '123 Tech Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'United States',
    phone: '+1 555 123 4567',
    email: 'contact@techhub.com',
  });

  const [payoutMethod, setPayoutMethod] = useState({
    method: 'bank_transfer',
    bankName: 'Chase Bank',
    accountNumber: '****1234',
    routingNumber: '****5678',
    accountHolderName: 'TechHub Electronics LLC',
    paypalEmail: '',
  });

  const [allowedCategories, setAllowedCategories] = useState<string[]>(['Electronics', 'Fashion']);

  const toggleCategory = (category: string) => {
    if (allowedCategories.includes(category)) {
      setAllowedCategories(allowedCategories.filter((c) => c !== category));
    } else {
      setAllowedCategories([...allowedCategories, category]);
    }
  };

  const handleSave = () => {
    console.log('Saving settings...', {
      storeSettings,
      businessInfo,
      payoutMethod,
      allowedCategories,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Store Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage store configuration and settings</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
        >
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>

      {/* Store Information */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Store Information</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Store Name</label>
            <input
              type="text"
              value={storeSettings.storeName}
              onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Store Description
            </label>
            <textarea
              rows={3}
              value={storeSettings.storeDescription}
              onChange={(e) => setStoreSettings({ ...storeSettings, storeDescription: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Store Logo</label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <Store className="h-8 w-8 text-gray-400" />
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Upload className="h-4 w-4" /> Upload Logo
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Store Banner</label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-32 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <Store className="h-8 w-8 text-gray-400" />
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Upload className="h-4 w-4" /> Upload Banner
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Store Visibility</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {storeSettings.isVisible ? 'Store is visible to customers' : 'Store is hidden from customers'}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={storeSettings.isVisible}
                onChange={(e) => setStoreSettings({ ...storeSettings, isVisible: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Business Information</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Business Name</label>
            <input
              type="text"
              value={businessInfo.businessName}
              onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Business Type</label>
            <select
              value={businessInfo.businessType}
              onChange={(e) => setBusinessInfo({ ...businessInfo, businessType: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="LLC">LLC</option>
              <option value="Corporation">Corporation</option>
              <option value="Partnership">Partnership</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Tax ID</label>
            <input
              type="text"
              value={businessInfo.taxId}
              onChange={(e) => setBusinessInfo({ ...businessInfo, taxId: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Registration Number
            </label>
            <input
              type="text"
              value={businessInfo.registrationNumber}
              onChange={(e) => setBusinessInfo({ ...businessInfo, registrationNumber: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Address</label>
            <input
              type="text"
              value={businessInfo.address}
              onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">City</label>
            <input
              type="text"
              value={businessInfo.city}
              onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">State</label>
            <input
              type="text"
              value={businessInfo.state}
              onChange={(e) => setBusinessInfo({ ...businessInfo, state: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Zip Code</label>
            <input
              type="text"
              value={businessInfo.zipCode}
              onChange={(e) => setBusinessInfo({ ...businessInfo, zipCode: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Country</label>
            <input
              type="text"
              value={businessInfo.country}
              onChange={(e) => setBusinessInfo({ ...businessInfo, country: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Phone</label>
            <input
              type="text"
              value={businessInfo.phone}
              onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={businessInfo.email}
              onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Payout Method */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Payout Method</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Payment Method</label>
            <select
              value={payoutMethod.method}
              onChange={(e) => setPayoutMethod({ ...payoutMethod, method: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>
          {payoutMethod.method === 'bank_transfer' && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={payoutMethod.bankName}
                    onChange={(e) => setPayoutMethod({ ...payoutMethod, bankName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={payoutMethod.accountHolderName}
                    onChange={(e) => setPayoutMethod({ ...payoutMethod, accountHolderName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={payoutMethod.accountNumber}
                    onChange={(e) => setPayoutMethod({ ...payoutMethod, accountNumber: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Routing Number
                  </label>
                  <input
                    type="text"
                    value={payoutMethod.routingNumber}
                    onChange={(e) => setPayoutMethod({ ...payoutMethod, routingNumber: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </>
          )}
          {payoutMethod.method === 'paypal' && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                PayPal Email
              </label>
              <input
                type="email"
                value={payoutMethod.paypalEmail}
                onChange={(e) => setPayoutMethod({ ...payoutMethod, paypalEmail: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Allowed Categories */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Allowed Categories</h3>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Select categories this seller is allowed to sell in
        </p>
        <div className="flex flex-wrap gap-2">
          {mockCategories.map((category) => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                allowedCategories.includes(category)
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {allowedCategories.includes(category) ? (
                <X className="h-4 w-4" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
