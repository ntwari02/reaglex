import React, { useState } from 'react';
import { Image, Search, ZoomIn, RotateCcw, Trash2, AlertTriangle, Eye } from 'lucide-react';

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

const mockMedia: ReviewMedia[] = [
  {
    id: '1',
    reviewId: 'rev-123',
    customerName: 'John Doe',
    productName: 'Premium Headphones',
    imageUrl: 'image1.jpg',
    flagged: false,
    inappropriate: false,
    uploadedAt: '2024-03-15T10:30:00',
  },
  {
    id: '2',
    reviewId: 'rev-456',
    customerName: 'Jane Smith',
    productName: 'Smart Watch',
    imageUrl: 'image2.jpg',
    flagged: true,
    inappropriate: true,
    uploadedAt: '2024-03-16T14:20:00',
  },
];

export default function MediaManagement() {
  const [media, setMedia] = useState<ReviewMedia[]>(mockMedia);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

      {/* Search */}
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

      {/* Media Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredMedia.map((item) => (
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
    </div>
  );
}

