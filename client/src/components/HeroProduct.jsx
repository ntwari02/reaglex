import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, Play, Star, Plus, Minus } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';
import ProductInfoCard from './ProductInfoCard';

import { SERVER_URL } from '../lib/config';

function extractImageSrc(src) {
  if (!src) return null;
  if (Array.isArray(src)) return extractImageSrc(src[0]);
  if (typeof src === 'string') return src;
  if (typeof src === 'object') return src.url || src.secure_url || src.path || src.src || null;
  return null;
}

function resolveImage(src) {
  const value = extractImageSrc(src);
  if (!value) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
  return value.startsWith('http') ? value : `${SERVER_URL}${value}`;
}

export default function HeroProduct({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);
  const addItem = useBuyerCart((s) => s.addItem);

  if (!product) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  const primary = Array.isArray(product.images)
    ? (product.images.find((img) => img?.is_primary) || product.images[0])
    : product.images?.[0];
  const imageUrl = resolveImage(primary || product.image || product.imageUrl || product.thumbnail || product.thumbnailUrl);
  const price = product.price || 0;
  const oldPrice = product.compareAtPrice || product.originalPrice || null;
  const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating = product.averageRating || product.rating || 4.8;
  const category = product.category || product.categoryName || 'Featured';

  const handleAddToCart = () => {
    addItem(product, quantity);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[520px]">

      {/* ── LEFT: Product Image ─────────────────────────────────── */}
      <motion.div
        className="lg:col-span-5 flex justify-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="relative">
          {/* Glow blob */}
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-30 -z-10 scale-75"
            style={{ background: 'radial-gradient(circle, #ff8c42 0%, #6c63ff 60%, transparent 80%)' }}
          />

          {/* Main image card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={product._id || product.id}
              initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 3 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                width: 'clamp(280px, 40vw, 420px)',
                height: 'clamp(300px, 42vw, 440px)',
                background: 'white',
                boxShadow: '0 24px 60px rgba(0,0,0,0.14)',
              }}
            >
              <img
                src={imageUrl}
                alt={product.title || product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
                }}
              />
              {/* Overlay gradient */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.18) 100%)' }}
              />

              {/* Discount badge */}
              {discount && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-white text-xs font-bold"
                  style={{ background: '#ff8c42' }}
                >
                  -{discount}%
                </motion.div>
              )}

              {/* Play video button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-semibold"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)' }}
              >
                <Play className="w-3.5 h-3.5" fill="white" />
                Preview
              </motion.button>

              {/* Wishlist */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setWishlisted(!wishlisted)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
              >
                <Heart
                  className="w-4.5 h-4.5"
                  fill={wishlisted ? '#ff8c42' : 'none'}
                  stroke={wishlisted ? '#ff8c42' : '#374151'}
                  style={{ width: '18px', height: '18px' }}
                />
              </motion.button>
            </motion.div>
          </AnimatePresence>

          {/* Floating category tag */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -bottom-4 left-6 px-4 py-1.5 rounded-full text-white text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg, #6c63ff, #a78bfa)' }}
          >
            {category}
          </motion.div>
        </div>
      </motion.div>

      {/* ── CENTER: Product Info ────────────────────────────────── */}
      <motion.div
        className="lg:col-span-4 flex flex-col gap-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        {/* Tag line */}
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4" fill="#ff8c42" stroke="none" />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ff8c42' }}>
            #1 Most loved
          </span>
        </div>

        {/* Product name */}
        <AnimatePresence mode="wait">
          <motion.div
            key={product._id || product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <h1
              className="font-black leading-tight product-title"
              style={{
                color: 'var(--text-primary)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                letterSpacing: '-1.5px',
                lineHeight: 1.1,
              }}
            >
              {(product.title || product.name || 'Product').toUpperCase()}
            </h1>
          </motion.div>
        </AnimatePresence>

        {/* Short description */}
        <p
          className="text-sm leading-relaxed max-w-sm product-desc"
          style={{ color: 'var(--text-secondary)' }}
        >
          {product.description?.slice(0, 120) || 'Premium quality with exceptional craftsmanship.'}
          {(product.description?.length || 0) > 120 ? '…' : ''}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span
            className="font-black product-price"
            style={{ color: 'var(--text-primary)', fontSize: '1.75rem' }}
          >
            ${price.toFixed(2)}
          </span>
          {oldPrice && (
            <span
              className="text-base line-through"
              style={{ color: '#9ca3af' }}
            >
              ${oldPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Quantity + Add to Cart */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quantity selector */}
          <div
            className="flex items-center gap-0 rounded-2xl overflow-hidden"
            style={{ border: '1.5px solid #e5e7eb' }}
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2.5 hover:bg-gray-50 transition"
              style={{ color: '#6b7280' }}
            >
              <Minus className="w-4 h-4" />
            </motion.button>
            <span
              className="px-4 font-semibold text-sm"
              style={{ color: '#1a1a1a', minWidth: '32px', textAlign: 'center' }}
            >
              {quantity}
            </span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2.5 hover:bg-gray-50 transition"
              style={{ color: '#6b7280' }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Add to Cart */}
          <motion.button
            whileHover={{ y: -3, boxShadow: '0 12px 30px rgba(255,140,66,0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white text-sm font-semibold"
            style={{
              background: addedAnim
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #ff8c42, #ff5f00)',
              transition: 'background 0.3s',
              boxShadow: '0 8px 24px rgba(255,140,66,0.3)',
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            {addedAnim ? 'Added!' : 'Add to Cart'}
          </motion.button>

          {/* View detail */}
          <Link
            to={`/products/${product._id || product.id}`}
            className="text-xs font-semibold underline underline-offset-2"
            style={{ color: '#6c63ff' }}
          >
            Order now
          </Link>
        </div>
      </motion.div>

      {/* ── RIGHT: Floating Info Card ───────────────────────────── */}
      <div className="lg:col-span-3 flex justify-center lg:justify-end">
        <ProductInfoCard product={product} />
      </div>
    </div>
  );
}
