import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  X,
  Ban,
  Edit,
  Eye,
  TrendingUp,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';

interface SellerProductsProps {
  sellerId: string;
}

type ProductStatus = 'active' | 'pending' | 'blocked' | 'rejected';
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

interface Product {
  id: string;
  name: string;
  sku: string;
  status: ProductStatus;
  stockStatus: StockStatus;
  price: number;
  stock: number;
  sales: number;
  views: number;
  rating: number;
  category: string;
  createdAt: string;
  hasVariants: boolean;
}

const mockProducts: Product[] = [
  {
    id: 'PROD-001',
    name: 'Wireless Bluetooth Headphones',
    sku: 'WBH-001',
    status: 'active',
    stockStatus: 'in_stock',
    price: 79.99,
    stock: 245,
    sales: 1234,
    views: 5678,
    rating: 4.5,
    category: 'Electronics',
    createdAt: '2024-01-15',
    hasVariants: true,
  },
  {
    id: 'PROD-002',
    name: 'Smart Watch Pro',
    sku: 'SWP-002',
    status: 'pending',
    stockStatus: 'in_stock',
    price: 199.99,
    stock: 0,
    sales: 0,
    views: 234,
    rating: 0,
    category: 'Electronics',
    createdAt: '2024-03-10',
    hasVariants: false,
  },
  {
    id: 'PROD-003',
    name: 'Laptop Stand Adjustable',
    sku: 'LSA-003',
    status: 'blocked',
    stockStatus: 'low_stock',
    price: 49.99,
    stock: 5,
    sales: 456,
    views: 1234,
    rating: 4.2,
    category: 'Accessories',
    createdAt: '2023-12-20',
    hasVariants: false,
  },
  {
    id: 'PROD-004',
    name: 'USB-C Cable 2m',
    sku: 'UCC-004',
    status: 'active',
    stockStatus: 'out_of_stock',
    price: 12.99,
    stock: 0,
    sales: 892,
    views: 3456,
    rating: 4.7,
    category: 'Accessories',
    createdAt: '2023-11-05',
    hasVariants: true,
  },
];

export default function SellerProducts({ sellerId }: SellerProductsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<StockStatus | 'all'>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesStock = stockFilter === 'all' || product.stockStatus === stockFilter;
      return matchesSearch && matchesStatus && matchesStock;
    });
  }, [searchQuery, statusFilter, stockFilter]);

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: ProductStatus) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      blocked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      rejected: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>{status}</span>
    );
  };

  const getStockBadge = (stock: StockStatus) => {
    const styles = {
      in_stock: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      low_stock: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      out_of_stock: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[stock]}`}>
        {stock.replace('_', ' ')}
      </span>
    );
  };

  const handleBulkAction = (action: 'approve' | 'reject' | 'block') => {
    console.log(`Bulk ${action} for products:`, Array.from(selectedProducts));
    setSelectedProducts(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Products</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage all products from this seller</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedProducts.size > 0 && (
            <>
              <button
                onClick={() => handleBulkAction('approve')}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              >
                <CheckCircle className="h-4 w-4" /> Approve ({selectedProducts.size})
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              >
                <X className="h-4 w-4" /> Reject ({selectedProducts.size})
              </button>
              <button
                onClick={() => handleBulkAction('block')}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <Ban className="h-4 w-4" /> Block ({selectedProducts.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockProducts.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {mockProducts.filter((p) => p.status === 'pending').length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Low Stock</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {mockProducts.filter((p) => p.stockStatus === 'low_stock').length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Blocked</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {mockProducts.filter((p) => p.status === 'blocked').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Search by product name, SKU, or ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockStatus | 'all')}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={() => {
                      if (selectedProducts.size === filteredProducts.length) {
                        setSelectedProducts(new Set());
                      } else {
                        setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
                      }
                    }}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Sales</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{product.sku}</td>
                  <td className="px-4 py-4">{getStatusBadge(product.status)}</td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {getStockBadge(product.stockStatus)}
                      <p className="text-xs text-gray-500">{product.stock} units</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{product.sales}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{product.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {product.status === 'pending' && (
                        <>
                          <button
                            className="rounded-full border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                            title="Approve product"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-full border border-red-200 bg-red-50 p-2 text-xs text-red-700 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                            title="Reject product"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {product.status === 'active' && (
                        <button
                          className="rounded-full border border-red-200 bg-red-50 p-2 text-xs text-red-700 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                          title="Block product"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
                        title="View product"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
                        title="Edit product"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-full border border-gray-200 p-2 text-xs text-gray-600 hover:border-amber-400 dark:border-gray-700 dark:text-gray-400 dark:hover:border-amber-400"
                        title="More actions"
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

      {filteredProducts.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">No products found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
