import { useCallback, useEffect } from 'react';
import { Sheet } from 'react-modal-sheet';
import { useBuyerCart } from '../../stores/buyerCartStore';
import CartPanelBody from './CartPanelBody';

export default function MobileCartSheet() {
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
    if (!cartOpen) return undefined;
    window.history.pushState({ cartSheet: true }, '');
    const onPop = () => closeCart();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [cartOpen, closeCart]);

  const closeSheet = useCallback(() => {
    if (window.history.state?.cartSheet) {
      window.history.back();
      return;
    }
    closeCart();
  }, [closeCart]);

  return (
    <Sheet isOpen={cartOpen} onClose={closeSheet} detent="large">
      <Sheet.Container
        style={{
          background: 'var(--bg-secondary)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '92vh',
        }}
      >
        <Sheet.Header />
        <Sheet.Content style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex max-h-[85vh] flex-col">
            <CartPanelBody
              items={items}
              cartCount={cartCount}
              onClose={closeSheet}
              onRemove={removeItem}
              onUpdateQty={updateQuantity}
              onClear={clearCart}
              shippingPreviewLocation={shippingPreviewLocation}
              onChangeLocation={setShippingPreviewLocation}
              compactHeader
            />
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={closeSheet}
        style={{
          background: 'color-mix(in srgb, var(--bg-page) 50%, rgba(0,0,0,0.45))',
          backdropFilter: 'blur(8px)',
        }}
      />
    </Sheet>
  );
}
