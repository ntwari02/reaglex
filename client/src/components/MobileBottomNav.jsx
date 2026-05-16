import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useAuthStore } from '../stores/authStore';
import { isBuyerChromeHidden } from '../config/buyerNavVisibility';
import { useScrollChrome } from '../stores/scrollChromeStore';

const TABS = [
  { id: 'home', icon: Home, label: 'Home', to: '/' },
  { id: 'browse', icon: LayoutGrid, label: 'Browse', to: '/products' },
  { id: 'cart', icon: ShoppingBag, label: 'Cart', to: null },
  { id: 'wishlist', icon: Heart, label: 'Saved', to: '/account?tab=wishlist' },
  { id: 'account', icon: User, label: 'Account', to: '/account' },
];

function activeTab(pathname, search) {
  const params = new URLSearchParams(search || '');
  const accountTab = params.get('tab');
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/products') || pathname.startsWith('/category') || pathname.startsWith('/search')) {
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

  if (isBuyerChromeHidden(location.pathname)) return null;

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
      animate={{ y: navHidden ? 110 : 0, opacity: navHidden ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Primary"
    >
      <div
        className="pointer-events-auto flex w-full max-w-lg items-stretch rounded-t-[22px] px-1 pt-2"
        style={{
          background: 'color-mix(in srgb, var(--card-bg) 82%, transparent)',
          border: '1px solid color-mix(in srgb, var(--border-card) 65%, transparent)',
          borderBottom: 'none',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow:
            '0 -12px 48px color-mix(in srgb, var(--bg-page) 65%, rgba(0,0,0,0.55)), 0 -4px 16px rgba(0,0,0,0.06)',
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
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 min-h-[52px]"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="buyer-mob-nav-active"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    className="absolute inset-x-[14%] top-1 h-1 rounded-full"
                    style={{ background: 'var(--brand-primary)', opacity: 0.9 }}
                  />
                )}
              </AnimatePresence>

              <div className="relative mt-1">
                <motion.div
                  animate={{ scale: isActive ? 1.06 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.35 : 1.65}
                    style={{
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                    }}
                  />
                </motion.div>

                {badgeCount > 0 && (
                  <motion.span
                    key={badgeCount}
                    data-cart-target="badge"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{
                      background: 'var(--brand-primary)',
                      boxShadow: '0 2px 8px rgba(255,122,26,0.35)',
                    }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </motion.span>
                )}
              </div>

              <span
                className="text-[10px] font-semibold leading-none tracking-tight"
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
