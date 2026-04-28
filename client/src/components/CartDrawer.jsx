import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, ShoppingBag } from 'lucide-react';
import CartItem from './cart/CartItem';
import CartSummary from './cart/CartSummary';
import RecommendedProducts from './cart/RecommendedProducts';
import { useBuyerCart } from '../stores/buyerCartStore';

export default function CartDrawer() {
  const navigate = useNavigate();
  const cartOpen   = useBuyerCart((s) => s.cartOpen);
  const closeCart  = useBuyerCart((s) => s.closeCart);
  const items      = useBuyerCart((s) => s.items);
  const removeItem = useBuyerCart((s) => s.removeItem);
  const updateQuantity = useBuyerCart((s) => s.updateQuantity);
  const clearCart  = useBuyerCart((s) => s.clearCart);

  const subtotal   = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount  = items.reduce((sum, i) => sum + i.quantity, 0);
  const excludeIds = items.map((i) => i.id);

  // Mobile back button behavior:
  // opening cart pushes a history entry so browser back closes drawer first.
  useEffect(() => {
    if (!cartOpen) return;

    window.history.pushState({ cartDrawer: true }, '');
    const handlePopState = () => {
      closeCart();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [cartOpen, closeCart]);

  const closeDrawer = useCallback(() => {
    if (window.history.state?.cartDrawer) {
      window.history.back();
      return;
    }
    closeCart();
  }, [closeCart]);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* ── Drawer panel — futuristic right dock ── */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35, mass: 0.85 }}
            className="fixed top-0 right-0 bottom-0 z-[220] flex flex-col overflow-hidden"
            style={{
              width: 'min(100vw, 480px)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              /* Futuristic glowing left edge */
              borderLeft: '2px solid rgba(249,115,22,0.55)',
              boxShadow: '-4px 0 0 0 rgba(249,115,22,0.08), -16px 0 48px rgba(249,115,22,0.06), -2px 0 24px rgba(0,0,0,0.18)',
            }}
          >
            {/* Futuristic top accent bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 3,
                background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.9), rgba(249,115,22,0.4), transparent)',
                transformOrigin: 'left',
                zIndex: 30,
              }}
            />
            {/* ── Cart panel (full width, no image) ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0 sticky top-0 z-10"
                style={{
                  borderBottom: '1px solid var(--divider)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={closeDrawer}
                    className="md:hidden w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ '--tw-bg-opacity': 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Back to shopping"
                  >
                    <ShoppingBag className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </motion.button>
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full text-white font-bold flex items-center justify-center"
                        style={{ background: '#ff8c42', fontSize: '9px', padding: '0 3px' }}
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    My Cart
                  </span>
                </div>

                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </motion.button>
              </div>

              {/* Scrollable body */}
              <div
                className="flex-1 overflow-y-auto px-6 pb-8 pt-3"
                style={{ scrollbarWidth: 'none', paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
              >
                {/* ── Empty state ── */}
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
                        style={{ background: 'var(--brand-tint)' }}
                      >
                        <ShoppingCart className="w-8 h-8" style={{ color: '#ff8c42' }} />
                      </motion.div>
                      <div className="text-center">
                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                          Your cart is empty
                        </h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                          Add something amazing to get started
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={closeDrawer}
                        className="px-6 py-2.5 rounded-2xl text-white text-sm font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, #ff8c42, #ff5f00)',
                          boxShadow: '0 8px 24px rgba(255,140,66,0.35)',
                        }}
                      >
                        Browse Products
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {items.length > 0 && (
                  <>
                    {/* Cart items header */}
                    <div className="flex items-center justify-between mt-4 mb-1">
                      <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Items
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                          ({cartCount})
                        </span>
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearCart}
                        className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.07)' }}
                      >
                        <X className="w-3 h-3" /> Clear all
                      </motion.button>
                    </div>

                    {/* Items list */}
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

                    {/* Summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className="mt-6"
                    >
                      <CartSummary
                        subtotal={subtotal}
                        onCheckout={() => {
                          closeDrawer();
                          navigate('/checkout');
                        }}
                      />
                    </motion.div>

                    {/* Recommended */}
                    <div
                      className="my-7"
                      style={{ borderTop: '1px dashed var(--divider-strong)' }}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4 }}
                    >
                      <RecommendedProducts excludeIds={excludeIds} />
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
