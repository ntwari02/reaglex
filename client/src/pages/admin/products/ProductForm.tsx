import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  Save,
  Upload,
  Image as ImageIcon,
  Package,
  DollarSign,
  BarChart3,
  Eye,
  Settings,
  ShieldCheck,
  ScanSearch,
  Sparkles,
  Barcode,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { adminProductsAPI } from '@/lib/api';

interface ProductFormProps {
  product?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'stock' | 'variants' | 'images' | 'shipping' | 'seo' | 'visibility' | 'verification'>('details');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [verificationInput, setVerificationInput] = useState({
    barcode: '',
    serialNumber: '',
    imei: '',
    qrCode: '',
    videoProofUploaded: false,
    labelProofUploaded: false,
    scanPassed: false,
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: 0,
    stock: 0,
    discount: 0,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        category: product.category || '',
        price: Number(product.price) || 0,
        stock: Number(product.stock) ?? 0,
        discount: Number(product.discountPercent ?? product.discount) || 0,
      });
    }
  }, [product]);

  const trustScore = useMemo(() => {
    let score = 0;
    if (formData.name.trim()) score += 15;
    if (formData.sku.trim()) score += 15;
    if (verificationInput.barcode.trim()) score += 18;
    if (verificationInput.qrCode.trim()) score += 15;
    if (verificationInput.serialNumber.trim() || verificationInput.imei.trim()) score += 12;
    if (imagePreviews.length > 0) score += 12;
    if (verificationInput.videoProofUploaded) score += 10;
    if (verificationInput.labelProofUploaded) score += 8;
    if (verificationInput.scanPassed) score += 10;
    return Math.min(100, score);
  }, [formData.name, formData.sku, imagePreviews.length, verificationInput]);

  const trustLevel: 'low' | 'medium' | 'high' =
    trustScore >= 75 ? 'high' : trustScore >= 45 ? 'medium' : 'low';

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setImagePreviews([]);
      return;
    }

    const urls = Array.from(files).map((file) =>
      URL.createObjectURL(file)
    );
    setImagePreviews(urls);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-2 sm:px-4 py-3 sm:py-6">
      <div
        className="relative w-[98vw] max-w-7xl h-[95vh] rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start sm:items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {product ? 'Edit Product' : 'Create Product'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Futuristic admin product studio with trust-first verification flow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
          <div className="flex gap-2 px-3 sm:px-6 py-2">
            {[
              { id: 'details', label: 'Details', icon: Package },
              { id: 'pricing', label: 'Pricing', icon: DollarSign },
              { id: 'stock', label: 'Stock', icon: BarChart3 },
              { id: 'variants', label: 'Variants', icon: Settings },
              { id: 'images', label: 'Images', icon: ImageIcon },
              { id: 'shipping', label: 'Shipping', icon: Package },
              { id: 'seo', label: 'SEO', icon: Eye },
              { id: 'visibility', label: 'Visibility', icon: Settings },
              { id: 'verification', label: 'Trust', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap rounded-full border ${
                    activeTab === tab.id
                      ? 'border-emerald-500/70 text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30'
                      : 'border-gray-200 text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-4 sm:px-6 py-5 pb-28 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${
                trustLevel === 'high'
                  ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300'
                  : trustLevel === 'medium'
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300'
                  : 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
              }`}>
                <Sparkles className="h-3.5 w-3.5" />
                Trust Score {trustScore}/100
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Stronger verification lowers fraud and manual review risk.
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  trustLevel === 'high' ? 'bg-green-500' : trustLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${trustScore}%` }}
              />
            </div>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter product description"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">SKU / Product ID *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData((d) => ({ ...d, sku: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData((d) => ({ ...d, category: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g. Electronics, Fashion"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Brand</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter brand"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Seller</label>
                  <select className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option>Select seller</option>
                    <option>TechHub Electronics</option>
                    <option>HomeStyle</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Tags</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price || ''}
                    onChange={(e) => setFormData((d) => ({ ...d, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Compare at Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Discount Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Discount %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount || ''}
                    onChange={(e) => setFormData((d) => ({ ...d, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Track Stock</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enable stock tracking for this product</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" defaultChecked />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock || ''}
                    onChange={(e) => setFormData((d) => ({ ...d, stock: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Low Stock Alert</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <p className="text-sm text-gray-600 dark:text-gray-400">Compact variant manager coming soon (color/size/SKU/stock rows).</p>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 sm:p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
                <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Upload Product Images</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Drag and drop or click to browse. Selected images will be previewed below.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mx-auto block text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 dark:text-gray-300 dark:file:bg-emerald-900/30 dark:file:text-emerald-200"
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    {imagePreviews.map((src, idx) => (
                      <div
                        key={idx}
                        className="h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
                      >
                        <img
                          src={src}
                          alt={`Preview ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Length (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Width (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Height (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Meta Title</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter meta title"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Meta Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter meta description"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Slug / URL</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="product-url-slug"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Search Keywords</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </div>
          )}

          {activeTab === 'visibility' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Publish Status</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Make product visible to customers</p>
                </div>
                <select className="rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Product Status</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active or inactive</p>
                </div>
                <select className="rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Show on Homepage</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Feature product on homepage</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Featured Product</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mark as featured product</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 bg-white/70 dark:bg-gray-900/60">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verification strengthens trust and reduces manual moderation risk.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Barcode className="h-4 w-4" /> Barcode / UPC / EAN
                  </label>
                  <input
                    type="text"
                    value={verificationInput.barcode}
                    onChange={(e) => setVerificationInput((p) => ({ ...p, barcode: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Scan or enter barcode"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <QrCode className="h-4 w-4" /> QR Trust Tag
                  </label>
                  <input
                    type="text"
                    value={verificationInput.qrCode}
                    onChange={(e) => setVerificationInput((p) => ({ ...p, qrCode: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Spacilly trust QR code"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Smartphone className="h-4 w-4" /> Serial Number
                  </label>
                  <input
                    type="text"
                    value={verificationInput.serialNumber}
                    onChange={(e) => setVerificationInput((p) => ({ ...p, serialNumber: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Optional serial"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">IMEI (if applicable)</label>
                  <input
                    type="text"
                    value={verificationInput.imei}
                    onChange={(e) => setVerificationInput((p) => ({ ...p, imei: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="IMEI"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={verificationInput.videoProofUploaded}
                    onChange={(e) => setVerificationInput((p) => ({ ...p, videoProofUploaded: e.target.checked }))}
                  />
                  Video proof uploaded
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={verificationInput.labelProofUploaded}
                    onChange={(e) => setVerificationInput((p) => ({ ...p, labelProofUploaded: e.target.checked }))}
                  />
                  Label / tag close-up uploaded
                </label>
              </div>
              <button
                type="button"
                onClick={() => setVerificationInput((p) => ({ ...p, scanPassed: !p.scanPassed }))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-emerald-400"
              >
                <ScanSearch className="h-4 w-4" />
                {verificationInput.scanPassed ? 'Similarity Scan: Passed' : 'Run Similarity Scan'}
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-2 border-t border-gray-200 px-4 sm:px-6 py-3 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verification')}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Review Trust
          </button>
          <button
            disabled={saving || !formData.name.trim()}
            onClick={async () => {
              if (!formData.name.trim()) return;
              setSaving(true);
              try {
                if (product?.id) {
                  await adminProductsAPI.updateProduct(product.id, {
                    name: formData.name.trim(),
                    description: formData.description.trim(),
                    sku: formData.sku.trim() || undefined,
                    category: formData.category.trim() || undefined,
                    price: formData.price,
                    stock: formData.stock,
                    discount: formData.discount,
                  });
                } else {
                  await adminProductsAPI.createProduct({
                    name: formData.name.trim(),
                    description: formData.description.trim(),
                    sku: formData.sku.trim() || `SKU-${Date.now()}`,
                    category: formData.category.trim() || undefined,
                    price: formData.price,
                    stock: formData.stock,
                    discount: formData.discount,
                  });
                }
                onSave();
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Failed to save product');
              } finally {
                setSaving(false);
              }
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

