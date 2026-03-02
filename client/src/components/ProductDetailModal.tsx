import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  // Track view when modal opens
  useEffect(() => {
    if (isOpen && product?.id) {
      // Track product view
      fetch(`http://localhost:5000/api/products/${product.id}/view`, {
        method: 'POST',
        credentials: 'include',
      }).catch((error) => {
        // Silently fail if product doesn't exist in database
        console.log('View tracking skipped:', error);
      });
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{product.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{product.description}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Price:</span>
              <span className="font-bold text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Stock:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{product.stock_quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-semibold ${product.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                {product.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

