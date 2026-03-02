import React, { useState } from 'react';
import { X, Save, Upload, Image as ImageIcon, Package, DollarSign, BarChart3, Eye, Settings } from 'lucide-react';

interface ProductFormProps {
  product?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'stock' | 'variants' | 'images' | 'shipping' | 'seo' | 'visibility'>('details');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div
        className="relative w-full max-w-6xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
          <div className="flex gap-2 px-6">
            {[
              { id: 'details', label: 'Details', icon: Package },
              { id: 'pricing', label: 'Pricing', icon: DollarSign },
              { id: 'stock', label: 'Stock', icon: BarChart3 },
              { id: 'variants', label: 'Variants', icon: Settings },
              { id: 'images', label: 'Images', icon: ImageIcon },
              { id: 'shipping', label: 'Shipping', icon: Package },
              { id: 'seo', label: 'SEO', icon: Eye },
              { id: 'visibility', label: 'Visibility', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Product Name *</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter product description"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">SKU / Product ID *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Category *</label>
                  <select className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option>Select category</option>
                    <option>Electronics</option>
                    <option>Fashion</option>
                    <option>Home & Garden</option>
                  </select>
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
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Price *</label>
                  <input
                    type="number"
                    step="0.01"
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
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
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Product variants feature - Coming soon</p>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
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
            <div className="space-y-4">
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
            <div className="space-y-4">
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
            <div className="space-y-4">
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
          >
            <Save className="h-4 w-4" /> Save Product
          </button>
        </div>
      </div>
    </div>
  );
}

