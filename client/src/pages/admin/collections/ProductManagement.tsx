import { useState } from 'react';
import { Package, Search, Plus, X, GripVertical, Edit } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  views: number;
  conversion: number;
  sales: number;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Headphones',
    price: 199.99,
    stock: 45,
    views: 1250,
    conversion: 12.5,
    sales: 156,
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 299.99,
    stock: 32,
    views: 980,
    conversion: 8.3,
    sales: 81,
  },
];

export default function ProductManagement() {
  const [products] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('1');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Product Management
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage products inside collections
          </p>
        </div>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="1">Summer Sale</option>
          <option value="2">New Arrivals</option>
          <option value="3">Best Sellers</option>
        </select>
      </div>

      {/* Search and Add */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
          <Plus className="mr-2 inline h-4 w-4" />
          Add Products
        </button>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <GripVertical className="h-5 w-5 cursor-move text-gray-400" />
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ${product.price} • Stock: {product.stock}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Views: {product.views}</span>
                <span>Conversion: {product.conversion}%</span>
                <span>Sales: {product.sales}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Edit className="h-4 w-4" />
              </button>
              <button className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-400 dark:border-gray-700 dark:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

