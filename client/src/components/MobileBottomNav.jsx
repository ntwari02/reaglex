import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useAuthStore } from '../stores/authStore';
import { isBuyerChromeHidden } from '../config/buyerNavVisibility';
import { useScrollChrome } from '../stores/scrollChromeStore';

const TABS = [
  { id: 'home', icon: Home, label: 'Home', to: '/' },
  { id: 'browse', icon: LayoutGrid, label: 'Categories', to: '/category/all' },
  { id: 'cart', icon: ShoppingBag, label: 'Cart', to: null },
  { id: 'wishlist', icon: Heart, label: 'Saved', to: '/account?tab=wishlist' },
  { id: 'account', icon: User, label: 'Account', to: '/account' },
];

function activeTab(pathname, search) {
  const params = new URLSearchParams(search || '');
  const accountTab = params.get('tab');
  if (pathname === '/') return 'home';
  if (
    pathname.startsWith('/products')
    || pathname.startsWith('/category')
    || pathname.startsWith('/search')
    || pathname.startsWith('/explore')
  ) {
    return 'browse';
  }
  if (
    pathname.startsWith('/checkout')
    || pathname.startsWith('/order-confirmation')
    || pathname.startsWith('/payment')
  ) {
    return 'cart';
  }
  if (
    pathname.startsWith('/account')
    || pathname.startsWith('/notifications')
    || pathname.startsWith('/returns')
    || pathname.startsWith('/track')
  ) {
    if (accountTab === 'wishlist') return 'wishlist';
    return 'account';
  }
  return null;
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useBuyerCart((s) => s.items);
  const openCart = useBuyerCart((s) => s.openCart);
  const user = useAuthStore((s) => s.user);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const current = activeTab(location.pathname, location.search);
  const navHidden = useScrollChrome((s) => s.navHidden);

  if (isBuyerChromeHidden(location.pathname, location.search)) return null;

  const handlePress = (tab) => {
    if (tab.id === 'cart') {
      openCart();
      return;
    }
    if (tab.id === 'account' && !user) {
      navigate('/auth?tab=login');
      return;
    }
    if (tab.id === 'wishlist' && !user) {
      navigate('/auth?tab=login');
      return;
    }
    navigate(tab.to);
  };

  return (
    <motion.nav
      data-mobile-nav="buyer"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[140] flex justify-center px-3 pointer-events-none"
      animate={{ y: navHidden ? 100 : 0, opacity: navHidden ? 0.92 : 1 }}
      transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Primary"
    >
      <div
        className="pointer-events-auto flex w-full max-w-md items-stretch rounded-2xl px-0.5 py-1"
        style={{
          minHeight: 56,
          maxHeight: 60,
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
          border: '1px solid color-mix(in srgb, var(--border-card) 50%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--mob-shadow-dock, 0 -4px 24px rgba(15,23,42,0.08))',
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = current === tab.id;
          const isCart = tab.id === 'cart';
          const badgeCount = isCart ? cartCount : 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handlePress(tab)}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px]"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="buyer-mob-nav-active"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    className="absolute inset-x-[18%] top-0.5 h-0.5 rounded-full"
                    style={{ background: 'var(--brand-primary)' }}
                  />
                )}
              </AnimatePresence>

              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.65}
                  style={{
                    color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                  }}
                />
                {badgeCount > 0 && (
                  <motion.span
                    key={badgeCount}
                    data-cart-target="badge"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-2 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{
                      background: 'var(--brand-primary)',
                      boxShadow: '0 1px 6px rgba(255,122,26,0.3)',
                    }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </motion.span>
                )}
              </div>

              <span
                className="text-[9px] font-semibold leading-none tracking-tight"
                style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
