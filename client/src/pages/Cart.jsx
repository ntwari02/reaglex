import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ArrowLeft, X } from 'lucide-react';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import RecommendedProducts from '../components/cart/RecommendedProducts';
import { useBuyerCart } from '../stores/buyerCartStore';

import { SERVER_URL } from '../lib/config';

function resolveImage(src) {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

// Fallback lifestyle images when cart is empty or image missing
const LIFESTYLE_IMAGES = [
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80',
  'https://images.unsplash.com/photo-1560472355-536de3962603?w=900&q=80',
];

export default function Cart() {
  const navigate  = useNavigate();
  const items     = useBuyerCart((s) => s.items);
  const removeItem    = useBuyerCart((s) => s.removeItem);
  const updateQuantity = useBuyerCart((s) => s.updateQuantity);
  const clearCart = useBuyerCart((s) => s.clearCart);

  const subtotal  = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const excludeIds = items.map((i) => i.id);

  // Left panel uses first cart item's image, falling back to lifestyle photo
  const [activeImg, setActiveImg] = useState(0);
  const featuredImg =
    (items[0]?.image && resolveImage(items[0].image)) ||
    LIFESTYLE_IMAGES[activeImg % LIFESTYLE_IMAGES.length];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#f9fafb' }}>

      {/* ════════════════════════════════════════════
          LEFT PANEL — Lifestyle image
      ════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden md:flex relative flex-col"
        style={{ width: '42%', minWidth: '320px', flexShrink: 0 }}
      >
        {/* Image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={featuredImg}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <img
              src={featuredImg}
              alt="Featured product"
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = LIFESTYLE_IMAGES[0]; }}
            />
            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 100%)',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Back button — top left */}
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ x: -3 }}
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 z-10"
          style={{ color: 'white' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide">Continue Shopping</span>
        </motion.button>

        {/* Brand watermark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-8 left-8 z-10"
        >
          <Link to="/">
            <img
              src="/logo.jpg"
              alt="Reaglex"
              className="h-12 w-12 rounded-full object-cover"
              style={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.6)',
              }}
            />
          </Link>
        </motion.div>
      </motion.div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Cart
      ════════════════════════════════════════════ */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex-1 flex flex-col bg-white overflow-hidden"
        style={{ boxShadow: '-4px 0 40px rgba(0,0,0,0.06)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          {/* Mobile back */}
          <motion.button
            whileHover={{ x: -3 }}
            onClick={() => navigate(-1)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: '#374151' }} />
          </motion.button>

          {/* Arrow icon (desktop) */}
          <motion.div
            whileHover={{ x: 3 }}
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-xl"
            style={{ background: '#f3f4f6' }}
          >
            <ArrowLeft className="w-4 h-4 rotate-180" style={{ color: '#374151' }} />
          </motion.div>

          {/* Cart count badge */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" style={{ color: '#111827' }} />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                  style={{ background: '#ff8c42', fontSize: '9px' }}
                >
                  {cartCount}
                </motion.span>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: 'none' }}>

          {/* Empty state */}
          <AnimatePresence>
            {items.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-5 py-24"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-3xl flex items-center justify-center"
                  style={{ background: '#fff7ed' }}
                >
                  <ShoppingCart className="w-8 h-8" style={{ color: '#ff8c42' }} />
                </motion.div>
                <div className="text-center">
                  <h3 className="font-bold text-lg" style={{ color: '#111827' }}>
                    Your cart is empty
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                    Add something amazing to get started
                  </p>
                </div>
                <Link to="/">
                  <motion.button
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-2.5 rounded-2xl text-white text-sm font-semibold"
                    style={{ background: '#111827' }}
                  >
                    Browse Products
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {items.length > 0 && (
            <>
              {/* Cart items */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-base" style={{ color: '#111827' }}>
                    Your Cart
                    <span className="ml-2 text-xs font-normal" style={{ color: '#9ca3af' }}>
                      ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                    </span>
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearCart}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </motion.button>
                </div>

                <AnimatePresence>
                  {items.map((item, idx) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      index={idx}
                      onRemove={removeItem}
                      onUpdateQty={updateQuantity}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Cart summary */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="mt-6"
              >
                <CartSummary
                  subtotal={subtotal}
                  onCheckout={() => alert('Checkout coming soon!')}
                />
              </motion.div>

              {/* Divider */}
              <div className="my-8 border-t border-dashed" style={{ borderColor: '#f3f4f6' }} />

              {/* Recommended */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
              >
                <RecommendedProducts excludeIds={excludeIds} />
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
