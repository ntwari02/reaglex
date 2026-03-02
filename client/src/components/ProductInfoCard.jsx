import { motion } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, Shield, Truck } from 'lucide-react';

export default function ProductInfoCard({ product }) {
  if (!product) return null;

  const rating = product.averageRating || product.rating || 4.8;
  const reviews = product.totalReviews || product.reviewCount || 124;
  const likes = product.likes || Math.floor(Math.random() * 300 + 50);
  const sellerName = product.seller?.storeName || product.sellerName || 'Premium Store';
  const description =
    product.description?.slice(0, 100) ||
    'Premium quality product with exceptional craftsmanship and attention to detail.';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -6 }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        border: '1px solid rgba(255,255,255,0.8)',
        width: '100%',
        maxWidth: '260px',
      }}
    >
      {/* Tab header */}
      <div className="flex border-b border-gray-100">
        <button className="flex-1 py-3 text-xs font-semibold border-b-2 border-orange-400 text-orange-500">
          Overview
        </button>
        <button className="flex-1 py-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition">
          Details
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Rating badge */}
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ff8c42, #ff5f00)' }}
          >
            <span className="text-white font-black text-xl leading-none">{rating.toFixed(1)}</span>
            <Star className="w-3 h-3 text-white mt-0.5" fill="white" />
          </motion.div>
          <div>
            <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{sellerName}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              {reviews} reviews
            </p>
            <div className="flex mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3 h-3"
                  fill={i < Math.round(rating) ? '#ff8c42' : 'none'}
                  stroke={i < Math.round(rating) ? '#ff8c42' : '#d1d5db'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
          {description}
        </p>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Likes / dislikes */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(255,140,66,0.12)', color: '#ff8c42' }}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {likes}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: '#f9fafb', color: '#9ca3af' }}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            {Math.floor(likes * 0.08)}
          </motion.button>
        </div>

        {/* Trust badges */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" style={{ color: '#6c63ff' }} />
            <span className="text-xs" style={{ color: '#6b7280' }}>Buyer protection guaranteed</span>
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" style={{ color: '#6c63ff' }} />
            <span className="text-xs" style={{ color: '#6b7280' }}>Fast & free shipping</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
