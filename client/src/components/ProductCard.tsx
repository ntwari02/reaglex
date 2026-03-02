import { useNavigate } from 'react-router-dom';
import { Eye, Package } from 'lucide-react';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product & { images?: { url: string; is_primary?: boolean; position?: number }[] };
  onViewProduct?: (product: Product) => void;
}

export function ProductCard({ product, onViewProduct }: ProductCardProps) {
  const navigate = useNavigate();

  const getPrimaryImage = () => {
    if (!product.images || product.images.length === 0) {
      return 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg';
    }
    
    const primaryImage = product.images.find(img => (img as any).is_primary);
    if (primaryImage) return primaryImage.url;
    
    const sortedImages = [...product.images].sort((a, b) => (a.position || 0) - (b.position || 0));
    return sortedImages[0]?.url || product.images[0]?.url || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg';
  };

  const handleViewProduct = () => {
    if (onViewProduct) {
      onViewProduct(product);
    } else {
      navigate(`/seller/products/${product.id}`);
    }
  };

  return (
    <div
      className="group cursor-pointer bg-white dark:bg-dark-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
      onClick={handleViewProduct}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={getPrimaryImage()}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewProduct();
          }}
          className="absolute bottom-3 right-3 bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {product.is_shippable && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md">
              <Package className="h-3 w-3" />
              Shippable
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm">
          {product.title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Stock: {product.stock_quantity}
          </span>
        </div>
      </div>
    </div>
  );
}

