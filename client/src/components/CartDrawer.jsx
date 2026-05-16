import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileCartSheet from './cart/MobileCartSheet';
import CartPanelBody from './cart/CartPanelBody';

export default function CartDrawer() {
  const isMobile = useIsMobile();
  const cartOpen = useBuyerCart((s) => s.cartOpen);
  const closeCart = useBuyerCart((s) => s.closeCart);
  const items = useBuyerCart((s) => s.items);
  const removeItem = useBuyerCart((s) => s.removeItem);
  const updateQuantity = useBuyerCart((s) => s.updateQuantity);
  const clearCart = useBuyerCart((s) => s.clearCart);
  const shippingPreviewLocation = useBuyerCart((s) => s.shippingPreviewLocation);
  const setShippingPreviewLocation = useBuyerCart((s) => s.setShippingPreviewLocation);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    if (isMobile || !cartOpen) return undefined;
    window.history.pushState({ cartDrawer: true }, '');
    const handlePopState = () => closeCart();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [cartOpen, closeCart, isMobile]);

  const closeDrawer = useCallback(() => {
    if (window.history.state?.cartDrawer) {
      window.history.back();
      return;
    }
    closeCart();
  }, [closeCart]);

  if (isMobile) return <MobileCartSheet />;

  return (
    <AnimatePresence>
      {cartOpen && (
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
            borderLeft: '2px solid color-mix(in srgb, var(--brand-primary) 55%, transparent)',
            boxShadow:
              '-4px 0 0 0 color-mix(in srgb, var(--brand-primary) 12%, transparent), -16px 0 48px rgba(0,0,0,0.22)',
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                'linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand-primary) 85%, transparent), transparent)',
              transformOrigin: 'left',
              zIndex: 30,
            }}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <CartPanelBody
              items={items}
              cartCount={cartCount}
              onClose={closeDrawer}
              onRemove={removeItem}
              onUpdateQty={updateQuantity}
              onClear={clearCart}
              shippingPreviewLocation={shippingPreviewLocation}
              onChangeLocation={setShippingPreviewLocation}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
