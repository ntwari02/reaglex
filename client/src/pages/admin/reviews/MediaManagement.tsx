import React, { useState, useEffect } from 'react';
import { Image, Search, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { adminReviewsAPI } from '@/lib/api';

interface ReviewMedia {
  id: string;
  reviewId: string;
  customerName: string;
  productName: string;
  imageUrl: string;
  flagged: boolean;
  inappropriate: boolean;
  uploadedAt: string;
}

export default function MediaManagement() {
  const [media, setMedia] = useState<ReviewMedia[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminReviewsAPI.getMedia()
      .then((res) => setMedia(res.media || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filteredMedia = media.filter(
    (item) =>
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Media Management for Reviews
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage images and videos uploaded by customers
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search media..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading media...</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredMedia.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">No review media yet.</p>
          </div>
        ) : filteredMedia.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-3 aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
              <Image className="h-12 w-12 text-gray-400" />
              {item.flagged && (
                <div className="absolute top-2 right-2 rounded-full bg-orange-500 p-1">
                  <AlertTriangle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {item.productName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.customerName}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Eye className="h-3 w-3" />
              </button>
              <button className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

