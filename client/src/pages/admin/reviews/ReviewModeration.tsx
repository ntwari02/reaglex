import React, { useState } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';

interface Review {
  id: string;
  customerName: string;
  productName: string;
  rating: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  flagged: boolean;
  aiScore?: number;
}

const mockReviews: Review[] = [
  {
    id: '1',
    customerName: 'John Doe',
    productName: 'Premium Headphones',
    rating: 5,
    message: 'Great product! Highly recommend.',
    status: 'pending',
    flagged: false,
    aiScore: 0.95,
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    productName: 'Smart Watch',
    rating: 1,
    message: 'Terrible product, waste of money!',
    status: 'pending',
    flagged: true,
    aiScore: 0.35,
  },
];

export default function ReviewModeration() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoModeration, setAutoModeration] = useState(true);

  const handleApprove = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r))
    );
  };

  const handleReject = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Moderation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Moderate and control review quality
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Auto Moderation</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoModeration}
              onChange={(e) => setAutoModeration(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews
          .filter((r) =>
            r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.productName.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {review.productName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {review.customerName}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {review.flagged && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
                        Flagged
                      </span>
                    )}
                    {review.aiScore && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                        AI Score: {(review.aiScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">{review.message}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(review.id)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    <CheckCircle className="mr-1 inline h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(review.id)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    <XCircle className="mr-1 inline h-4 w-4" />
                    Reject
                  </button>
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <AlertTriangle className="mr-1 inline h-4 w-4" />
                    Flag
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

