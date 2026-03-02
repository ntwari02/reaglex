import React, { useState } from 'react';
import {
  Users,
  Star,
  Search,
  TrendingDown,
  TrendingUp,
  Eye,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

interface SellerRating {
  id: string;
  sellerName: string;
  storeName: string;
  overallRating: number;
  communication: number;
  shippingSpeed: number;
  productQuality: number;
  totalReviews: number;
  status: 'good' | 'warning' | 'poor';
}

const mockSellers: SellerRating[] = [
  {
    id: '1',
    sellerName: 'Tech Store',
    storeName: 'Tech Store Official',
    overallRating: 4.8,
    communication: 4.9,
    shippingSpeed: 4.7,
    productQuality: 4.8,
    totalReviews: 245,
    status: 'good',
  },
  {
    id: '2',
    sellerName: 'Fashion Hub',
    storeName: 'Fashion Hub',
    overallRating: 3.2,
    communication: 3.0,
    shippingSpeed: 3.5,
    productQuality: 3.1,
    totalReviews: 89,
    status: 'poor',
  },
];

export default function SellerRatings() {
  const [sellers, setSellers] = useState<SellerRating[]>(mockSellers);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSellers = sellers.filter(
    (seller) =>
      seller.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.storeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: SellerRating['status']) => {
    const styles = {
      good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      poor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-semibold text-gray-900 dark:text-white">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Ratings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          View and manage seller ratings and performance
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search sellers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Sellers List */}
      <div className="space-y-4">
        {filteredSellers.map((seller) => (
          <div
            key={seller.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {seller.storeName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{seller.sellerName}</p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {getStatusBadge(seller.status)}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {seller.totalReviews} reviews
                  </span>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Overall Rating
                  </p>
                  {renderStars(seller.overallRating)}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Communication</p>
                    {renderStars(seller.communication)}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Shipping Speed</p>
                    {renderStars(seller.shippingSpeed)}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Product Quality</p>
                    {renderStars(seller.productQuality)}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Eye className="mr-1 inline h-4 w-4" />
                  View Details
                </button>
                {seller.status === 'poor' && (
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                    <AlertTriangle className="mr-1 inline h-4 w-4" />
                    Flag Seller
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

