import React, { useState } from 'react';
import {
  Star,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Package,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  productId: string;
  orderId: string;
  rating: number;
  message: string;
  images: string[];
  status: 'approved' | 'pending' | 'rejected' | 'flagged';
  createdAt: string;
  sellerResponse?: string;
}

const mockReviews: Review[] = [
  {
    id: '1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    productName: 'Premium Headphones',
    productId: 'prod-123',
    orderId: 'ORD-12345',
    rating: 5,
    message: 'Excellent product! Great quality and fast shipping.',
    images: ['image1.jpg'],
    status: 'approved',
    createdAt: '2024-03-15T10:30:00',
    sellerResponse: 'Thank you for your review!',
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    productName: 'Smart Watch',
    productId: 'prod-456',
    orderId: 'ORD-12346',
    rating: 3,
    message: 'Product is okay but battery life could be better.',
    images: [],
    status: 'pending',
    createdAt: '2024-03-17T14:20:00',
  },
];

export default function CustomerProductReviews() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.orderId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating = ratingFilter === 'all' || review.rating === Number(ratingFilter);
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;

    return matchesSearch && matchesRating && matchesStatus;
  });

  const getStatusBadge = (status: Review['status']) => {
    const styles = {
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      flagged: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
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
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Product Reviews</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          View and manage all customer product reviews
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, product, order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <Star className="h-5 w-5 text-amber-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {review.productName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {review.customerName} • Order: {review.orderId}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {renderStars(review.rating)}
                  {getStatusBadge(review.status)}
                </div>

                <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">{review.message}</p>

                {review.images.length > 0 && (
                  <div className="mb-3 flex gap-2">
                    {review.images.map((img, index) => (
                      <div
                        key={index}
                        className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}

                {review.sellerResponse && (
                  <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Seller Response:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {review.sellerResponse}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(review.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedReview(review);
                  setShowReviewModal(true);
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <Eye className="mr-1 inline h-4 w-4" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

