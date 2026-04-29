import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, ShoppingBag, User } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useAuthStore } from '../stores/authStore';

const PRIMARY = '#f97316';

const NO_NAV_PREFIXES = [
  '/auth', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/verify-otp', '/select-role', '/auth/google',
  '/approve-device-success', '/seller', '/admin', '/dashboard',
];

const TABS = [
  { id: 'home',    icon: Home,       label: 'Home',    to: '/' },
  { id: 'search',  icon: Search,     label: 'Search',  to: '/search' },
  { id: 'cart',    icon: ShoppingBag, label: 'Cart',   to: null },
  { id: 'account', icon: User,       label: 'Account', to: '/account' },
];

function activeId(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/search') || pathname.startsWith('/products')) return 'search';
  if (pathname.startsWith('/account') || pathname.startsWith('/notifications') || pathname.startsWith('/returns')) return 'account';
  return null;
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useBuyerCart((s) => s.items);
  const openCart  = useBuyerCart((s) => s.openCart);
  const user      = useAuthStore((s) => s.user);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const current   = activeId(location.pathname);

  const hidden = NO_NAV_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/') || location.pathname.startsWith(p),
  );
  if (hidden) return null;

  const handlePress = (tab) => {
    if (tab.id === 'cart') { openCart(); return; }
    if (tab.id === 'account' && !user) { navigate('/auth?tab=login'); return; }
    navigate(tab.to);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[120] flex items-stretch"
      style={{
        background: 'var(--header-bg, rgba(255,255,255,0.97))',
        borderTop: '1px solid var(--divider, rgba(0,0,0,0.08))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        height: 'calc(60px + env(safe-area-inset-bottom))',
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
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            style={{
              minHeight: 60,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            {/* Active pill indicator */}
            <AnimatePresence>
              {isActive && (
                <motion.span
                  layoutId="mob-nav-pill"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-x-[18%] top-1.5 h-0.5 rounded-full"
                  style={{ background: PRIMARY }}
                />
              )}
            </AnimatePresence>

            {/* Icon + badge */}
            <div className="relative">
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  style={{ color: isActive ? PRIMARY : 'var(--text-muted, #94a3b8)' }}
                />
              </motion.div>

              {badgeCount > 0 && (
                <motion.span
                  key={badgeCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: PRIMARY, paddingInline: 3 }}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </motion.span>
              )}
            </div>

            {/* Label */}
            <span
              className="text-[10px] font-medium leading-none transition-colors duration-150"
              style={{ color: isActive ? PRIMARY : 'var(--text-muted, #94a3b8)' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
