import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart } from 'lucide-react';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import RecommendedProducts from './RecommendedProducts';
import DeliveryLocationSheet from '../delivery/DeliveryLocationSheet';
import { useCartShippingPreview } from '../../hooks/useCartShippingPreview';

export default function CartPanelBody({
  items,
  cartCount,
  onClose,
  onRemove,
  onUpdateQty,
  onClear,
  shippingPreviewLocation,
  onChangeLocation,
  compactHeader = false,
}) {
  const navigate = useNavigate();
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { quote, loading, error, subtotal, tax, shippingTotal, grand } = useCartShippingPreview(
    items,
    shippingPreviewLocation,
  );
  const excludeIds = items.map((i) => i.id);

  return (
    <>
      <div
        className={`flex items-center justify-between flex-shrink-0 sticky top-0 z-10 ${compactHeader ? 'px-4 py-3' : 'px-6 py-4'}`}
        style={{
          borderBottom: '1px solid var(--divider)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-3">
          <motion.div className="relative">
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full text-white font-bold flex items-center justify-center"
                style={{ background: 'var(--brand-primary)', fontSize: '9px', padding: '0 3px' }}
              >
                {cartCount}
              </motion.span>
            )}
          </motion.div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            My Cart
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          aria-label="Close cart"
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </motion.button>
      </div>

      <div
        className={`flex-1 overflow-y-auto pb-8 pt-3 ${compactHeader ? 'px-4' : 'px-6'}`}
        style={{ scrollbarWidth: 'none' }}
      >
        <AnimatePresence>
          {items.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-5 py-20"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: 'var(--brand-tint)' }}
              >
                <ShoppingCart className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
              </motion.div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Your cart is empty
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl text-white text-sm font-semibold"
                style={{ background: 'var(--brand-primary)', boxShadow: 'var(--shadow-cta)' }}
              >
                Browse products
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-2 mb-1">
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Items <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({cartCount})</span>
              </h2>
              <button
                type="button"
                onClick={onClear}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.07)' }}
              >
                Clear all
              </button>
            </div>

            <AnimatePresence>
              {items.map((item, idx) => (
                <CartItem
                  key={item.id}
                  item={item}
                  index={idx}
                  onRemove={onRemove}
                  onUpdateQty={onUpdateQty}
                />
              ))}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6"
            >
              <CartSummary
                subtotal={subtotal}
                shippingTotal={shippingTotal}
                tax={tax}
                grand={grand}
                quote={quote}
                loading={loading}
                error={error}
                shippingPreviewLocation={shippingPreviewLocation}
                onChangeLocation={() => setLocationSheetOpen(true)}
                onCheckout={() => {
                  onClose();
                  navigate('/checkout');
                }}
              />
            </motion.div>

            <div className="my-6" style={{ borderTop: '1px dashed var(--divider-strong)' }} />
            <RecommendedProducts excludeIds={excludeIds} />
          </>
        )}
      </div>

      <DeliveryLocationSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        value={shippingPreviewLocation}
        onSelect={onChangeLocation}
      />
    </>
  );
}
